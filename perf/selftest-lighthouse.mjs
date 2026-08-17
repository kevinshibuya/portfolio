#!/usr/bin/env node
// Regression test for the SHARED-MODULE CONTRACTS the Lighthouse bench (Layer 3)
// introduced, and for its own metric extraction.
//
//   node perf/selftest-lighthouse.mjs      (also runs as part of `npm run perf:selftest`)
//
// No browser, no build, no port 4173, no Lighthouse run: it drives the pure
// functions against temp files and hand-built fixtures. That is deliberate —
// whether Chrome renders the page is proved by actually running the bench; what
// cannot be proved that way, and is far more dangerous, is whether the
// bookkeeping AROUND a run is correct.
//
// WHY THIS FILE EXISTS AT ALL, stated plainly because it was the review finding
// that mattered most on Task 4: Layer 3 shipped by EXTENDING two modules that
// Layer 2 depends on — `lib/baseline.mjs` (a new `updateLighthouse` alongside
// `updateScenarios`, both routed through one private `updateSection`) and
// `lib/report.mjs` (`compareReportFiles`, moved verbatim out of run.mjs). The
// evidence offered for those edits was `perf/selftest-retry.mjs` staying 26/26 —
// but that suite touches neither module, so it was evidence that the UNTOUCHED
// code still worked, not that the refactor was correct. The assertions below
// are the durable version of that evidence.
//
// The properties under test, and why each one matters:
//
//   1. THE THREE-WRITER CONTRACT. `perf/baseline.json` has three writers —
//      Layer 2 owns `scenarios`, this bench owns `lighthouse`, Task 5 hand-fills
//      `exact`. Each must read-modify-write ONLY its own key. A violation is not
//      a crash; it is Task 5's hand-filled budgets quietly vanishing on the next
//      `npm run perf`, discovered weeks later when a batch is judged against a
//      baseline that lost half its metrics.
//   2. METRICS ARE NEVER SILENTLY SKIPPED. An audit that errors must surface as
//      an explicit reason, not as an absent key. An absent key aggregates to
//      nothing, compares to nothing, and disappears from the table — a budget
//      that stops existing rather than failing.
//   3. THE INSTRUMENT IS COMPARED, NOT JUST THE RIG. Two reports produced by
//      different Lighthouse versions or different throttling settings are not
//      comparable, however well their medians happen to line up.

import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { updateScenarios, updateLighthouse, readBaseline } from './lib/baseline.mjs'
import { compareReportFiles } from './lib/report.mjs'
import { extractMetrics, parseArgs } from './lighthouse.mjs'

const results = []
const check = (name, passed, detail) => {
  results.push({ name, passed, detail })
  process.stdout.write(`${passed ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`)
}
const section = (title) => process.stdout.write(`\n${title}\n`)
const quiet = () => {}

// Assertions read through OPTIONAL CHAINING throughout. The regressions this
// suite is aimed at — a writer clobbering a sibling key, a wholesale section
// replace — delete the very paths these assertions walk, so a plain read throws
// an uncaught TypeError and aborts the run before the remaining assertions get
// to speak. The exit code is non-zero either way, but "FAIL <named assertion>"
// tells you which contract broke and a stack trace does not.
const RIG = { chrome: '147.0.7727.15', macos: '15.7.3', arch: 'arm64', cpu: 'Apple M1', displayScale: 2, refreshHz: 60, acPower: true }
const lhAgg = (median) => ({
  'lh.performance': { median, iqr: 1, band: 2, n: 5, sources: ['lighthouse@12.8.2:simulate'] },
})

const dir = await mkdtemp(path.join(tmpdir(), 'perf-selftest-lh-'))
const tmpFile = (name) => path.join(dir, name)

// ── 1. the three-writer contract ───────────────────────────────────────────

