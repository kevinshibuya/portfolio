#!/usr/bin/env node
// Task 7b Step 5 / 5b: the MINIMUM DETECTABLE EFFECT of `npm run perf` on
// idle-hero's `gpu.shaderMsPerFrame`, and the `maxBand` derived from the same
// legs.
//
//   node perf/mde-sweep.mjs [--dry-run]
//
// WHY THIS EXISTS. Step 5's original bar — "the harness must flag `i<5` ->
// `i<10`" — rested on an assumption measurement killed: that plant was believed
// to roughly double shader cost, and at the rig's real 2.9 Mpix canvas it is a
// +2.6% effect. So the question stopped being "does it catch THIS plant" and
// became "what is the smallest plant it catches at all" — which is the number
// every later batch needs, because a batch claiming a win below the MDE is not
// decidable by this harness and has to say so.
//
// THE DESIGN IS RULED, NOT INVENTED HERE. Kevin approved it on 2026-09-01; the
// numbered ruling sits in the plan under Task 7b Step 5b. The rules it fixes
// BEFORE any number exists, and which this file implements literally:
//
//   1. Drive the PUBLIC CLI. The MDE must be the number `npm run perf` itself
//      produces, so every leg is a child `node perf/run.mjs idle-hero --runs 5`
//      and every median is read back out of the report JSON that invocation
//      wrote. No scenario is imported, no run loop is reimplemented.
//   2. Seven legs, `C P10 C P20 C P40 C`, controls INTERLEAVED. Non-negotiable:
//      the controls drift monotonically upward across legs (5.8348 -> 5.8868 ->
//      5.9310 observed), and a block design lets that drift masquerade as
//      signal. Each plant is judged against the mean of the two controls that
//      bracket it in time.
//   3. `--runs 5`, because the MDE has to be measured at the GATING
//      configuration, not at a cheaper one.
//   4. Collect once, evaluate twice — under the default band and under the
//      proposed `maxBand`. The reports carry median/iqr/band per leg, so both
//      evaluations are analytic. Nothing is re-run to change a band.
//   5. The `maxBand` rule is fixed here, in code, before the first number
//      exists. See `deriveMaxBand`.
//
// WHAT IT DOES NOT DO: it does not write `baseline.json`. Step 5b's edit is a
// human one, made from this script's printed derivation.

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { bandFor, applyBandOverrides } from './lib/stats.mjs'
import { sampleMachineLoad } from './lib/load.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORTS_DIR = path.join(REPO_ROOT, 'perf', 'reports')
const SHADER_FILE = 'src/components/canvas/FluidWaves.tsx'
const DIST_ASSETS = path.join(REPO_ROOT, 'dist', 'assets')

const SCENARIO = 'idle-hero'
const METRIC = 'gpu.shaderMsPerFrame'
const RUNS = 5

/** The plant site, verbatim. A miss here is a shader that changed shape. */
const CONTROL_LOOP = 'for (int i = 0; i < 5; i++)'
const plantLoop = (n) => `for (int i = 0; i < ${n}; i++)`

/** Ascending, fixed. With three plants, randomisation buys nothing over the
 *  adjacent-control pairing that already absorbs drift — and a fixed order is
 *  reproducible. */
const PLANTS = [10, 20, 40]

/**
 * `idle-hero.mjs:64`'s `minBand` for this metric, duplicated deliberately.
 *
 * Importing it would make this file silently FOLLOW a drift in the scenario;
 * duplicating it plus `assertBandArithmetic` below makes a drift ABORT the
 * sweep, because the recomputed default band would stop matching the band the
 * runner wrote into its own report. The copy is the tripwire, not the source.
 */
const DEFAULT_MIN_BAND = 0.37

/** Task 8's expected win, the thing the MDE has to sit below to be useful. */
const TASK_8_EXPECTED_MS = 1.35

const log = (line = '') => process.stdout.write(`${line}\n`)

const DRY_RUN = process.argv.includes('--dry-run')

// ---------------------------------------------------------------------------
// Shell helpers
// ---------------------------------------------------------------------------

