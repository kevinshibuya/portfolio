#!/usr/bin/env node
// Task 8 (B2): does the scissor actually move `gpu.shaderMsPerFrame`?
//
//   node perf/task8-ab-sweep.mjs
//
// WHY THIS EXISTS RATHER THAN ONE CONTROL/BATCH PAIR. A single pair was run
// first and could not resolve anything: `gpu.busyMsPerFrame`,
// `gpu.decodeMsPerFrame` and `main.scriptMsPerSec` move in LOCKSTEP across
// invocations and span ~1.7x on UNCHANGED code (busy 0.96 -> 1.66 across five
// AC control runs of the same commit). The control leg happened to land at the
// bottom of that range and the batch leg at the top, so `--compare` reported
// four "DISAGREE"s that were drift, not effect.
//
// That is precisely the confound Task 7b's MDE sweep was designed against, and
// the design it settled on applies unchanged: INTERLEAVE, and judge each
// treatment against the mean of the two controls that bracket it in TIME. A
// block design lets drift masquerade as signal.
//
// Legs: C B C B C, idle-hero, `--runs 5` (the gating configuration). The
// mutation is the batch itself — the working copy of FluidWaves.tsx against
// `HEAD`'s — swapped by file copy rather than `git stash`, so an interrupted
// run cannot lose an uncommitted batch into the stash stack.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { bandFor, applyBandOverrides } from './lib/stats.mjs'
import { sampleMachineLoad } from './lib/load.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REPORTS_DIR = path.join(REPO_ROOT, 'perf', 'reports')
const TARGET = 'src/components/canvas/FluidWaves.tsx'
const DIST_ASSETS = path.join(REPO_ROOT, 'dist', 'assets')
const SCENARIO = 'idle-hero'
const METRIC = 'gpu.shaderMsPerFrame'
const RUNS = 5
/** Survives minification (a GL constant is a property access). */
const BATCH_MARKER = 'SCISSOR_TEST'

const log = (line = '') => process.stdout.write(`${line}\n`)

