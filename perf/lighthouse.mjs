#!/usr/bin/env node
// Lighthouse bench for the hero perf campaign (Layer 3).
//
//   node perf/lighthouse.mjs [desktop|mobile|all] [--runs N] [--update-baseline]
//   node perf/lighthouse.mjs --compare <reportA.json> <reportB.json>
//
// Layer 1 (the e2e suite) asserts EXACT budgets. Layer 2 (perf/run.mjs) measures
// controlled in-page scenarios. This layer answers the only question neither of
// those can: what does the whole production page score, end to end, on the
// metrics the outside world grades it on — Performance score, LCP, TBT, CLS and
// total transfer weight.
//
// It is deliberately the SAME MACHINE as Layer 2 wherever a choice exists:
//
//   - the same server (`npx vite preview`, owned by this process, killed on the
//     way out) and the same dist fingerprint stamped into every report;
//   - the same rig stamp, and a mismatch REFUSES `--update-baseline`;
//   - the same R10 machine-load guard, which also refuses;
//   - the same median/IQR/band arithmetic, the same outlier gate, the same
//     warm-up discard, and the same `--compare` implementation.
//
// Three things are specific to this layer and are the ones worth arguing about;
// each is defended at its definition below: WHY the Node API rather than the
// CLI, WHY every throttling number is written out literally instead of read
// from Lighthouse's own constants, and WHY the browser runs HEADED.
//
// The baseline contract: `--update-baseline` here read-modify-writes ONLY the
// `lighthouse` top-level key of perf/baseline.json. `scenarios` belongs to
// Layer 2 and `exact` is hand-filled by Task 5.

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { writeFile } from 'node:fs/promises'

import { chromium } from '@playwright/test'
import { launch as launchChrome } from 'chrome-launcher'
import lighthouse from 'lighthouse'
import { createRequire } from 'node:module'

import { BASE_URL, SERVE_COMMAND, buildOnce, distFingerprint, startPreview } from './lib/server.mjs'
import { scenarioUrl } from './lib/browser.mjs'
import { collectRig, rigMismatches } from './lib/rig.mjs'
import { combineMachineLoad, reportMachineLoad, sampleMachineLoad } from './lib/load.mjs'
import { readBaseline, updateLighthouse } from './lib/baseline.mjs'
import { MIN_RUNS_FOR_OUTLIER, provenanceWarnings } from './lib/stats.mjs'
import { VERDICT, compare, compareReportFiles, printComparison, writeReport } from './lib/report.mjs'
import { baselineRefusal, runScenario } from './run.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORTS_DIR = path.join(REPO_ROOT, 'perf', 'reports')
const BASELINE_PATH = path.join(REPO_ROOT, 'perf', 'baseline.json')

const LIGHTHOUSE_VERSION = createRequire(import.meta.url)('lighthouse/package.json').version

/**
 * Report schema version for THIS layer, tracked separately from
 * `REPORT_VERSION` in lib/report.mjs.
 *
 * The two report kinds share a skeleton (`scenario`, `rig`, `build`, `metrics`)
 * — that shared skeleton is exactly what lets one `compareReportFiles` serve
 * both — but they are not the same document: a Lighthouse report has no
 * `perRunMeta[].consoleErrors`, and carries a `lighthouse` settings block that
 * a scenario report never will. Sharing one integer would mean a Layer 2 schema
 * change silently claiming to describe this file's schema too.
 */
const LH_REPORT_VERSION = 1

const DEFAULT_RUNS = 5

const log = (line = '') => process.stdout.write(`${line}\n`)

// ── the pin ────────────────────────────────────────────────────────────────