function sh(cmd, args, { allowFail = false } = {}) {
  const result = spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: 'utf8' })
  if (!allowFail && result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed (${result.status}): ${result.stderr ?? ''}`)
  }
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

// ---------------------------------------------------------------------------
// The plant, and the revert that is not optional
// ---------------------------------------------------------------------------

const shaderPath = () => path.join(REPO_ROOT, SHADER_FILE)

function revert() {
  sh('git', ['checkout', '--', SHADER_FILE], { allowFail: true })
}

function srcDiff() {
  return sh('git', ['diff', '--name-only', '--', 'src/']).stdout.trim()
}

/** Ruling point 8: assert clean BEFORE leg 1 and again at the very end. A
 *  sweep that leaves a plant in the tree has poisoned every later measurement
 *  on this branch, so this is a hard abort, never a warning. */
function assertSrcClean(when) {
  const dirty = srcDiff()
  if (dirty) throw new Error(`src/ is dirty ${when}: ${dirty.split('\n').join(', ')}`)
}

function plant(n) {
  const before = readFileSync(shaderPath(), 'utf8')
  const after = before.replace(CONTROL_LOOP, plantLoop(n))
  if (after === before) throw new Error(`plant site not found — the shader loop changed shape (looked for \`${CONTROL_LOOP}\`)`)
  writeFileSync(shaderPath(), after)
}

/**
 * Ruling point 2: the plant is verified IN THE SERVED BUNDLE, not in the
 * source. `dist/` is still the artifact the leg was served from when the child
 * exits — nothing rebuilds after it — so grepping here proves what the browser
 * actually executed, which is the only thing a measurement can be about.
 */
function bundlePlantState() {
  if (!existsSync(DIST_ASSETS)) return { control: 0, plants: {} }
  const count = (needle) => {
    const result = sh('grep', ['-ro', needle, DIST_ASSETS], { allowFail: true })
    return result.stdout.split('\n').filter(Boolean).length
  }
  const plants = {}
  for (const n of PLANTS) plants[n] = count(`int i = 0; i < ${n}`)
  return { control: count('int i = 0; i < 5'), plants }
}

/** What the bundle SHOULD contain for a given leg. `expected === null` = control. */
function assertBundleMatches(legName, expected) {
  const state = bundlePlantState()
  const wrong = []
  if (expected === null) {
    if (state.control < 1) wrong.push('the control loop is absent from the served bundle')
    for (const n of PLANTS) if (state.plants[n] > 0) wrong.push(`a i<${n} plant is present in a CONTROL leg`)
  } else {
    if (state.plants[expected] < 1) wrong.push(`the i<${expected} plant is absent from the served bundle`)
    if (state.control > 0) wrong.push('the control loop is still present in a PLANT leg')
    for (const n of PLANTS) if (n !== expected && state.plants[n] > 0) wrong.push(`an unexpected i<${n} plant is present`)
  }
  if (wrong.length > 0) {
    throw new Error(`leg ${legName}: served bundle does not carry the expected plant state — ${wrong.join('; ')}`)
  }
  return state
}

// ---------------------------------------------------------------------------
// Rig checks — ruling point 7: hard aborts inside the sweep, both ends of every leg
// ---------------------------------------------------------------------------

function powerState() {
  const out = sh('pmset', ['-g', 'ps']).stdout
  return { ac: /AC Power/i.test(out), raw: out.trim().split('\n')[0] ?? '' }
}

/** Battery runs ~5% faster with worse spread. A battery reading anywhere in the
 *  sweep invalidates every leg around it, so it aborts rather than annotates. */
function assertAcPower(where) {
  const power = powerState()
  if (!power.ac) throw new Error(`NOT on AC power ${where} — ${power.raw}`)
  return power
}

const LOAD_RETRIES = 6
const LOAD_RETRY_MS = 30_000

/**
 * `PerfPowerServices` / `coreduetd` / `duetexpertd` spike 80-110% for 2-3
 * minutes after a heavy run, which is exactly the window between two legs. So
 * a busy sample is retried for ~3 min before it is believed, and only then
 * aborts. (`run.mjs` samples load too, but only REFUSES on it for
 * `--update-baseline`; a plain run happily measures a loaded rig.)
 */