section('three-writer contract on perf/baseline.json')
{
  const baselinePath = tmpFile('baseline.json')
  // A baseline as it will look once all three writers have been through it,
  // plus a key no writer has ever heard of.
  await writeFile(
    baselinePath,
    JSON.stringify({
      rig: RIG,
      scenarios: { 'idle-hero': { 'gpu.busyMsPerFrame': { median: 1.37, iqr: 0.1, band: 0.137, n: 5, source: 'trace:gpu-process' } } },
      lighthouse: { desktop: { 'lh.performance': { median: 91, iqr: 1, band: 2, n: 5 } } },
      exact: { 'hero.transferBytes': 12345 },
      futureUnknownKey: { keep: 'me' },
    }, null, 2),
  )

  await updateLighthouse(baselinePath, { desktop: lhAgg(93), mobile: lhAgg(52) }, RIG)
  let baseline = await readBaseline(baselinePath)
  check('lighthouse.desktop updated by its own writer', baseline.lighthouse?.desktop?.['lh.performance']?.median === 93)
  check('lighthouse.mobile added by its own writer', baseline.lighthouse?.mobile?.['lh.performance']?.median === 52)
  check('scenarios survives a lighthouse write', baseline.scenarios?.['idle-hero']?.['gpu.busyMsPerFrame']?.median === 1.37)
  check('exact survives a lighthouse write', baseline.exact?.['hero.transferBytes'] === 12345)
  check('unknown key survives a lighthouse write', baseline.futureUnknownKey?.keep === 'me')

  // The other direction. Both must hold, or the contract only works until
  // whoever writes second happens to run.
  await updateScenarios(
    baselinePath,
    { 'idle-hero': { 'gpu.busyMsPerFrame': { median: 1.5, iqr: 0.1, band: 0.15, n: 5, sources: ['trace:gpu-process'] } } },
    RIG,
  )
  baseline = await readBaseline(baselinePath)
  check('scenarios updated by its own writer', baseline.scenarios?.['idle-hero']?.['gpu.busyMsPerFrame']?.median === 1.5)
  check('lighthouse survives a scenarios write', baseline.lighthouse?.desktop?.['lh.performance']?.median === 93)
  check('exact survives a scenarios write', baseline.exact?.['hero.transferBytes'] === 12345)
  check('unknown key survives a scenarios write', baseline.futureUnknownKey?.keep === 'me')
  check('rig left byte-identical when it already matches', baseline.rig?.chrome === RIG.chrome && baseline.rig?.refreshHz === 60)
  check('single-source provenance recorded', baseline.scenarios?.['idle-hero']?.['gpu.busyMsPerFrame']?.source === 'trace:gpu-process')
}

section('merge rules apply to the lighthouse key too, not just scenarios')
{
  const baselinePath = tmpFile('merge.json')
  await writeFile(
    baselinePath,
    JSON.stringify({
      lighthouse: {
        desktop: {
          'lh.performance': { median: 90, iqr: 1, band: 2, n: 5 },
          // The hand-set override Task 5 is required to add, because 10% of a
          // ~950 KB median is a ~95 KB tolerance on a near-constant figure.
          'lh.transferBytes': { median: 500000, iqr: 0, band: 50000, n: 5, maxBand: 2048 },
        },
      },
    }, null, 2),
  )

  // A run that produced only ONE of the two stored metrics.
  const { notes } = await updateLighthouse(baselinePath, { desktop: lhAgg(91) }, RIG)
  let baseline = await readBaseline(baselinePath)
  check('a metric this run did not produce is RETAINED, not deleted', !!baseline.lighthouse?.desktop?.['lh.transferBytes'])
  check('the retention is reported to the caller', notes.retained.includes('desktop.lh.transferBytes'), JSON.stringify(notes.retained))
  check('rig bootstrapped when absent', notes.rigKeysAdded.length > 0 && baseline.rig?.chrome === RIG.chrome)

  await updateLighthouse(
    baselinePath,
    { desktop: { 'lh.transferBytes': { median: 500000, iqr: 0, band: 50000, n: 5, sources: ['audit:total-byte-weight'] } } },
    RIG,
  )
  baseline = await readBaseline(baselinePath)
  check('maxBand override survives the round trip AND caps the recomputed band', baseline.lighthouse?.desktop?.['lh.transferBytes']?.band === 2048, `band=${baseline.lighthouse?.desktop?.['lh.transferBytes']?.band}`)
  check('KEY_ORDER puts rig before lighthouse', JSON.stringify(Object.keys(baseline)) === '["rig","lighthouse"]', Object.keys(baseline).join(','))
}

// ── 2. metric extraction ───────────────────────────────────────────────────

const HEALTHY_LHR = {
  lighthouseVersion: '12.8.2',
  categories: { performance: { score: 0.914 } },
  timing: { total: 18234.5 },
  audits: {
    'largest-contentful-paint': { numericValue: 2411.2 },
    'total-blocking-time': { numericValue: 310 },
    'cumulative-layout-shift': { numericValue: 0 },
    'first-contentful-paint': { numericValue: 900 },
    'speed-index': { numericValue: 1800 },
    'total-byte-weight': { numericValue: 512345 },
  },
}