/**
 * WHY THE NODE API AND NOT THE `lighthouse` CLI.
 *
 * Tasks 7-12 compare a number taken today against a baseline taken weeks
 * earlier, so the only thing that matters here is that the measurement
 * CONFIGURATION is identical across that gap. The CLI expresses configuration
 * as argv on top of whatever defaults that version of the binary ships, and
 * `npx lighthouse` will happily resolve a different version than the one in
 * package-lock. The Node API takes a config OBJECT, which is checked into this
 * file, diffable in review, and recorded verbatim in every report.
 *
 * WHY THESE NUMBERS ARE WRITTEN OUT LITERALLY instead of imported from
 * `lighthouse/core/config/constants.js`.
 *
 * Those constants are Lighthouse's OWN, and they move: the mobile throttling
 * profile, the emulated screen and the emulated user agent have all changed
 * across Lighthouse majors. Importing them would make a `npm update lighthouse`
 * silently redefine the bench, and every metric would step — with no diff
 * anywhere to explain it, and the campaign would attribute the step to whichever
 * optimization batch happened to be in flight. Transcribed literally, a
 * Lighthouse upgrade changes NOTHING about what is measured, and re-pinning is a
 * visible, reviewable edit to these constants.
 *
 * Transcribed from Lighthouse 12.8.2 (`throttling.mobileSlow4G`,
 * `throttling.desktopDense4G`, `screenEmulationMetrics`, `userAgents`) — the
 * stock "mobile" and "desktop" presets, so the numbers stay comparable to what
 * anyone else running Lighthouse on this site would see.
 */
const PINNED_LIGHTHOUSE_VERSION = '12.8.2'

/** Settings shared by both presets. Every value is stated, none inherited. */
const BASE_SETTINGS = {
  onlyCategories: ['performance'],
  // SIMULATED throttling (Lantern), not `devtools`. Lantern replays one
  // unthrottled trace through a network/CPU model, so the run-to-run spread is
  // a fraction of request-level throttling's — and a bench whose band is wide
  // enough to swallow a real regression is worse than no bench. It is also
  // what PageSpeed Insights reports, so the score means what people think it
  // means.
  throttlingMethod: 'simulate',
  // A cold profile per run, INCLUDING the shader cache. On a page whose LCP is
  // gated by a WebGL canvas, a warm shader cache is the difference between
  // measuring the first visit and measuring the fifth.
  disableStorageReset: false,
  clearStorageTypes: ['file_systems', 'shader_cache', 'service_workers', 'cache_storage'],
  maxWaitForFcp: 30_000,
  maxWaitForLoad: 45_000,
  pauseAfterFcpMs: 1000,
  pauseAfterLoadMs: 1000,
  networkQuietThresholdMs: 1000,
  cpuQuietThresholdMs: 1000,
  locale: 'en-US',
  // Post-hoc, after the trace is closed — it cannot move a metric, and it is a
  // few MB of base64 in every report.
  disableFullPageScreenshot: true,
}

const PRESETS = {
  desktop: {
    name: 'desktop',
    description: 'Lighthouse desktop preset — 1350x940 @1x, desktopDense4G (40ms RTT, 10Mbps, 1x CPU)',
    settings: {
      formFactor: 'desktop',
      screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      emulatedUserAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      throttling: {
        rttMs: 40,
        throughputKbps: 10_240,
        cpuSlowdownMultiplier: 1,
        requestLatencyMs: 0,
        downloadThroughputKbps: 0,
        uploadThroughputKbps: 0,
      },
    },
  },
  mobile: {
    name: 'mobile',
    description: 'Lighthouse mobile preset — 412x823 @1.75x, mobileSlow4G (150ms RTT, 1.6Mbps, 4x CPU)',
    settings: {
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
      emulatedUserAgent:
        'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
      throttling: {
        rttMs: 150,
        throughputKbps: 1638.4,
        requestLatencyMs: 562.5,
        downloadThroughputKbps: 1474.56,
        uploadThroughputKbps: 675,
        cpuSlowdownMultiplier: 4,
      },
    },
  },
}