async function waitForQuietRig(legName) {
  for (let attempt = 1; attempt <= LOAD_RETRIES; attempt += 1) {
    const sample = await sampleMachineLoad(`mde-sweep:${legName}`)
    if (!sample.busy) return sample
    log(`  load guard: busy (attempt ${attempt}/${LOAD_RETRIES}) — ${sample.reasons.join('; ')}`)
    if (attempt === LOAD_RETRIES) {
      throw new Error(`leg ${legName}: rig still BUSY after ${LOAD_RETRIES} samples over ~${Math.round((LOAD_RETRIES * LOAD_RETRY_MS) / 60000)} min — ${sample.reasons.join('; ')}`)
    }
    await new Promise((resolve) => setTimeout(resolve, LOAD_RETRY_MS))
  }
  throw new Error('unreachable')
}

/** The sleep timer on this rig is ONE MINUTE. A sweep is ~35. */
function assertCaffeinated() {
  const result = sh('pgrep', ['-f', 'caffeinate -disu'], { allowFail: true })
  if (result.stdout.trim() === '') {
    throw new Error('no `caffeinate -disu` is running — arm it first: nohup caffeinate -disu -t 10800 >/dev/null 2>&1 &')
  }
}

/** The runner frees port 4173 itself, but a FOREIGN listener means someone
 *  else's server is live and the operator asked for two things at once. */
function assertPortFree() {
  const result = sh('lsof', ['-ti:4173'], { allowFail: true })
  const pids = result.stdout.trim()
  if (pids) throw new Error(`something is already listening on 4173 (pid ${pids.split('\n').join(', ')}) — kill the parent first`)
}

// ---------------------------------------------------------------------------
// One leg
// ---------------------------------------------------------------------------

const reportFiles = () => (existsSync(REPORTS_DIR) ? readdirSync(REPORTS_DIR).filter((f) => f.endsWith(`-${SCENARIO}.json`)) : [])

/**
 * Ruling point 1's exit-code contract: exit 1 from a PLANT leg is the wanted
 * signal, not a failure. Anything else — a usage error, a crash, a refusal —
 * aborts the sweep after the revert, because a leg that did not measure what it
 * claims to have measured cannot be silently dropped from a seven-leg design.
 */
async function runLeg({ name, plantN }) {
  log('')
  log(`=== leg ${name} ${'='.repeat(Math.max(0, 60 - name.length))}`)

  assertPortFree()
  const loadBefore = await waitForQuietRig(name)
  const powerBefore = assertAcPower(`before leg ${name}`)

  if (plantN === null) revert()
  else {
    revert()
    plant(plantN)
  }

  const before = new Set(reportFiles())
  const startedAt = new Date().toISOString()

  let status = 0
  if (DRY_RUN) {
    log(`  [--dry-run] would spawn: node perf/run.mjs ${SCENARIO} --runs ${RUNS}`)
  } else {
    // stdio inherited: the child's own table goes straight to this process's
    // stdout (a log file, when the operator redirects one). Never piped —
    // piping a suite run is on this campaign's dead-ends list.
    const child = spawnSync('node', ['perf/run.mjs', SCENARIO, '--runs', String(RUNS)], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    })
    if (child.error) throw new Error(`leg ${name}: could not spawn the runner — ${child.error.message}`)
    status = child.status
  }

  const powerAfter = assertAcPower(`after leg ${name}`)

  if (DRY_RUN) {
    revert()
    return { name, plantN, status, dryRun: true, powerBefore, powerAfter, loadBefore }
  }

  if (status !== 0 && status !== 1) {
    throw new Error(`leg ${name}: runner exited ${status} — that is a crash or a refusal, not a verdict`)
  }
  if (status === 1 && plantN === null) {
    // Not fatal: a control can regress on some OTHER metric. Recorded, and the
    // per-metric verdict below is what the table actually reads.
    log(`  note: control leg ${name} exited 1 — check which metric regressed in the table above`)
  }

  const fresh = reportFiles().filter((f) => !before.has(f)).sort()
  if (fresh.length !== 1) {
    throw new Error(`leg ${name}: expected exactly 1 new ${SCENARIO} report, found ${fresh.length}`)
  }
  const reportPath = path.join(REPORTS_DIR, fresh[0])
  const report = JSON.parse(readFileSync(reportPath, 'utf8'))

  const bundle = assertBundleMatches(name, plantN)
  revert()

  const metric = report.metrics?.[METRIC]
  if (!metric) throw new Error(`leg ${name}: the report carries no ${METRIC} — the GPU timer did not attach`)
  const row = (report.comparison ?? []).find((r) => r.metric === METRIC) ?? null

  log(`  ${name}: median ${metric.median} ms · iqr ${metric.iqr} · band ${metric.band} · runner verdict ${row?.verdict ?? 'n/a'} · exit ${status}`)

  return {
    name,
    plantN,
    startedAt,
    status,
    reportPath: path.relative(REPO_ROOT, reportPath),
    median: metric.median,
    iqr: metric.iqr,
    reportBand: metric.band,
    n: metric.n,
    runnerVerdict: row?.verdict ?? null,
    runnerDelta: row?.delta ?? null,
    distIndexHash: report.build?.distIndexHash ?? null,
    bundle,
    powerBefore,
    powerAfter,
    loadBefore: { busy: loadBefore.busy, loadPerCore: loadBefore.loadPerCore, foreignCpuPctOfMachine: loadBefore.foreignCpuPctOfMachine },
  }
}