section('extractMetrics — a healthy run')
{
  const { metrics, unavailable, sources } = extractMetrics(HEALTHY_LHR)
  check('score converted 0..1 -> 0..100', metrics['lh.performance'] === 91, String(metrics['lh.performance']))
  check('LCP read from its audit', metrics['lh.lcpMs'] === 2411.2)
  check('TBT read from its audit', metrics['lh.tbtMs'] === 310)
  // A real trap: `if (!value)` would drop a perfect CLS and the metric would
  // silently stop being measured on exactly the builds that fixed it.
  check('a CLS of 0 is REPORTED, not treated as absent', metrics['lh.cls'] === 0)
  check('transfer bytes read from total-byte-weight', metrics['lh.transferBytes'] === 512345)
  check('lighthouse run time captured', metrics['lh.runMs'] === 18234.5)
  check('nothing reported unavailable', unavailable.length === 0, JSON.stringify(unavailable))
  check('source string carries version and throttling method', sources.lighthouse === 'lighthouse@12.8.2:simulate', sources.lighthouse)
  check('transfer bytes carries its own source', sources.transferBytes === 'audit:total-byte-weight')
}

section('extractMetrics — NEVER silently skip a metric')
{
  const { metrics, unavailable } = extractMetrics({
    categories: { performance: { score: null } },
    timing: {},
    audits: {
      'largest-contentful-paint': { scoreDisplayMode: 'error', errorMessage: 'NO_LCP' },
      'total-blocking-time': { numericValue: NaN },
      'total-byte-weight': { errorMessage: 'boom' },
      // 'cumulative-layout-shift', 'first-contentful-paint', 'speed-index' absent
    },
  })
  const reasonFor = (metric) => unavailable.find((entry) => entry.metric === metric)?.reason ?? ''
  const named = unavailable.map((entry) => entry.metric)

  check('a non-numeric performance score is reported', named.includes('lh.performance'))
  check('an ERRORED audit is reported, with the audit message kept', named.includes('lh.lcpMs') && /NO_LCP/.test(reasonFor('lh.lcpMs')), reasonFor('lh.lcpMs'))
  check('a non-finite numericValue is reported', named.includes('lh.tbtMs'))
  check('an ABSENT audit is reported', named.includes('lh.cls'))
  check('a failed transfer read names BOTH providers it tried', named.includes('lh.transferBytes') && /resource-summary/.test(reasonFor('lh.transferBytes')), reasonFor('lh.transferBytes'))
  check('missing lhr.timing is reported', named.includes('lh.runMs'))
  check('and NO metric is emitted from any of it', Object.keys(metrics).length === 0, JSON.stringify(metrics))
  check('every unavailable entry carries a non-empty reason', unavailable.every((entry) => typeof entry.reason === 'string' && entry.reason.length > 0))
}

section('extractMetrics — the transfer-bytes fallback is NAMED, never silent')
{
  const { metrics, sources } = extractMetrics({
    categories: { performance: { score: 1 } },
    timing: { total: 1 },
    audits: {
      'total-byte-weight': { errorMessage: 'x' },
      'resource-summary': { details: { items: [{ resourceType: 'script', transferSize: 10 }, { resourceType: 'total', transferSize: 999 }] } },
    },
  })
  check('the fallback provider supplies the value', metrics['lh.transferBytes'] === 999)
  // This is what makes a run set that switched providers mid-way get flagged
  // BLENDED by aggregate() instead of medianed into a number measuring neither.
  check('the fallback reports a DIFFERENT source than the primary', sources.transferBytes === 'audit:resource-summary')
}

// ── 3. the instrument is compared, not just the rig ────────────────────────