/**
 * The Chrome flag vector, pinned in full (`ignoreDefaultFlags: true`).
 *
 * This is chrome-launcher 1.2.1's `Launcher.defaultFlags()` transcribed
 * verbatim, plus the three anti-backgrounding flags Layer 2 already runs with,
 * for the same reason it does: on a Mac, putting another window in front of the
 * run makes Chrome throttle it, and this bench is expected to run while Kevin
 * is using the machine. Pinning the whole vector means a chrome-launcher
 * upgrade cannot quietly change the bench, exactly as with the Lighthouse
 * constants above.
 *
 * chrome-launcher still appends `--remote-debugging-port=<n>` and a fresh
 * per-launch `--user-data-dir`; both are per-run plumbing rather than
 * measurement configuration, which is why they are not listed here.
 *
 * NOT HEADLESS, and that is deliberate. Layer 2 runs headed
 * (`lib/browser.mjs`) so it measures the real GPU rather than a software
 * rasteriser. A headless Layer 3 could fall back to SwiftShader on the very
 * WebGL canvas this whole campaign is about, and the two layers' LCP and TBT
 * would then be numbers about two different renderers — while looking perfectly
 * comparable in a table.
 */
const CHROME_FLAGS = [
  '--disable-features=Translate,OptimizationHints,MediaRouter,DialMediaRouteProvider,CalculateNativeWinOcclusion,InterestFeedContentSuggestions,CertificateTransparencyComponentUpdater,AutofillServerCommunication,PrivacySandboxSettings4,RenderDocument',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-client-side-phishing-detection',
  '--disable-sync',
  '--metrics-recording-only',
  '--disable-default-apps',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-ipc-flooding-protection',
  '--password-store=basic',
  '--use-mock-keychain',
  '--force-fieldtrials=*BackgroundTracing/default/',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-domain-reliability',
  '--propagate-iph-for-testing',
]

/**
 * The audited URL.
 *
 * `scenarioUrl()` appends the harness's `?perf-seed=0.5&perf-role=0` pins —
 * the SAME URL Layer 2 measures, so the two layers grade the same page state.
 * Both knobs only remove entropy (the shader's per-load random scatter, and the
 * hero's cycling role index); neither disables work, changes the bundle, or
 * takes a branch the shipped page does not take. Two runs a week apart
 * therefore render the same frames rather than two random draws.
 */
const AUDIT_URL = scenarioUrl('/')

// ── metrics ────────────────────────────────────────────────────────────────

/**
 * The five metrics the task requires, plus three informational ones.
 *
 * `minBand` is each metric's absolute noise floor in its own units, and it is
 * what stops a metric that sits near zero (CLS on a healthy build is 0) from
 * reading any movement at all as an infinite regression. Band semantics are
 * otherwise Layer 2's exactly: `max(10% of median, 1 x IQR, minBand)`.
 *
 * `lh.performance` is the only HIGHER-IS-BETTER metric in the whole harness.
 *
 * A note for Task 5/6 on `lh.transferBytes`: within one build it is very nearly
 * a constant, so the 10%-of-median term makes its default band absurdly loose
 * (~50 KB on a ~500 KB page). That is not fixed here — the band FORMULA is
 * shared with Layer 2 and forking it would be worse — it is fixed the way the
 * design intends, with a hand-set `"maxBand"` on this metric in baseline.json.
 * Recorded in perf/decisions.md so it is not rediscovered as a bug.
 */
const METRICS = {
  'lh.performance': { unit: 'score', lowerIsBetter: false, minBand: 2, sourceKey: 'lighthouse' },
  'lh.lcpMs': { unit: 'ms', lowerIsBetter: true, minBand: 50, sourceKey: 'lighthouse' },
  'lh.tbtMs': { unit: 'ms', lowerIsBetter: true, minBand: 25, sourceKey: 'lighthouse' },
  'lh.cls': { unit: '', lowerIsBetter: true, minBand: 0.005, sourceKey: 'lighthouse' },
  'lh.transferBytes': { unit: 'bytes', lowerIsBetter: true, minBand: 1024, sourceKey: 'transferBytes' },
  'lh.fcpMs': { unit: 'ms', lowerIsBetter: true, minBand: 50, informational: true, sourceKey: 'lighthouse' },
  'lh.speedIndexMs': { unit: 'ms', lowerIsBetter: true, minBand: 50, informational: true, sourceKey: 'lighthouse' },
  // How long Lighthouse itself took. Informational, but not decorative: this
  // page animates forever, and if a batch ever makes it fail to reach CPU quiet
  // the run silently hits `maxWaitForLoad` (45s) and every timing above becomes
  // a statement about the timeout. A step change here is the tell.
  'lh.runMs': { unit: 'ms', lowerIsBetter: true, minBand: 500, informational: true, sourceKey: 'lighthouse' },
}