// ---------------------------------------------------------------------------
// Evaluation — ruling points 3, 4, 6
// ---------------------------------------------------------------------------

/**
 * Guard-of-the-guard: prove this file's band arithmetic IS the runner's before
 * a single verdict is read from it. `bandFor(median, iqr, DEFAULT_MIN_BAND)`
 * has to reproduce the band the runner already wrote into its own report; if
 * `idle-hero.mjs`'s `minBand` moved, or `bandFor` changed shape, that equality
 * breaks and the sweep stops instead of publishing a table computed under a
 * formula the harness no longer uses.
 */
function assertBandArithmetic(legs) {
  for (const leg of legs) {
    const mine = Math.round(bandFor(leg.median, leg.iqr, DEFAULT_MIN_BAND) * 1e4) / 1e4
    if (Math.abs(mine - leg.reportBand) > 1e-4) {
      throw new Error(
        `leg ${leg.name}: recomputed default band ${mine} != the runner's ${leg.reportBand} — ` +
          `this file's DEFAULT_MIN_BAND (${DEFAULT_MIN_BAND}) or bandFor no longer matches the harness`,
      )
    }
  }
}

/**
 * Ruling point 6, fixed before any number existed:
 *
 *   maxBand = ceil-to-0.01( max( 3 x (max-min of the four control medians),
 *                                2 x the largest within-leg control IQR ) )
 *
 * Two terms because the band has to cover both kinds of noise this metric
 * actually shows: leg-to-leg drift (the controls trend upward across a sweep)
 * and within-leg spread. 3x and 2x are the margins; the ceiling is what
 * `stats.mjs:39` was written for — the default formula has a floor but no
 * ceiling, and 10% of 5.89 is 0.5887, which swamps an observed IQR of
 * 0.04-0.11 and hides every effect this metric can see.
 *
 * idle-hero ONLY. scroll-transition's within-leg IQR (0.1514) is about the size
 * of its expected band, so it keeps the default and the record says why.
 */
function deriveMaxBand(controls) {
  const medians = controls.map((c) => c.median)
  const driftTerm = 3 * (Math.max(...medians) - Math.min(...medians))
  const spreadTerm = 2 * Math.max(...controls.map((c) => c.iqr))
  const raw = Math.max(driftTerm, spreadTerm)
  return {
    driftTerm: round4(driftTerm),
    spreadTerm: round4(spreadTerm),
    raw: round4(raw),
    maxBand: Math.ceil(raw * 100) / 100,
  }
}

const round4 = (v) => Math.round(v * 1e4) / 1e4

/**
 * Ruling point 3. Plant k is SEPARATED iff
 *
 *   median(Pk) - mean(median(C_k), median(C_k+1)) > band
 *
 * with the band taken from the WIDER of the two bracketing controls — the same
 * conservatism `--compare` uses when it judges two reports against each other.
 * `overrides` selects which configuration is being evaluated; the legs are
 * measured once and read twice.
 */