section('compareReportFiles — instrument drift is a disagreement')
{
  const baseReport = (overrides = {}) => ({
    scenario: 'lighthouse-desktop',
    rig: RIG,
    build: { distIndexHash: 'sha256:abc' },
    lighthouse: {
      version: '12.8.2',
      pinnedAgainst: '12.8.2',
      headless: false,
      settings: { throttlingMethod: 'simulate', formFactor: 'desktop', throttling: { rttMs: 40 } },
      chromeFlags: ['--mute-audio', '--no-first-run'],
      ...overrides,
    },
    metrics: { 'lh.performance': { median: 66, band: 6.6, sources: ['lighthouse@12.8.2:simulate'] } },
  })

  const write = async (name, report) => {
    const file = tmpFile(name)
    await writeFile(file, JSON.stringify(report, null, 2))
    return file
  }

  const a = await write('a.json', baseReport())
  check('identical instruments agree', (await compareReportFiles(a, await write('a2.json', baseReport()), quiet)) === 0)

  const drifted = await write('b.json', baseReport({ version: '13.0.0' }))
  check('a different lighthouse VERSION disagrees', (await compareReportFiles(a, drifted, quiet)) === 1)

  const repinned = await write('c.json', baseReport({ pinnedAgainst: '13.0.0' }))
  check('a re-pinned bench disagrees', (await compareReportFiles(a, repinned, quiet)) === 1)

  const resettled = await write('d.json', baseReport({ settings: { throttlingMethod: 'devtools', formFactor: 'desktop', throttling: { rttMs: 40 } } }))
  check('different THROTTLING settings disagree', (await compareReportFiles(a, resettled, quiet)) === 1)

  const reflagged = await write('e.json', baseReport({ chromeFlags: ['--mute-audio'] }))
  check('a different chrome FLAG vector disagrees', (await compareReportFiles(a, reflagged, quiet)) === 1)

  const headless = await write('f.json', baseReport({ headless: true }))
  check('a different rendering path (headless) disagrees', (await compareReportFiles(a, headless, quiet)) === 1)

  // Key ORDER is not a difference; key CONTENT is. Without the canonicalising
  // hash this would false-positive on every report written by a different
  // Node version's property ordering.
  const reordered = await write('g.json', baseReport({ settings: { formFactor: 'desktop', throttling: { rttMs: 40 }, throttlingMethod: 'simulate' } }))
  check('settings key ORDER alone is not a disagreement', (await compareReportFiles(a, reordered, quiet)) === 0)

  // Layer 2 reports have no `lighthouse` block at all and must be unaffected.
  const layer2 = { scenario: 'idle-hero', rig: RIG, build: { distIndexHash: 'sha256:abc' }, metrics: { 'gpu.busyMsPerFrame': { median: 1.37, band: 0.137, sources: ['trace:gpu-process'] } } }
  const l2a = await write('l2a.json', layer2)
  const l2b = await write('l2b.json', layer2)
  check('Layer 2 reports (no lighthouse block) still compare clean', (await compareReportFiles(l2a, l2b, quiet)) === 0)

  // ONE-SIDED ON THE INSTRUMENT BLOCK AND NOTHING ELSE.
  //
  // This fixture is built by DELETING `lighthouse` from a full copy of A, not
  // by adding metrics to a Layer 2 report. The earlier version did the latter,
  // and it passed for the wrong reason: both reports ended up carrying a
  // `lighthouse` block, and the `1` came from the metric-key union
  // (MISSING IN A / MISSING IN B) rather than from the one-sided branch it
  // claimed to cover — neutralising that branch still left the suite green.
  // Everything except the instrument block must therefore be IDENTICAL here, so
  // a non-zero result can only have come from the branch under test.
  const oneSided = baseReport()
  delete oneSided.lighthouse
  const mixed = await write('mixed.json', oneSided)
  check('one report with an instrument block and one without disagrees', (await compareReportFiles(a, mixed, quiet)) === 1)

  // The pre-existing rules must still hold after the addition.
  const otherRig = await write('rig.json', { ...baseReport(), rig: { ...RIG, chrome: '999.0.0.0' } })
  check('a rig mismatch still disagrees', (await compareReportFiles(a, otherRig, quiet)) === 1)
  const otherScenario = await write('scen.json', { ...baseReport(), scenario: 'lighthouse-mobile' })
  check('different scenarios still exit 2 (not comparable)', (await compareReportFiles(a, otherScenario, quiet)) === 2)
}

// ── 4. CLI parsing ─────────────────────────────────────────────────────────

section('parseArgs')
{
  check('no preset defaults to BOTH presets', parseArgs([]).options.presets.length === 2)
  check('a named preset selects only it', parseArgs(['desktop']).options.presets[0].name === 'desktop')
  check('--runs N is parsed', parseArgs(['--runs', '3']).options.runs === 3)
  check('--runs=N is parsed', parseArgs(['--runs=3']).options.runs === 3)
  check('--runs 0 is rejected', !!parseArgs(['--runs', '0']).error)
  check('an unknown preset is rejected', !!parseArgs(['nope']).error)
  check('two presets are rejected', !!parseArgs(['desktop', 'mobile']).error)
  check('an unknown flag is rejected', !!parseArgs(['--nope']).error)
  check('--compare needs two paths', !!parseArgs(['--compare', 'a']).error)
  check('build defaults ON, warmup defaults ON', parseArgs([]).options.build === true && parseArgs([]).options.warmup === true)
  check('--no-build / --no-warmup turn them off', parseArgs(['--no-build', '--no-warmup']).options.build === false && parseArgs(['--no-warmup']).options.warmup === false)
}

// ── verdict ────────────────────────────────────────────────────────────────

const passed = results.filter((result) => result.passed).length
process.stdout.write(`\n${passed}/${results.length} passed\n`)
if (passed !== results.length) {
  for (const result of results.filter((r) => !r.passed)) process.stderr.write(`FAILED: ${result.name}\n`)
  process.exit(1)
}