/** Audits whose `numericValue` each timing metric is read from. */
const NUMERIC_AUDITS = {
  'lh.lcpMs': 'largest-contentful-paint',
  'lh.tbtMs': 'total-blocking-time',
  'lh.cls': 'cumulative-layout-shift',
  'lh.fcpMs': 'first-contentful-paint',
  'lh.speedIndexMs': 'speed-index',
}

/**
 * Pull this run's metrics out of a Lighthouse result.
 *
 * THE HARNESS NEVER SILENTLY SKIPS A METRIC. Every metric that cannot be read
 * is returned in `unavailable` WITH ITS REASON, and the caller puts that in the
 * report JSON, in the printed warnings, and into the `--update-baseline` gate.
 * The failure this prevents is specific and quiet: an audit that errors leaves
 * `aggregate()` with nothing to aggregate, `compare()` then has no current
 * value, and the metric drops out of the table — a budget that stops existing
 * rather than failing.
 */
export function extractMetrics(lhr) {
  const metrics = {}
  const unavailable = []
  const audits = lhr.audits ?? {}

  const score = lhr.categories?.performance?.score
  if (typeof score === 'number' && Number.isFinite(score)) {
    // Lighthouse reports 0..1; the whole world quotes 0..100.
    metrics['lh.performance'] = Math.round(score * 100)
  } else {
    unavailable.push({
      metric: 'lh.performance',
      reason: `categories.performance.score was ${JSON.stringify(score)} — the performance category did not compute`,
    })
  }

  for (const [metric, auditId] of Object.entries(NUMERIC_AUDITS)) {
    const audit = audits[auditId]
    if (!audit) {
      unavailable.push({ metric, reason: `audit "${auditId}" is absent from the Lighthouse result` })
      continue
    }
    if (audit.scoreDisplayMode === 'error' || audit.errorMessage) {
      unavailable.push({ metric, reason: `audit "${auditId}" errored: ${audit.errorMessage ?? 'no message given'}` })
      continue
    }
    if (!Number.isFinite(audit.numericValue)) {
      unavailable.push({ metric, reason: `audit "${auditId}" produced a non-finite numericValue (${audit.numericValue})` })
      continue
    }
    metrics[metric] = round(audit.numericValue)
  }

  const transfer = extractTransferBytes(audits)
  if (transfer.value === null) unavailable.push({ metric: 'lh.transferBytes', reason: transfer.reason })
  else metrics['lh.transferBytes'] = transfer.value

  if (Number.isFinite(lhr.timing?.total)) metrics['lh.runMs'] = round(lhr.timing.total)
  else unavailable.push({ metric: 'lh.runMs', reason: 'lhr.timing.total was not a finite number' })

  return {
    metrics,
    unavailable,
    // The transfer figure has two possible providers measuring subtly different
    // things, so it carries its own source and `aggregate()` will flag a set
    // that blended them. Everything else comes from one place.
    sources: {
      lighthouse: `lighthouse@${lhr.lighthouseVersion ?? LIGHTHOUSE_VERSION}:${BASE_SETTINGS.throttlingMethod}`,
      transferBytes: transfer.source ?? 'unavailable',
    },
  }
}

/**
 * Total bytes over the wire, with a named fallback rather than a silent one.
 *
 * `total-byte-weight` is the primary because it is a plain audit-level number.
 * `resource-summary` is the fallback because it is computed from the same
 * network records but is a diagnostic whose shape has changed before. Which one
 * answered is recorded as the metric's SOURCE, so a set that switched providers
 * mid-run is flagged as blended by `aggregate()` instead of being medianed into
 * a number that measures neither.
 */