function sh(cmd, args, { allowFail = false } = {}) {
  const r = spawnSync(cmd, args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (!allowFail && r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} -> ${r.status}: ${r.stderr ?? ''}`)
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

const targetPath = path.join(REPO_ROOT, TARGET)
const BATCH_SRC = readFileSync(targetPath, 'utf8')
const CONTROL_SRC = sh('git', ['show', `HEAD:${TARGET}`]).stdout
if (BATCH_SRC === CONTROL_SRC) throw new Error('the working copy matches HEAD — there is no batch to measure')
if (!BATCH_SRC.includes(BATCH_MARKER)) throw new Error(`the working copy has no ${BATCH_MARKER} — the marker this sweep verifies the bundle with is gone`)

const restoreBatch = () => writeFileSync(targetPath, BATCH_SRC)

function bundleHasMarker() {
  if (!existsSync(DIST_ASSETS)) return false
  return sh('grep', ['-rl', BATCH_MARKER, DIST_ASSETS], { allowFail: true }).stdout.trim() !== ''
}

function assertAc(where) {
  if (!/AC Power/i.test(sh('pmset', ['-g', 'ps']).stdout)) throw new Error(`NOT on AC power ${where}`)
}

async function quietRig(leg) {
  for (let i = 1; i <= 6; i += 1) {
    const s = await sampleMachineLoad(`t8ab:${leg}`)
    if (!s.busy) return
    log(`  load guard busy (${i}/6): ${s.reasons.join('; ')}`)
    if (i === 6) throw new Error(`leg ${leg}: rig still busy — ${s.reasons.join('; ')}`)
    await new Promise((r) => setTimeout(r, 30_000))
  }
}

const reports = () => readdirSync(REPORTS_DIR).filter((f) => f.endsWith(`-${SCENARIO}.json`))

async function runLeg(name, isBatch) {
  log('')
  log(`=== leg ${name} (${isBatch ? 'BATCH — scissor on' : 'control — HEAD'}) ===`)
  await quietRig(name)
  assertAc(`before ${name}`)
  writeFileSync(targetPath, isBatch ? BATCH_SRC : CONTROL_SRC)

  const before = new Set(reports())
  const child = spawnSync('node', ['perf/run.mjs', SCENARIO, '--runs', String(RUNS)], { cwd: REPO_ROOT, stdio: 'inherit' })
  if (child.error) throw new Error(`leg ${name}: ${child.error.message}`)
  if (child.status !== 0 && child.status !== 1) throw new Error(`leg ${name}: runner exited ${child.status}`)
  assertAc(`after ${name}`)

  // The bundle is the artifact the browser ran; the source file is not.
  const marker = bundleHasMarker()
  if (marker !== isBatch) throw new Error(`leg ${name}: served bundle ${marker ? 'HAS' : 'lacks'} ${BATCH_MARKER} but this is a ${isBatch ? 'BATCH' : 'control'} leg`)

  const fresh = reports().filter((f) => !before.has(f))
  if (fresh.length !== 1) throw new Error(`leg ${name}: expected 1 new report, got ${fresh.length}`)
  const report = JSON.parse(readFileSync(path.join(REPORTS_DIR, fresh[0]), 'utf8'))
  if (report.rig.acPower !== true) throw new Error(`leg ${name}: the report says acPower=false`)
  const m = report.metrics[METRIC]
  if (!m) throw new Error(`leg ${name}: no ${METRIC}`)

  const extra = ['gpu.busyMsPerFrame', 'gpu.decodeMsPerFrame', 'main.scriptMsPerSec']
  const others = Object.fromEntries(extra.map((k) => [k, report.metrics[k]?.median ?? null]))
  log(`  ${name}: ${METRIC} ${m.median} (iqr ${m.iqr}) · ` + extra.map((k) => `${k.split('.')[1]} ${others[k]}`).join(' · '))
  return { name, isBatch, median: m.median, iqr: m.iqr, band: m.band, others, distIndexHash: report.build?.distIndexHash ?? null }
}

async function main() {
  log(`Task 8 interleaved A/B — ${SCENARIO} / ${METRIC} · legs C B C B C · --runs ${RUNS}`)
  if (sh('pgrep', ['-f', 'caffeinate -disu'], { allowFail: true }).stdout.trim() === '') {
    throw new Error('no `caffeinate -disu` running — arm it first')
  }
  assertAc('at start')

  const plan = [['C1', false], ['B1', true], ['C2', false], ['B2', true], ['C3', false]]
  const legs = []
  try {
    for (const [name, isBatch] of plan) legs.push(await runLeg(name, isBatch))
  } finally {
    restoreBatch()
  }

  const controls = legs.filter((l) => !l.isBatch)
  const batches = legs.filter((l) => l.isBatch)
  const range = Math.max(...controls.map((c) => c.median)) - Math.min(...controls.map((c) => c.median))

  log('')
  log(`control medians: ${controls.map((c) => c.median).join(', ')}  (range ${range.toFixed(4)})`)
  log(`control iqrs   : ${controls.map((c) => c.iqr).join(', ')}`)
  log('')
  log(`  ${'leg'.padEnd(6)}${'median'.padStart(10)}${'controls'.padStart(11)}${'delta'.padStart(10)}${'delta%'.padStart(9)}${'band'.padStart(9)}  verdict`)
  const rows = []
  for (const b of batches) {
    const i = legs.indexOf(b)
    const left = legs[i - 1]
    const right = legs[i + 1]
    const controlMean = (left.median + right.median) / 2
    const delta = b.median - controlMean
    // Same rule the MDE sweep used: the runner's own band arithmetic, from the
    // WIDER of the two bracketing controls, with the baseline override applied.
    const band = Math.max(
      applyBandOverrides(bandFor(left.median, left.iqr, 0), { maxBand: 0.1 }),
      applyBandOverrides(bandFor(right.median, right.iqr, 0), { maxBand: 0.1 }),
    )
    const separated = Math.abs(delta) > band
    rows.push({ leg: b.name, delta, band, separated })
    log(`  ${b.name.padEnd(6)}${b.median.toFixed(4).padStart(10)}${controlMean.toFixed(4).padStart(11)}${`${delta >= 0 ? '+' : ''}${delta.toFixed(4)}`.padStart(10)}${`${((delta / controlMean) * 100).toFixed(2)}%`.padStart(9)}${band.toFixed(4).padStart(9)}  ${separated ? (delta < 0 ? 'IMPROVEMENT' : 'REGRESSION') : 'within-band'}`)
  }

  log('')
  log('co-drifting metrics, control legs only (the confound this design absorbs):')
  for (const k of ['gpu.busyMsPerFrame', 'gpu.decodeMsPerFrame', 'main.scriptMsPerSec']) {
    log(`  ${k.padEnd(24)} ${controls.map((c) => c.others[k]).join(', ')}`)
  }
  log('')
  const mean = rows.reduce((s, r) => s + r.delta, 0) / rows.length
  log(`mean batch effect: ${mean >= 0 ? '+' : ''}${mean.toFixed(4)} ms · control-to-control range ${range.toFixed(4)} ms`)
  log(`src restored: ${sh('git', ['diff', '--stat', '--', TARGET]).stdout.trim().split('\n').pop() || '(clean — WRONG, the batch should be back)'}`)
  return 0
}

process.on('exit', () => restoreBatch())
main().then(
  (c) => process.exit(c),
  (e) => {
    restoreBatch()
    process.stderr.write(`\nA/B sweep ABORTED: ${e?.stack ?? e}\n`)
    process.exit(2)
  },
)