function evaluate(legs, { minBand, overrides, label }) {
  const rows = []
  const controls = legs.filter((l) => l.plantN === null)

  for (const leg of legs) {
    if (leg.plantN === null) continue
    const index = legs.indexOf(leg)
    const left = legs[index - 1]
    const right = legs[index + 1]
    const controlMean = (left.median + right.median) / 2
    const band = Math.max(
      applyBandOverrides(bandFor(left.median, left.iqr, minBand), overrides),
      applyBandOverrides(bandFor(right.median, right.iqr, minBand), overrides),
    )
    const delta = leg.median - controlMean
    rows.push({
      plant: leg.plantN,
      leg: leg.name,
      controls: [left.name, right.name],
      controlMean: round4(controlMean),
      median: leg.median,
      delta: round4(delta),
      deltaPct: round4((delta / controlMean) * 100),
      band: round4(band),
      separated: delta > band,
      runnerVerdict: leg.runnerVerdict,
    })
  }

  const separatedPlants = rows.filter((r) => r.separated).map((r) => r.plant)
  let mde = separatedPlants.length > 0 ? Math.min(...separatedPlants) : null

  // "If the two disagree at the MDE plant, the MDE is the LARGER plant." The
  // analytic verdict and the runner's own verdict against baseline.json are two
  // independent readings of the same leg; where they disagree the harness has
  // not demonstrated detection, so the MDE moves out to the next plant that
  // both agree on.
  const disagreements = []
  while (mde !== null) {
    const row = rows.find((r) => r.plant === mde)
    const runnerSaw = row.runnerVerdict === 'REGRESSION'
    if (runnerSaw === row.separated) break
    disagreements.push({ plant: mde, analytic: row.separated, runnerVerdict: row.runnerVerdict })
    const next = separatedPlants.filter((p) => p > mde)
    mde = next.length > 0 ? Math.min(...next) : null
  }

  const controlSpread = round4(Math.max(...controls.map((c) => c.median)) - Math.min(...controls.map((c) => c.median)))
  return { label, minBand, overrides, rows, mde, disagreements, controlSpread }
}