function extractTransferBytes(audits) {
  const primary = audits['total-byte-weight']
  if (primary && !primary.errorMessage && Number.isFinite(primary.numericValue)) {
    return { value: Math.round(primary.numericValue), source: 'audit:total-byte-weight' }
  }

  const summary = audits['resource-summary']
  const total = summary?.details?.items?.find((item) => item.resourceType === 'total')
  if (Number.isFinite(total?.transferSize)) {
    return { value: Math.round(total.transferSize), source: 'audit:resource-summary' }
  }

  return {
    value: null,
    source: null,
    reason:
      'neither "total-byte-weight" nor "resource-summary" produced a transfer size ' +
      `(total-byte-weight: ${primary ? (primary.errorMessage ?? primary.numericValue) : 'absent'}; ` +
      `resource-summary: ${summary ? 'present but had no "total" row' : 'absent'})`,
  }
}

const round = (value) => (Number.isFinite(value) ? Math.round(value * 1e4) / 1e4 : value)

// ── one run ────────────────────────────────────────────────────────────────

/**
 * A preset presented as a Layer 2 scenario module, so `runScenario` from
 * run.mjs can drive it.
 *
 * This is the reuse that matters most in this file. The warm-up discard, the
 * outlier gate, the replacement budget and the per-run bookkeeping are all
 * subtle, all already argued out in Task 3, and all things a second
 * implementation would get slightly differently — and "slightly differently" is
 * how two layers of the same campaign end up disagreeing about whether a batch
 * regressed.
 */
function presetScenario(preset) {
  return {
    name: `lighthouse-${preset.name}`,
    description: preset.description,
    metrics: METRICS,
    run: async () => runOnce(preset),
  }
}

