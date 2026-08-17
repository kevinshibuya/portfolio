#!/usr/bin/env node
// Deterministic scenario runner for the hero perf campaign (Layer 2).
//
//   node perf/run.mjs [idle-hero|load-entrance|scroll-transition|battery-proxy|all]
//                     [--runs N] [--update-baseline] [--no-build] [--no-warmup]
//   node perf/run.mjs --compare <reportA.json> <reportB.json>
//
// Each scenario reproduces ONE symptom Kevin observed on this rig, five times,
// and reduces it to a median plus an honest tolerance band. Nothing here
// decides whether a number is good; it decides whether a number MOVED. Tasks
// 7-12 keep or revert an optimization on exactly that.
//
// Three rules this file exists to enforce:
//   1. The runner owns the server. Stale listener killed, one build, one
//      `npx vite preview`, killed on the way out — and the serve command plus
//      a content hash of dist/index.html go into every report, so no run can
//      be silently comparable to a stale or wrangler-served build.
//   2. The rig is stamped into every report and a mismatch REFUSES
//      --update-baseline. Cross-rig numbers are not comparisons.
//   3. Exit 1 on any regression.

import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

import { BASE_URL, SERVE_COMMAND, buildOnce, distFingerprint, startPreview } from './lib/server.mjs'
import { collectRig, rigMismatches, RIG_KEYS } from './lib/rig.mjs'
import { combineMachineLoad, reportMachineLoad, sampleMachineLoad } from './lib/load.mjs'
import { readBaseline, updateScenarios } from './lib/baseline.mjs'
import { aggregate, findOutlierRun, provenanceWarnings, MIN_RUNS_FOR_OUTLIER } from './lib/stats.mjs'
import { REPORT_VERSION, VERDICT, compare, printComparison, writeReport } from './lib/report.mjs'

import * as idleHero from './scenarios/idle-hero.mjs'
import * as loadEntrance from './scenarios/load-entrance.mjs'
import * as scrollTransition from './scenarios/scroll-transition.mjs'
import * as batteryProxy from './scenarios/battery-proxy.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORTS_DIR = path.join(REPO_ROOT, 'perf', 'reports')
const BASELINE_PATH = path.join(REPO_ROOT, 'perf', 'baseline.json')

const SCENARIOS = new Map(
  [idleHero, loadEntrance, scrollTransition, batteryProxy].map((scenario) => [scenario.name, scenario]),
)

const DEFAULT_RUNS = 5
/** Extra attempts allowed to replace outlier runs, per scenario per invocation. */
const MAX_REPLACEMENTS = 3

const log = (line = '') => process.stdout.write(`${line}\n`)

function usage(message) {
  // Errors to stderr, the help text itself to stdout — `node perf/run.mjs
  // --help | less` should show the help, not nothing.
  const out = message ? process.stderr : process.stdout
  if (message) process.stderr.write(`\nerror: ${message}\n`)
  out.write(`
usage: node perf/run.mjs <scenario|all> [options]
       node perf/run.mjs --compare <reportA.json> <reportB.json>

scenarios:
${[...SCENARIOS.values()].map((s) => `  ${s.name.padEnd(20)}${s.description}`).join('\n')}
  ${'all'.padEnd(20)}every scenario above, in order

options:
  --runs N            runs per scenario (default ${DEFAULT_RUNS}); the median is taken over these
  --update-baseline   read-modify-write ONLY the "scenarios" key of perf/baseline.json
  --no-build          skip "npm run build" and serve the existing dist/ (iteration only)
  --no-warmup         skip the discarded warm-up run (iteration only — inflates the IQR)
  --compare A B       compare two report JSONs against each other's bands and exit
  --force             allow --update-baseline despite regressions/flagged outliers
  -h, --help          this message

exit codes: 0 ok · 1 regression (or reports disagree, with --compare) · 2 usage
`)
}

