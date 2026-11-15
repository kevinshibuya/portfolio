// Machine-load guard (ruling R10).
//
// WHY THIS EXISTS, empirically rather than theoretically. During this task's
// own evidence runs a screensaver (`legacyScreenSaver`) sat at 65-82% CPU on
// the measurement rig and two consecutive `idle-hero` invocations disagreed on
// every GPU metric. Independent checks during the same session caught
// `fseventsd` at 68-78% and `coreduetd` at 81.7%. A rig in that state does not
// produce a wrong-ish number, it produces a number about the screensaver.
//
// Task 5 records the ONE committed baseline that all six optimization batches
// are judged against. Recorded on a loaded rig, that baseline is inflated and
// every later batch reads as an improvement — systematic corruption of the
// whole campaign, in the direction that looks like success.
//
// So: warn always, and REFUSE `--update-baseline` on a busy rig, with --force
// as the deliberate escape hatch — the same shape already used for
// regressions, flagged outliers and blended sources.

import os from 'node:os'
import { psTable, selfAncestry } from './proc.mjs'

/**
 * THRESHOLDS, chosen from what was measured on this rig.
 *
 * THE EVIDENCE TABLE. Every row is a reading printed by this harness during
 * Task 3; the provenance column says where. `foreign CPU` is
 * `foreignCpuPctOfMachine` — whole-table, computed by this file.
 *
 * | state                                   | 1-min | /8 cores | hottest proc | foreign CPU | provenance |
 * |-----------------------------------------|-------|----------|--------------|-------------|------------|
 * | screensaver contamination (pair DISAGREED) | 6.02 | 0.75   | 65-82%       | not measured | round-2 evidence, `ps` triage |
 * | coreduetd spike                          | 4.02 | 0.50     | 81.7%        | not measured | round-3 calibration probe |
 * | independent check, same session          | 4.51 | 0.56     | fseventsd 68% | not measured | reviewer's own check |
 * | quiesced — n=5 pair AGREED 17/17         | 2.49 | 0.31     | 13.7%        | not measured | round-3, post-screensaver |
 * | quiet-enough — the n=5 pair that AGREED  | 4.24 | 0.53     | Discord 21%  | not measured | round-3 acceptance A/B |
 * | owner actively gaming                    | 8.32 | 1.04     | 66%          | 26.2%       | round-4 before-sample |
 * | owner actively gaming                    | 7.16 | 0.90     | 75%          | 55.1%       | round-4 after-sample |
 * | owner actively gaming (20 polls)         | 5.4-13.6 | 0.68-1.70 | 76-161%  | 26-67%      | round-4 quiesce poll |
 *
 * The 0.50 and 0.53 rows are the two that the overlap argument below rests on;
 * they are recorded here BECAUSE that argument previously cited numbers that
 * appeared in no table. `foreignCpuPctOfMachine` did not exist until round 4,
 * which is why the earlier rows cannot carry it.
 *
 * `HOT_PROCESS_PCT = 50` is the rule that does the work: every contaminated
 * state showed ONE process above 65% of a core, while the clean states' hottest
 * were 13.7% and 21%. 50 sits in the gap with room on both sides.
 *
 * `LOAD_PER_CORE = 0.7` is a coarse backstop ONLY and is deliberately NOT
 * moved, on two independent grounds:
 *
 *   1. It is unnecessary. All three contaminated states were caught by
 *      `HOT_PROCESS_PCT` on its own, at 82%, 68% and 65%.
 *   2. It cannot be made sufficient. The populations OVERLAP on this axis: a
 *      contaminated rig measured 0.50 while a clean one — the very pair whose
 *      17/17 agreement defines "clean" here — measured 0.53. No threshold
 *      separates 0.50 from 0.53, and 0.6 would sit 0.07 from a normal working
 *      Mac, which the ruling explicitly forbids.
 *
 * So the honest position is not a better number: THIS RULE CANNOT DO THIS JOB.
 * It stays a catastrophic-load backstop; `HOT_PROCESS_PCT` carries the guard.
 *
 * That makes two other things load-bearing rather than incidental:
 *
 *   - `detectorBlind` (below). If `ps` fails, the guard is effectively GONE,
 *     not merely degraded, so it refuses a baseline write rather than passing.
 *   - `foreignCpuPctOfMachine`. THE CANONICAL FIGURE, stated once here and
 *     cited (not restated) everywhere else: **contaminated measured 26-67%
 *     across 22 samples; no quiet-rig measurement of this field exists yet.**
 *     A ~7% quiet figure can be reconstructed from top-3 process lists, but it
 *     is an estimate, not a measurement, and is deliberately not treated as
 *     data. That is why the field is recorded and printed but NOT thresholded —
 *     and there is a second reason to wait: macOS `ps pcpu` is a
 *     lifetime-decaying average, so it would be an imperfect gate even with a
 *     complete table. Task 5/6 collect the real figure on every run.
 *
 * Known limit: the screensaver's real damage was GPU contention, and neither
 * threshold measures the GPU. It was caught because it was also CPU-hot. A
 * purely GPU-hot neighbour would still slip through — which is why the top
 * processes are always PRINTED, not merely thresholded.
 */