async function runOnce(preset) {
  // A fresh Chrome per run. chrome-launcher allocates a throwaway user-data-dir
  // per launch, so every run starts from a cold profile, cold HTTP cache and
  // cold shader cache — the state a first-time visitor actually arrives in.
  const chrome = await launchChrome({
    chromePath: chromium.executablePath(),
    ignoreDefaultFlags: true,
    chromeFlags: CHROME_FLAGS,
    logLevel: 'silent',
  })

  try {
    const result = await lighthouse(
      AUDIT_URL,
      { port: chrome.port, output: 'json', logLevel: 'silent' },
      { extends: 'lighthouse:default', settings: { ...BASE_SETTINGS, ...preset.settings } },
    )

    if (!result?.lhr) throw new Error(`lighthouse returned no result for ${AUDIT_URL}`)
    const { lhr } = result

    // A runtime error means Lighthouse could not load or instrument the page at
    // all. Whatever partial numbers it emitted describe the failure, not the
    // build, so this throws rather than contributing a run — deliberately NOT
    // as a retryable health failure, because the causes here (server down,
    // wrong URL, the page throwing during load) are deterministic and retrying
    // them three times only hides the message.
    if (lhr.runtimeError) {
      throw new Error(`lighthouse runtimeError (${lhr.runtimeError.code}): ${lhr.runtimeError.message}`)
    }

    const { metrics, unavailable, sources } = extractMetrics(lhr)
    return {
      metrics,
      sources,
      meta: {
        preset: preset.name,
        lighthouseVersion: lhr.lighthouseVersion,
        fetchedUrl: lhr.finalDisplayedUrl ?? lhr.requestedUrl,
        unavailable,
        runWarnings: lhr.runWarnings ?? [],
      },
    }
  } finally {
    await chrome.kill()
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────

function usage(message) {
  const out = message ? process.stderr : process.stdout
  if (message) process.stderr.write(`\nerror: ${message}\n`)
  out.write(`
usage: node perf/lighthouse.mjs <desktop|mobile|all> [options]
       node perf/lighthouse.mjs --compare <reportA.json> <reportB.json>

presets:
${Object.values(PRESETS).map((p) => `  ${p.name.padEnd(20)}${p.description}`).join('\n')}
  ${'all'.padEnd(20)}both presets, in order (the default)

options:
  --runs N            runs per preset (default ${DEFAULT_RUNS}); the median is taken over these
  --update-baseline   read-modify-write ONLY the "lighthouse" key of perf/baseline.json
  --no-build          skip "npm run build" and audit the existing dist/ (iteration only)
  --no-warmup         skip the discarded warm-up run (iteration only — inflates the IQR)
  --compare A B       compare two report JSONs against each other's bands and exit
  --force             allow --update-baseline despite regressions/a busy rig
  -h, --help          this message

the page is always served by "${SERVE_COMMAND}" — never the dev server, and never
"npm run preview" (which is wrangler in this repo).

exit codes: 0 ok · 1 regression (or reports disagree, with --compare) · 2 usage/refusal
`)
}

export function parseArgs(argv) {
  const options = { presets: null, runs: DEFAULT_RUNS, updateBaseline: false, build: true, warmup: true, force: false, compare: null }
  const positional = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') return { help: true }
    else if (arg === '--update-baseline') options.updateBaseline = true
    else if (arg === '--no-build') options.build = false
    else if (arg === '--no-warmup') options.warmup = false
    else if (arg === '--force') options.force = true
    else if (arg === '--runs') {
      const value = Number(argv[++i])
      if (!Number.isInteger(value) || value < 1) return { error: `--runs needs a positive integer, got "${argv[i]}"` }
      options.runs = value
    } else if (arg.startsWith('--runs=')) {
      const value = Number(arg.slice('--runs='.length))
      if (!Number.isInteger(value) || value < 1) return { error: `--runs needs a positive integer, got "${arg}"` }
      options.runs = value
    } else if (arg === '--compare') {
      const a = argv[++i]
      const b = argv[++i]
      if (!a || !b) return { error: '--compare needs two report JSON paths' }
      options.compare = [a, b]
    } else if (arg.startsWith('-')) {
      return { error: `unknown option "${arg}"` }
    } else {
      positional.push(arg)
    }
  }

  if (options.compare) return { options }

  // Unlike run.mjs, the preset is OPTIONAL and defaults to `all`: there are
  // exactly two presets, the task's acceptance check names both, and every
  // baseline this layer writes should carry both.
  if (positional.length > 1) return { error: `expected one preset, got ${positional.length}: ${positional.join(', ')}` }
  const requested = positional[0] ?? 'all'
  if (requested === 'all') options.presets = Object.values(PRESETS)
  else if (PRESETS[requested]) options.presets = [PRESETS[requested]]
  else return { error: `unknown preset "${requested}" — expected desktop, mobile or all` }

  return { options }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const parsed = parseArgs(process.argv.slice(2))
  if (parsed.help) {
    usage()
    return 0
  }
  if (parsed.error) {
    usage(parsed.error)
    return 2
  }
  const { options } = parsed

  if (options.compare) return compareReportFiles(options.compare[0], options.compare[1], log)

  log(`lighthouse bench — ${options.presets.map((p) => p.name).join(', ')} · ${options.runs} run(s) each`)
  log(`lighthouse: v${LIGHTHOUSE_VERSION} (settings pinned against v${PINNED_LIGHTHOUSE_VERSION}) · ${BASE_SETTINGS.throttlingMethod} throttling · headed`)
  if (LIGHTHOUSE_VERSION !== PINNED_LIGHTHOUSE_VERSION) {
    // Not fatal — the settings are written out literally, so the CONFIG is
    // unchanged. But Lighthouse's scoring curves and audit implementations move
    // between versions too, and those this file cannot pin. Anyone comparing
    // across this line needs to know it was crossed.
    log('')
    log(`  !! Lighthouse is v${LIGHTHOUSE_VERSION} but this bench's settings were pinned against v${PINNED_LIGHTHOUSE_VERSION}.`)
    log('  !! The configuration is unaffected (every value is literal here), but scoring curves and audit')
    log('  !! implementations are Lighthouse-internal. Re-record the baseline rather than comparing across.')
    log('')
  }
  log(`url: ${AUDIT_URL}`)

  const loadBefore = await sampleMachineLoad('before')
  reportMachineLoad(loadBefore, log, 'before')

  const rig = await collectRig()
  log(`rig: chrome ${rig.chrome} · macOS ${rig.macos} · ${rig.arch} · display ${rig.displayScale}x · ${rig.acPower ? 'AC power' : 'BATTERY'}`)
  if (!rig.acPower) {
    log('  !! WARNING: this rig is on BATTERY. macOS throttles differently on battery; every number below is suspect.')
  }

  const baseline = await readBaseline(BASELINE_PATH)
  if (baseline && (!baseline.rig || Object.keys(baseline.rig).length === 0)) {
    log('')
    log('  !! baseline has no rig block — comparisons below are UNVERIFIED against this rig.')
    log('  !! Run with --update-baseline to stamp it, or hand-fill it before trusting any verdict.')
    log('')
  }
  const mismatches = rigMismatches(rig, baseline?.rig)
  if (mismatches.length > 0) {
    log('')
    log('  !! RIG MISMATCH vs perf/baseline.json — comparisons below are NOT apples to apples:')
    for (const mismatch of mismatches) log(`  !!   ${mismatch.key}: baseline "${mismatch.baseline}" vs current "${mismatch.current}"`)
    log('')
  }

  if (options.build) await buildOnce(REPO_ROOT, log)
  else log('build: SKIPPED (--no-build) — auditing whatever is already in dist/')
  const fingerprint = await distFingerprint(REPO_ROOT)
  log(`build: dist/index.html ${fingerprint.distIndexHash} (${fingerprint.distIndexBytes} bytes)`)

  const server = await startPreview(REPO_ROOT, log)
  let stopping = false
  const shutdown = async () => {
    if (stopping) return
    stopping = true
    await server.stop()
  }
  process.on('SIGINT', () => void shutdown().then(() => process.exit(130)))
  process.on('SIGTERM', () => void shutdown().then(() => process.exit(143)))

  let exitCode = 0
  const aggregatesByPreset = {}
  const blockingWarnings = []
  const writtenReports = []

  try {
    for (const preset of options.presets) {
      const scenario = presetScenario(preset)
      log('')
      log(`── ${scenario.name} ── ${preset.description}`)
      const startedAt = new Date().toISOString()
      const outcome = await runScenario(scenario, options.runs, { baseUrl: BASE_URL, log }, { warmup: options.warmup })
      const comparison = compare(outcome.aggregated, baseline?.lighthouse?.[preset.name])
      comparison.warnings.push(...provenanceWarnings(outcome.aggregated, scenario.name))

      // Metrics Lighthouse could not produce, gathered across the kept runs.
      // Loud, listed, and baseline-blocking — never dropped.
      const unavailable = []
      const runWarnings = new Set()
      outcome.meta.forEach((meta, keptIndex) => {
        for (const entry of meta?.unavailable ?? []) unavailable.push({ keptRun: keptIndex + 1, ...entry })
        for (const warning of meta?.runWarnings ?? []) runWarnings.add(String(warning))
      })
      for (const entry of unavailable) {
        const line = `${scenario.name}.${entry.metric}: NOT COLLECTED — ${entry.reason}`
        comparison.warnings.push(line)
        blockingWarnings.push(line)
      }
      for (const warning of runWarnings) comparison.warnings.push(`${scenario.name}: lighthouse runWarning — ${warning}`)

      if (outcome.aggregated && Object.values(outcome.aggregated).some((metric) => metric.sourceConflict)) {
        blockingWarnings.push(`${scenario.name}: a metric blended two measurement sources`)
      }

      const report = {
        version: LH_REPORT_VERSION,
        kind: 'lighthouse',
        // Named `scenario` — not `preset` — because that is the field
        // `compareReportFiles` keys on, and this report is deliberately
        // comparable by the same code path as a Layer 2 one. The bare preset
        // name is carried alongside for readers.
        scenario: scenario.name,
        preset: preset.name,
        description: preset.description,
        startedAt,
        finishedAt: new Date().toISOString(),
        lighthouse: {
          version: LIGHTHOUSE_VERSION,
          pinnedAgainst: PINNED_LIGHTHOUSE_VERSION,
          invocation: 'node api',
          url: AUDIT_URL,
          settings: { ...BASE_SETTINGS, ...preset.settings },
          chromeFlags: CHROME_FLAGS,
          chromePath: chromium.executablePath(),
          headless: false,
        },
        runner: {
          argv: process.argv.slice(2),
          runsRequested: options.runs,
          runsKept: outcome.kept.length,
          discarded: outcome.discarded,
          flaggedOutliersKept: outcome.flagged,
          outlierGateActive: options.runs >= MIN_RUNS_FOR_OUTLIER,
          warmup: outcome.warmup,
        },
        rig,
        machineLoad: { before: loadBefore, after: null, busy: loadBefore.busy },
        rigMismatchVsBaseline: mismatches,
        build: { serveCommand: SERVE_COMMAND, baseUrl: BASE_URL, built: options.build, ...fingerprint },
        sources: outcome.sources,
        metrics: outcome.aggregated,
        comparison: comparison.rows,
        warnings: comparison.warnings,
        unavailableMetrics: unavailable,
        perRunMeta: outcome.meta,
      }

      const file = await writeReport(REPORTS_DIR, scenario.name, report)
      printComparison(scenario.name, outcome.kept.length, outcome.discarded.length, comparison, log)
      log(`  sources: ${Object.entries(outcome.sources).map(([k, v]) => `${k}=${v}`).join(' · ') || 'n/a'}`)
      log(`  report: ${path.relative(REPO_ROOT, file)}`)

      if (comparison.regressions > 0) exitCode = 1
      if (outcome.flagged.length > 0) blockingWarnings.push(`${scenario.name}: an outlier run was kept after exhausting replacements`)
      aggregatesByPreset[preset.name] = outcome.aggregated
      writtenReports.push({ file, report })
    }
  } finally {
    await shutdown()
  }

  // Re-sample and backfill, for the same reason Layer 2 does: a load reading
  // taken before any of the measurements existed cannot vouch for them.
  const loadAfter = await sampleMachineLoad('after')
  reportMachineLoad(loadAfter, log, 'after')
  const machineLoad = combineMachineLoad(loadBefore, loadAfter)
  for (const { file, report } of writtenReports) {
    report.machineLoad = machineLoad
    await writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  if (options.updateBaseline) {
    log('')
    if (mismatches.length > 0) {
      process.stderr.write(
        'REFUSING --update-baseline: this rig does not match the rig recorded in perf/baseline.json.\n' +
          `Mismatched: ${mismatches.map((m) => m.key).join(', ')}.\n` +
          'Baselines are rig-relative by design; ratcheting them from a different rig corrupts every\n' +
          'comparison the campaign makes afterwards. Restore the rig, or delete the stored rig block\n' +
          'deliberately if the reference rig has genuinely changed.\n',
      )
      return 2
    }

    const { refuse, reasons } = baselineRefusal({ force: options.force, exitCode, blockingWarnings, machineLoad })
    if (refuse) {
      process.stderr.write(
        'REFUSING --update-baseline: this run is not a clean reference.\n' +
          (exitCode === 1 ? '  - it did not finish clean (regressions)\n' : '') +
          reasons.map((warning) => `  - ${warning}\n`).join('') +
          'Quiesce the machine and/or fix the regression and re-run, or pass --force if you\n' +
          'deliberately intend this to become the new reference.\n',
      )
      return 2
    }

    const { notes } = await updateLighthouse(BASELINE_PATH, aggregatesByPreset, rig)
    log(`baseline: updated "lighthouse" key for ${Object.keys(aggregatesByPreset).join(', ')} in perf/baseline.json`)
    log('baseline: "scenarios" and "exact" keys left untouched (Task 3 and Task 5 own those)')
    if (notes.rigKeysAdded.length > 0) log(`baseline: filled missing rig key(s): ${notes.rigKeysAdded.join(', ')}`)
    if (notes.retained.length > 0) {
      log(`  !! ${notes.retained.length} baseline metric(s) were NOT produced by this run and were RETAINED, not deleted:`)
      for (const key of notes.retained) log(`  !!   ${key}`)
    }
  }

  log('')
  log(exitCode === 0 ? 'result: no regressions' : `result: ${VERDICT.REGRESSION} — see the table(s) above`)
  return exitCode
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`\nlighthouse bench failed: ${error?.stack ?? error}\n`)
      process.exit(2)
    },
  )
}