function parseArgs(argv) {
  const options = { scenarios: null, runs: DEFAULT_RUNS, updateBaseline: false, build: true, warmup: true, force: false, compare: null }
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

  if (positional.length === 0) return { error: 'no scenario given' }
  if (positional.length > 1) return { error: `expected one scenario, got ${positional.length}: ${positional.join(', ')}` }

  const requested = positional[0]
  if (requested === 'all') options.scenarios = [...SCENARIOS.values()]
  else if (SCENARIOS.has(requested)) options.scenarios = [SCENARIOS.get(requested)]
  else return { error: `unknown scenario "${requested}"` }

  return { options }
}

// ── run one scenario, N times, with the outlier gate ───────────────────────

export async function runScenario(scenario, runs, context, { warmup = true } = {}) {
  const kept = []
  const discarded = []
  // Outliers that survived MAX_REPLACEMENTS and were kept anyway. Tracked
  // apart from `discarded` so the printed count means what it says.
  const flagged = []
  let replacements = 0
  // Counted separately from `replacements` purely for the failure MESSAGE: the
  // budget is deliberately shared with statistical outliers, so
  // `replacements + 1` would claim "failed its health check on 4 runs" after
  // two outlier discards plus two health failures and misdirect triage.
  let healthFailures = 0
  let warmupResult = null

  // WARM-UP RUN — executed, recorded, never aggregated.
  //
  // Measured while building this: the first run of a fresh invocation is
  // systematically cold, and on the short-window scenarios it is not a small
  // effect. scroll-transition, two runs, no warm-up:
  //
  //   run 1  frame.maxMs 649.9  dropped 38  fps 48.4  gpu.busyMsPerFrame 8.04
  //   run 2  frame.maxMs  24.4  dropped  0  fps 60.1  gpu.busyMsPerFrame 2.62
  //
  // The cold costs (server reading a just-written dist/ off disk, first
  // Chromium launch, cold GPU shader cache) all land in run 1. Left in, they
  // do not move the median much at n=5 but they massively inflate the IQR —
  // and the IQR sets the tolerance band, so a single cold run would widen
  // every band until real regressions fit inside them. That is the exact
  // failure mode this harness exists to prevent, so the cold run is spent
  // deliberately rather than averaged in.
  //
  // It is kept in the report (`runner.warmup`) rather than thrown away: how
  // cold the first run was is evidence about the rig, not noise to hide.
  if (warmup) {
    log(`  ${scenario.name}: warm-up run (recorded, NOT aggregated)`)
    try {
      warmupResult = await scenario.run(context)
    } catch (error) {
      log(`  ~~ ${scenario.name}: warm-up run failed (${error.message}) — continuing to the counted runs`)
      warmupResult = { failed: String(error.message) }
    }
  }

  // Monotonic across discards: `kept.length + discarded.length` would collide
  // (a discard moves one entry from `kept` to `discarded`, leaving the sum
  // unchanged) and two runs in one report would carry the same index.
  let attempt = 0
  while (kept.length < runs) {
    const index = attempt++
    log(`  ${scenario.name}: run ${kept.length + 1}/${runs}${replacements > 0 ? ` (replacement ${replacements})` : ''}`)

    // A HEALTH failure (context loss, uncaught page error) is a bad RUN, and
    // the spec's idiom for a bad run is "discarded and rerun, never averaged
    // in" — so it spends from the same replacement budget as a statistical
    // outlier instead of unwinding the whole invocation. A single real GPU
    // context loss in run 4 of `all --runs 5` used to throw away every
    // remaining scenario and ~20 minutes of wall clock.
    //
    // THE C2 GUARANTEE IS UNCHANGED, and that is the point of the budget: a
    // PERSISTENT health failure exhausts the replacements and rethrows, so the
    // invocation still fails loudly. What can never happen — before or after
    // this change — is a number being produced from an unhealthy run.
    //
    // Only health failures are retried. A deterministic scenario bug (missing
    // selector, changed card count, absent entrance landmark) rethrows on the
    // first occurrence: retrying it three times hides the cause and wastes the
    // budget on an outcome that cannot change.
    let result
    try {
      result = await scenario.run(context)
    } catch (error) {
      // Only a CONTEXT LOSS is retried. An uncaught page error is a statement
      // about the code, not the rig (see MeasurementHealthError.kind), and
      // retrying it is exactly how a batch whose rAF callback throws on one
      // frame in five thousand would get retried away and kept.
      if (!error?.isHealthFailure || !error.retryable) throw error
      if (replacements >= MAX_REPLACEMENTS) {
        throw new Error(
          `${scenario.name}: the page lost its WebGL context on ${healthFailures + 1} run(s) ` +
            `(shared replacement budget of ${MAX_REPLACEMENTS} exhausted) — this is not transient. ` +
            `Last failure:\n${error.message}`,
        )
      }
      replacements += 1
      healthFailures += 1
      discarded.push({ index, reason: `health failure (${error.kind}): ${error.message}`, healthFailure: true, kind: error.kind, metrics: null })
      log(`  ~~ ${scenario.name}: discarding run ${index + 1} — ${error.kind}, rerunning (replacement ${replacements}/${MAX_REPLACEMENTS})`)
      log(`     ${error.message.split('\n')[0]}`)
      continue
    }
    kept.push({ index, ...result })

    // The spec: "a run whose spread exceeds a sanity threshold is discarded and
    // rerun, never averaged in." The gate needs enough samples to have a spread
    // at all, so it evaluates only once the full set is in hand.
    if (kept.length < runs) continue

    const outlier = findOutlierRun(kept, scenario.metrics)
    if (!outlier) break
    if (replacements >= MAX_REPLACEMENTS) {
      log(`  !! ${scenario.name}: outlier remains after ${MAX_REPLACEMENTS} replacements — keeping it and flagging the report`)
      log(`     ${outlier.reason}`)
      flagged.push({ ...outlier, keptAnyway: true })
      break
    }
    const [removed] = kept.splice(outlier.index, 1)
    discarded.push({ index: removed.index, reason: outlier.reason, metrics: removed.metrics })
    replacements += 1
    log(`  ~~ ${scenario.name}: discarding run ${removed.index + 1} — ${outlier.reason}`)
  }

  if (runs < MIN_RUNS_FOR_OUTLIER) {
    log(`  (outlier gate inert below ${MIN_RUNS_FOR_OUTLIER} runs — an IQR over ${runs} samples is not a spread estimate)`)
  }

  return {
    aggregated: aggregate(kept, scenario.metrics),
    kept,
    discarded,
    flagged,
    warmup: warmupResult ? { metrics: warmupResult.metrics ?? null, failed: warmupResult.failed ?? null } : null,
    sources: kept.at(-1)?.sources ?? {},
    meta: kept.map((run) => run.meta),
  }
}