export const LOAD_PER_CORE = 0.7
export const HOT_PROCESS_PCT = 50

/** Harness-owned processes, which must not be counted against the rig. */
const OWN_PROCESS_PATTERN = /ms-playwright|chrome_crashpad|Google Chrome for Testing/i

/**
 * Sample ambient machine load. Called BEFORE any browser launches, so what it
 * reports is the environment the measurement is about to run in.
 */
export async function sampleMachineLoad(label = 'sample') {
  // WHICH END OF THE RUN THIS IS, derived from the label the callers already
  // pass, so no call site changes and `selftest-retry`'s structural regex on
  // `sampleMachineLoad('after')` keeps holding.
  //
  // It matters because `os.loadavg()` is SYSTEMWIDE and cannot be decomposed by
  // process. Every other term here excludes harness-owned processes (`mine`),
  // but the load average counts our own headed browsers and builds. At the END
  // of a 20-minute invocation that is mostly OUR footprint, so gating on it
  // there lets a clean run refuse itself. Measured 2026-09-01: a run was
  // refused at 1.00/core while the hottest FOREIGN process was 21% (limit 50)
  // and foreign CPU was 23.7% of the machine — nothing foreign was competing.
  // The term stays REPORTED at both ends and gating only at the start, where
  // the harness has not yet added anything.
  const phase = label === 'after' ? 'after' : 'before'
  const cpuCount = os.cpus().length || 1
  const [oneMinute, fiveMinute, fifteenMinute] = os.loadavg()
  const loadPerCore = oneMinute / cpuCount

  const protectedPids = await selfAncestry()
  const rows = await psTable()

  // `psTable` is built on `run()`, which never throws — a failed `ps` returns
  // an EMPTY table, which would sail through as "no hot processes" and silently
  // retire the rule that does almost all the work here. Blindness must be
  // reported as blindness, never as a clean bill of health.
  const detectorBlind = rows.length === 0

  const mine = (row) => protectedPids.has(row.pid) || OWN_PROCESS_PATTERN.test(row.command)
  const foreign = rows.filter((row) => !mine(row) && (row.cpu ?? 0) > 0)
  const hot = foreign
    .map((row) => ({ pid: row.pid, cpu: row.cpu ?? 0, command: shortName(row.command) }))
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 5)

  // OBSERVABLE, NOT A THRESHOLD. See the canonical figure and the reasoning in
  // the threshold block at the top of this file — do not restate the range
  // here, cite it there. Summary: recorded and printed on every run, never
  // gated on, because there is no quiet-rig measurement of this field yet and
  // `ps pcpu` is a lifetime-decaying average.
  const foreignCpuTotal = foreign.reduce((sum, row) => sum + (row.cpu ?? 0), 0)
  const foreignCpuPctOfMachine = Math.round((foreignCpuTotal / (cpuCount * 100)) * 1000) / 10

  const hottest = hot[0] ?? null
  const reasons = []
  const observations = []
  if (loadPerCore > LOAD_PER_CORE) {
    const line = `1-min load average ${oneMinute.toFixed(2)} on ${cpuCount} cores = ${loadPerCore.toFixed(2)}/core (limit ${LOAD_PER_CORE})`
    // Gating at the start, observed-only at the end — see the `phase` comment.
    if (phase === 'before') reasons.push(line)
    else observations.push(`${line} — NOT gating at end-of-run: includes this harness's own browsers and builds`)
  }
  if (hottest && hottest.cpu >= HOT_PROCESS_PCT) {
    reasons.push(`"${hottest.command}" is using ${hottest.cpu.toFixed(1)}% CPU (limit ${HOT_PROCESS_PCT}%)`)
  }
  if (detectorBlind) {
    reasons.push('`ps` returned nothing — the hot-process detector, which carries this guard, is BLIND')
  }

  return {
    label,
    sampledAt: new Date().toISOString(),
    cpuCount,
    loadAverage: { oneMinute, fiveMinute, fifteenMinute },
    loadPerCore: Math.round(loadPerCore * 1000) / 1000,
    topProcesses: hot,
    foreignCpuPctOfMachine,
    detectorBlind,
    phase,
    busy: reasons.length > 0,
    reasons,
    // Non-gating findings, printed but never refusing. Kept separate from
    // `reasons` so nothing can promote an observation to a refusal by accident.
    observations,
    thresholds: { loadPerCore: LOAD_PER_CORE, hotProcessPct: HOT_PROCESS_PCT },
  }
}