function renderTable(evaluation) {
  const lines = []
  lines.push('')
  lines.push(`--- ${evaluation.label} ---`)
  lines.push(
    `  ${'plant'.padEnd(8)}${'median'.padStart(10)}${'controls'.padStart(12)}${'delta'.padStart(10)}${'delta%'.padStart(9)}${'band'.padStart(9)}  ${'separated'.padEnd(10)}runner`,
  )
  lines.push(`  ${'-'.repeat(8)}${'-'.repeat(10)}${'-'.repeat(12)}${'-'.repeat(10)}${'-'.repeat(9)}${'-'.repeat(9)}  ${'-'.repeat(10)}------`)
  for (const row of evaluation.rows) {
    lines.push(
      `  ${`i<${row.plant}`.padEnd(8)}${String(row.median).padStart(10)}${String(row.controlMean).padStart(12)}` +
        `${`${row.delta > 0 ? '+' : ''}${row.delta}`.padStart(10)}${`${row.deltaPct > 0 ? '+' : ''}${row.deltaPct}%`.padStart(9)}` +
        `${String(row.band).padStart(9)}  ${(row.separated ? 'YES' : 'no').padEnd(10)}${row.runnerVerdict ?? 'n/a'}`,
    )
  }
  lines.push(`  MDE: ${evaluation.mde === null ? 'NOT REACHED by any plant in the sweep' : `i<${evaluation.mde}`}`)
  for (const d of evaluation.disagreements) {
    lines.push(`  !! i<${d.plant}: analytic separated=${d.analytic} but the runner said ${d.runnerVerdict} — MDE pushed to the larger plant`)
  }
  return lines
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  log('MDE sweep — idle-hero / gpu.shaderMsPerFrame')
  log(`legs: C P10 C P20 C P40 C · --runs ${RUNS} · plant site \`${CONTROL_LOOP}\` in ${SHADER_FILE}`)
  if (DRY_RUN) log('MODE: --dry-run (no runner is spawned, no number is produced)')

  assertSrcClean('before leg 1')
  assertCaffeinated()
  assertAcPower('at sweep start')

  const plan = []
  plan.push({ name: 'C0', plantN: null })
  PLANTS.forEach((n, i) => {
    plan.push({ name: `P${n}`, plantN: n })
    plan.push({ name: `C${i + 1}`, plantN: null })
  })

  const legs = []
  const startedAt = new Date().toISOString()
  try {
    for (const step of plan) legs.push(await runLeg(step))
  } finally {
    revert()
  }
  assertSrcClean('after the last leg')

  if (DRY_RUN) {
    log('')
    log(`--dry-run complete: ${legs.length} legs planned, src/ clean, rig checks passed.`)
    return 0
  }

  const controls = legs.filter((l) => l.plantN === null)

  // Ruling point 9. Four identical inputs must build to one artifact; if they
  // do not, the build is nondeterministic and no delta in this table means
  // anything. Said BEFORE any delta is read.
  const hashes = [...new Set(controls.map((c) => c.distIndexHash))]
  const buildDeterministic = hashes.length === 1
  log('')
  log(`control dist hashes: ${buildDeterministic ? `identical (${hashes[0]})` : `DIFFER — ${hashes.join(' | ')}`}`)
  if (!buildDeterministic) {
    log('!! the four control legs did not build to one artifact — every delta below is unreadable')
  }

  assertBandArithmetic(legs)

  const derived = deriveMaxBand(controls)
  log('')
  log('maxBand derivation (rule fixed in code before any leg ran):')
  log(`  control medians       : ${controls.map((c) => c.median).join(', ')}`)
  log(`  control iqrs          : ${controls.map((c) => c.iqr).join(', ')}`)
  log(`  3 x (max-min medians) : ${derived.driftTerm}`)
  log(`  2 x largest iqr       : ${derived.spreadTerm}`)
  log(`  maxBand (ceil 0.01)   : ${derived.maxBand}`)

  const evaluations = [
    evaluate(legs, { minBand: DEFAULT_MIN_BAND, overrides: {}, label: `default band (minBand ${DEFAULT_MIN_BAND}, no override)` }),
    evaluate(legs, { minBand: 0, overrides: { maxBand: derived.maxBand }, label: `proposed band (minBand retired, maxBand ${derived.maxBand})` }),
  ]
  for (const evaluation of evaluations) for (const line of renderTable(evaluation)) log(line)

  log('')
  log('MDE vs Task 8:')
  for (const evaluation of evaluations) {
    const row = evaluation.mde === null ? null : evaluation.rows.find((r) => r.plant === evaluation.mde)
    const verdict =
      row === null
        ? 'no plant separated — this configuration cannot decide ANY batch in the campaign'
        : row.delta < TASK_8_EXPECTED_MS
          ? `${row.delta} ms < Task 8's expected ~${TASK_8_EXPECTED_MS} ms — Task 8 is decidable`
          : `${row.delta} ms >= Task 8's expected ~${TASK_8_EXPECTED_MS} ms — Task 8 is NOT decidable by this harness`
    log(`  ${evaluation.label}: ${verdict}`)
  }

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    scenario: SCENARIO,
    metric: METRIC,
    runs: RUNS,
    plants: PLANTS,
    buildDeterministic,
    controlDistHashes: hashes,
    maxBandDerivation: derived,
    task8ExpectedMs: TASK_8_EXPECTED_MS,
    legs,
    evaluations,
  }
  const summaryPath = path.join(REPORTS_DIR, `${startedAt.replace(/[:.]/g, '-')}-mde-sweep.json`)
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  log('')
  log(`summary: ${path.relative(REPO_ROOT, summaryPath)}`)
  log(`src diff after revert: ${srcDiff() || '(empty)'}`)

  return buildDeterministic ? 0 : 1
}

// The revert is unconditional — normal exit, throw, SIGINT, SIGTERM. `revert`
// is spawnSync, so it is safe to call from an `exit` handler where nothing
// async can run.
process.on('exit', () => revert())
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

main().then(
  (code) => process.exit(code),
  (error) => {
    revert()
    process.stderr.write(`\nMDE sweep ABORTED: ${error?.stack ?? error}\n`)
    process.stderr.write(`src diff after revert: ${srcDiff() || '(empty)'}\n`)
    process.exit(2)
  },
)