/**
 * Does this scenario's run set carry a page-health failure that must reach the
 * exit code and the baseline gate?
 *
 * Extracted and exported so the decision is TESTABLE (perf/selftest-retry.mjs)
 * rather than buried inline in main(). This is the fix for the hole the retry
 * path opened: every KEPT run is clean, so `compare()` sees only healthy
 * medians and would happily print "no regressions" and baseline a build that
 * was dropping the WebGL context a quarter of the time.
 *
 * The wording deliberately does not blame the rig. A harness whose whole job is
 * attributing movement to the diff must not default to "the machine did it".
 */
export function healthBlocker(scenarioName, outcome) {
  const healthDiscards = outcome.discarded.filter((entry) => entry.healthFailure)
  if (healthDiscards.length === 0) return null
  return (
    `${scenarioName}: ${healthDiscards.length} run(s) LOST THE WEBGL CONTEXT and were discarded and rerun. ` +
    'The kept runs are clean, but losing the context is itself a result — the build under test may be ' +
    'destabilising the GPU. Investigate before trusting or baselining these numbers.'
  )
}

/**
 * The `--update-baseline` gate. A baseline is the reference every later
 * keep-or-revert decision is judged against, so anything that makes this run an
 * unrepresentative reference blocks it, and `--force` is the single deliberate
 * escape hatch.
 */
