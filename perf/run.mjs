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
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'

import { BASE_URL, SERVE_COMMAND, buildOnce, distFingerprint, startPreview } from './lib/server.mjs'
import { collectRig, rigMismatches } from './lib/rig.mjs'
import { readBaseline, updateScenarios } from './lib/baseline.mjs'
import { aggregate, findOutlierRun, MIN_RUNS_FOR_OUTLIER } from './lib/stats.mjs'
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
  if (message) process.stderr.write(`\nerror: ${message}\n`)
  process.stderr.write(`
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
  -h, --help          this message

exit codes: 0 ok · 1 regression (or reports disagree, with --compare) · 2 usage
`)
}

function parseArgs(argv) {
  const options = { scenarios: null, runs: DEFAULT_RUNS, updateBaseline: false, build: true, warmup: true, compare: null }
  const positional = []

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') return { help: true }
    else if (arg === '--update-baseline') options.updateBaseline = true
    else if (arg === '--no-build') options.build = false
    else if (arg === '--no-warmup') options.warmup = false
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

async function runScenario(scenario, runs, context, { warmup = true } = {}) {
  const kept = []
  const discarded = []
  // Outliers that survived MAX_REPLACEMENTS and were kept anyway. Tracked
  // apart from `discarded` so the printed count means what it says.
  const flagged = []
  let replacements = 0
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
    const result = await scenario.run(context)
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
  log(`  ${'metric'.padEnd(30)}${'A'.padStart(12)}${'B'.padStart(12)}${'|delta|'.padStart(12)}${'band'.padStart(12)}  verdict`)
  for (const [metric, left] of Object.entries(a.metrics)) {
    const right = b.metrics[metric]
    if (!right) {
      log(`  ${metric.padEnd(30)}${String(left.median).padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}${'—'.padStart(12)}  MISSING IN B`)
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

  const rig = await collectRig()
  log(`rig: chrome ${rig.chrome} · macOS ${rig.macos} · ${rig.arch} · display ${rig.displayScale}x · ${rig.acPower ? 'AC power' : 'BATTERY'}`)
  if (!rig.acPower) {
    log('  !! WARNING: this rig is on BATTERY. macOS throttles differently on battery; every number below is suspect.')
  }

  const baseline = await readBaseline(BASELINE_PATH)
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

  try {
    for (const scenario of options.scenarios) {
      log('')
      log(`── ${scenario.name} ── ${scenario.description}`)
      const startedAt = new Date().toISOString()
      const outcome = await runScenario(scenario, options.runs, { baseUrl: BASE_URL, log }, { warmup: options.warmup })
      const comparison = compare(outcome.aggregated, baseline?.scenarios?.[scenario.name])

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
      aggregatesByScenario[scenario.name] = outcome.aggregated
    }
  } finally {
    await shutdown()
  }

  if (options.updateBaseline) {
    log('')
    if (mismatches.length > 0) {
      process.stderr.write(
        'REFUSING --update-baseline: this rig does not match the rig recorded in perf/baseline.json.\n' +
          'Baselines are rig-relative by design; ratcheting them from a different rig corrupts every\n' +
          'comparison the campaign makes afterwards. Restore the rig, or delete the stored rig block\n' +
          'deliberately if the reference rig has genuinely changed.\n',
      )
      return 2
    }
    await updateScenarios(BASELINE_PATH, aggregatesByScenario, rig)
    log(`baseline: updated "scenarios" key for ${Object.keys(aggregatesByScenario).join(', ')} in perf/baseline.json`)
    log('baseline: "lighthouse" and "exact" keys left untouched (Task 4 and Task 5 own those)')
  }

  log('')
  log(exitCode === 0 ? 'result: no regressions' : `result: ${VERDICT.REGRESSION} — see the table(s) above`)
  return exitCode
}

main().then(
  (code) => process.exit(code),
  (error) => {
    process.stderr.write(`\nperf harness failed: ${error?.stack ?? error}\n`)
    process.exit(2)
  },
)