/**
 * The guard's verdict over a whole invocation: busy if the rig was busy at
 * EITHER end.
 *
 * A single sample at t=0 describes the machine before any measurement exists.
 * An `all --runs 5` invocation runs ~20 minutes, and the incident that motivated
 * this guard was a screensaver starting MID-run — precisely the onset a
 * pre-run sample cannot see. Without the after-sample an operator could quiesce
 * the machine, start `--update-baseline`, walk away, and have a contaminated
 * baseline written under a clean-looking load block stamped minutes before any
 * of the measurements it vouches for.
 */
export function combineMachineLoad(before, after) {
  const reasons = [
    ...before.reasons.map((reason) => `at start: ${reason}`),
    ...(after ? after.reasons.map((reason) => `at end: ${reason}`) : []),
  ]
  return { before, after: after ?? null, busy: reasons.length > 0, reasons }
}

/**
 * A readable process name. Splitting on the first space mangled every macOS
 * app bundle — `/Applications/Google Chrome.app/.../Google Chrome` came out as
 * "Google" — and this printed list is the guard's ONLY stated defence against
 * its own GPU blind spot, so a mangled name weakens exactly the fallback the
 * design leans on. Cut at the first argument flag instead, which preserves
 * paths containing spaces, then take the last path segment.
 */
const shortName = (command) => {
  const raw = (command ?? '').trim()
  if (!raw) return '?'
  const executable = raw.split(/\s+-{1,2}[A-Za-z]/)[0].trim() || raw
  const base = executable.split('/').pop()
  return (base || executable).slice(0, 60)
}

/** Always print the load; shout only when it is over a threshold. */
export function reportMachineLoad(load, log, when = '') {
  const top = load.detectorBlind
    ? 'UNAVAILABLE (ps returned nothing)'
    : load.topProcesses
        .slice(0, 3)
        .map((process) => `${process.command} ${process.cpu.toFixed(0)}%`)
        .join(' · ') || 'none above 0%'
  log(
    `load${when ? ` (${when})` : ''}: ${load.loadAverage.oneMinute.toFixed(2)} 1-min on ${load.cpuCount} cores ` +
      `(${load.loadPerCore.toFixed(2)}/core) · foreign CPU ${load.foreignCpuPctOfMachine}% of machine · top: ${top}`,
  )
  // Printed whether or not the run is refused: a non-gating finding that is
  // never shown is the same as no finding at all.
  for (const note of load.observations ?? []) log(`  ·  ${note}`)
  if (!load.busy) return
  log('')
  log('  !! THE RIG IS BUSY — these numbers are measuring the machine, not the page.')
  for (const reason of load.reasons) log(`  !!   ${reason}`)
  log('  !! Measured during this campaign: a screensaver at 65-82% CPU made two consecutive')
  log('  !! idle-hero invocations disagree on every GPU metric. Quiesce the machine and re-run.')
  log('')
}