export function baselineRefusal({ force, exitCode, blockingWarnings = [], machineLoad }) {
  const reasons = [...blockingWarnings]
  if (machineLoad?.busy) {
    // Not "when this run started" — the load is sampled at BOTH ends and each
    // reason carries its own "at start:" / "at end:" label, precisely so a
    // mid-run onset is attributable rather than hidden behind a t=0 stamp.
    reasons.push(`the rig was BUSY during this run (${machineLoad.reasons.join('; ')})`)
  }
  const refuse = !force && (exitCode === 1 || reasons.length > 0)
  return { refuse, reasons }
}

// ── --compare: do two reports agree within their own declared bands? ────────

async function compareReports(pathA, pathB) {
  const a = JSON.parse(await readFile(pathA, 'utf8'))
  const b = JSON.parse(await readFile(pathB, 'utf8'))

  log(`compare: ${path.basename(pathA)} vs ${path.basename(pathB)}`)
  if (a.scenario !== b.scenario) {
    process.stderr.write(`error: different scenarios (${a.scenario} vs ${b.scenario})\n`)
    return 2
  }
  if (a.build.distIndexHash !== b.build.distIndexHash) {
    log(`  !! different builds — ${a.build.distIndexHash} vs ${b.build.distIndexHash}`)
  }

  let disagreements = 0
  for (const key of RIG_KEYS) {
    if (String(a.rig?.[key]) !== String(b.rig?.[key])) {
      log(`  !! rig differs on ${key}: "${a.rig?.[key]}" vs "${b.rig?.[key]}" — these reports are not comparable`)
      disagreements += 1
    }
  }

  // Iterate the UNION. Walking only A's metrics would let B silently lose one
  // and still report "reports agree" — the same class of hole as blending
  // sources without saying so.
  const allMetrics = [...new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)])].sort()
  log(`  ${'metric'.padEnd(30)}${'A'.padStart(12)}${'B'.padStart(12)}${'|delta|'.padStart(12)}${'band'.padStart(12)}  verdict`)
  for (const metric of allMetrics) {
    const left = a.metrics[metric]
    const right = b.metrics[metric]
    if (!left) {
      log(`  ${metric.padEnd(30)}${'—'.padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  MISSING IN A`)
      disagreements += 1
      continue
    }
    if (!right) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  MISSING IN B`)
      disagreements += 1
      continue
    }
    if (left.sourceConflict || right.sourceConflict) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  BLENDED SOURCES`)
      disagreements += 1
      continue
    }
    if (left.sources?.length === 1 && right.sources?.length === 1 && left.sources[0] !== right.sources[0]) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  SOURCE A≠B`)
      disagreements += 1
      continue
    }
    // "Within their own declared bands": the wider of the two bands, because
    // each report's band is that report's own honest statement of how much the
    // metric may move. Requiring the narrower would make the stricter run the
    // arbiter of the looser one.
    const band = Math.max(left.band, right.band)
    const delta = Math.abs(left.median - right.median)
    const agree = delta <= band || left.informational
    if (!agree) disagreements += 1
    log(
      `  ${metric.padEnd(30)}${String(left.median).padStart(12)}${String(right.median).padStart(12)}${String(Math.round(delta * 1e4) / 1e4).padStart(12)}${String(Math.round(band * 1e4) / 1e4).padStart(12)}  ${left.informational ? 'info' : agree ? 'agree' : 'DISAGREE'}`,
    )
  }
  log('')
  log(disagreements === 0 ? '  ✓ reports agree within their declared bands' : `  ✗ ${disagreements} metric(s) disagree`)
  return disagreements === 0 ? 0 : 1
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

  if (options.compare) return compareReports(options.compare[0], options.compare[1])

  log(`perf harness — ${options.scenarios.map((s) => s.name).join(', ')} · ${options.runs} run(s) each`)

  // Sampled BEFORE any browser launches, so it describes the environment the
  // measurement is about to run in rather than the measurement's own load.
  const loadBefore = await sampleMachineLoad('before')
  reportMachineLoad(loadBefore, log, 'before')

  const rig = await collectRig()
  log(`rig: chrome ${rig.chrome} · macOS ${rig.macos} · ${rig.arch} · display ${rig.displayScale}x · ${rig.acPower ? 'AC power' : 'BATTERY'}`)
  if (!rig.acPower) {
    log('  !! WARNING: this rig is on BATTERY. macOS throttles differently on battery; every number below is suspect.')
  }

  const baseline = await readBaseline(BASELINE_PATH)
  // An absent or empty rig block makes `rigMismatches` return [] by design (it
  // is the bootstrap case). Silence there is the danger: Task 5 hand-fills this
  // file, so a written `"rig": {}` would disable rig verification permanently
  // while every run went on printing nothing at all.
  if (baseline && (!baseline.rig || Object.keys(baseline.rig).length === 0)) {
    log('')
    log('  !! baseline has no rig block — comparisons below are UNVERIFIED against this rig.')
    log('  !! Nothing checks Chrome version, display scale, refresh rate or AC power until it is filled in.')
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
  else log('build: SKIPPED (--no-build) — serving whatever is already in dist/')
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
  const aggregatesByScenario = {}
  const blockingWarnings = []
  const writtenReports = []

  try {
    for (const scenario of options.scenarios) {
      log('')
      log(`── ${scenario.name} ── ${scenario.description}`)
      const startedAt = new Date().toISOString()
      const outcome = await runScenario(
        scenario,
        options.runs,
        { baseUrl: BASE_URL, log, nominalFrameMs: rig.nominalFrameMs },
        { warmup: options.warmup },
      )
      const comparison = compare(outcome.aggregated, baseline?.scenarios?.[scenario.name])

      // Provenance problems are about whether a number MEANS anything, so they
      // are surfaced next to the table and they block a baseline update.
      const provenance = provenanceWarnings(outcome.aggregated, scenario.name)
      comparison.warnings.push(...provenance)
      if (outcome.aggregated && Object.values(outcome.aggregated).some((metric) => metric.sourceConflict)) {
        blockingWarnings.push(`${scenario.name}: a metric blended two measurement sources`)
      }
      // A health-discarded run set is NOT a clean result, even though every
      // KEPT run is clean. Before health failures were retryable, a batch that
      // destabilised the WebGL context killed the invocation; if the retry path
      // only warned, that same batch would now print "no regressions" and be
      // baselined. The discards must therefore reach BOTH the exit code and the
      // baseline gate.
      //
      // Note the wording: the page failed, and attributing that to "the rig"
      // would be exactly the wrong prior for a harness whose job is to
      // attribute movement to the diff.
      const healthDetail = healthBlocker(scenario.name, outcome)
      if (healthDetail) {
        comparison.warnings.push(healthDetail)
        blockingWarnings.push(healthDetail)
        exitCode = 1
      }
      for (const meta of outcome.meta) {
        if (meta?.frameBufferOverflowed) {
          comparison.warnings.push(`${scenario.name}: the rAF frame buffer OVERFLOWED — frame metrics are truncated`)
          blockingWarnings.push(`${scenario.name}: frame buffer overflowed`)
        }
      }

      const report = {
        version: REPORT_VERSION,
        scenario: scenario.name,
        description: scenario.description,
        startedAt,
        finishedAt: new Date().toISOString(),
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
        // `after` is filled in once every scenario has run — see the re-sample
        // below. A single t=0 sample cannot see a load onset mid-invocation,
        // which is exactly how this guard's motivating incident happened.
        machineLoad: { before: loadBefore, after: null, busy: loadBefore.busy },
        rigMismatchVsBaseline: mismatches,
        build: { serveCommand: SERVE_COMMAND, baseUrl: BASE_URL, built: options.build, ...fingerprint },
        sources: outcome.sources,
        metrics: outcome.aggregated,
        comparison: comparison.rows,
        warnings: comparison.warnings,
        perRunMeta: outcome.meta,
      }

      const file = await writeReport(REPORTS_DIR, scenario.name, report)
      printComparison(scenario.name, outcome.kept.length, outcome.discarded.length, comparison, log)
      log(`  sources: ${Object.entries(outcome.sources).map(([k, v]) => `${k}=${v}`).join(' · ') || 'n/a'}`)
      log(`  report: ${path.relative(REPO_ROOT, file)}`)

      if (comparison.regressions > 0) exitCode = 1
      if (outcome.flagged.length > 0) blockingWarnings.push(`${scenario.name}: an outlier run was kept after exhausting replacements`)
      aggregatesByScenario[scenario.name] = outcome.aggregated
      writtenReports.push({ file, report })
    }
  } finally {
    await shutdown()
  }

  // RE-SAMPLE. `all --runs 5` runs ~20 minutes; the incident this guard exists
  // for was a screensaver starting MID-run. One `ps` call, no browser.
  const loadAfter = await sampleMachineLoad('after')
  reportMachineLoad(loadAfter, log, 'after')
  const machineLoad = combineMachineLoad(loadBefore, loadAfter)

  // Backfill the after-sample into the reports already written, so a report can
  // never vouch for a window with load data stamped before it existed.
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

    // A baseline is the reference every later keep-or-revert decision is judged
    // against. Ratcheting one in from a run that REGRESSED makes the regression
    // the new normal and it can never be detected again — the single most
    // damaging thing this tool could do quietly. Same for a run whose outlier
    // survived the gate. Both are recoverable intentions, so they need --force
    // rather than a refusal, but neither may happen by default.
    // Ruling R10: a busy rig is a baseline-corrupting condition, on the same
    // footing as a regression. Task 5's baseline is the reference all six
    // batches are judged against; taken on a loaded machine it is inflated, and
    // every later batch then reads as an improvement.
    const { refuse, reasons } = baselineRefusal({
      force: options.force,
      exitCode,
      blockingWarnings,
      machineLoad,
    })
    if (refuse) {
      process.stderr.write(
        'REFUSING --update-baseline: this run is not a clean reference.\n' +
          (exitCode === 1 ? '  - it did not finish clean (regressions, or runs discarded for page-health failures)\n' : '') +
          reasons.map((warning) => `  - ${warning}\n`).join('') +
          'Quiesce the machine and/or fix the regression and re-run, or pass --force if you\n' +
          'deliberately intend this to become the new reference.\n',
      )
      return 2
    }

    const { notes } = await updateScenarios(BASELINE_PATH, aggregatesByScenario, rig)
    log(`baseline: updated "scenarios" key for ${Object.keys(aggregatesByScenario).join(', ')} in perf/baseline.json`)
    log('baseline: "lighthouse" and "exact" keys left untouched (Task 4 and Task 5 own those)')
    if (notes.rigKeysAdded.length > 0) log(`baseline: filled missing rig key(s): ${notes.rigKeysAdded.join(', ')}`)
    if (notes.retained.length > 0) {
      log(`  !! ${notes.retained.length} baseline metric(s) were NOT produced by this run and were RETAINED, not deleted:`)
      for (const key of notes.retained) log(`  !!   ${key}`)
      log('  !! (a budget that silently stops existing is worse than one that fails — investigate the missing source)')
    }
  }

  log('')
  log(exitCode === 0 ? 'result: no regressions' : `result: ${VERDICT.REGRESSION} — see the table(s) above`)
  return exitCode
}

// Only run the CLI when executed directly, so `runScenario` can be imported and
// driven by a focused test without launching a whole measurement invocation.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`\nperf harness failed: ${error?.stack ?? error}\n`)
      process.exit(2)
    },
  )
}
