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
 * THRESHOLDS, chosen from what was actually measured on this rig.
 *
 * | state observed                          | 1-min load | /8 cores | hottest proc |
 * |-----------------------------------------|-----------|----------|--------------|
 * | screensaver contamination (disagreed)   | 6.02      | 0.75     | 65-82%       |
 * | independent check, same session         | 4.51      | 0.56     | 68%          |
 * | quiesced — n=5 pair AGREED on 17/17     | 2.49      | 0.31     | 13.7%        |
 *
 * `HOT_PROCESS_PCT = 50` is the rule that actually did the work: every
 * contamination observed showed up as ONE process above 60% of a core, while
 * the clean state's hottest was 13.7%. 50 sits in the gap with room on both
 * sides.
 *
 * `LOAD_PER_CORE = 0.7` is a coarse backstop ONLY, and it is deliberately NOT
 * moved despite sitting above two of the three contaminated states above.
 *
 * REASONING, since the number looks wrong until you plot it: the two
 * populations OVERLAP on this axis. Contaminated readings were 0.50, 0.56 and
 * 0.75; clean readings were 0.31 and 0.53. A contaminated rig measured LOWER
 * (0.50) than a clean one (0.53). No threshold on 1-min load average can
 * separate them — lowering to 0.6 would not have caught the 0.50 and 0.56 cases
 * (both of which `HOT_PROCESS_PCT` caught on its own at 82% and 68%) while
 * bringing the limit within 0.07 of a normal working machine, which the ruling
 * explicitly forbids. So the honest position is not a better number, it is that
 * THIS RULE CANNOT DO THIS JOB: it stays as a catastrophic-load backstop and
 * `HOT_PROCESS_PCT` carries the guard.
 *
 * That makes two other things load-bearing rather than incidental: the
 * `detectorBlind` reporting below (if `ps` fails, the guard is effectively
 * gone, not merely degraded), and `foreignCpuPctOfMachine`, which DOES appear
 * to separate the populations (~26-57% contaminated vs ~6-7% quiet) and is
 * recorded on every run so a future task can threshold it on measured data.
 *
 * Note the known limit: the screensaver's real damage was GPU contention, and
 * neither number measures the GPU. It was caught here because it was also CPU-
 * hot. A purely-GPU-hot neighbour would still slip through — which is why the
 * top processes are always PRINTED, not just thresholded.
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

  // OBSERVABLE, NOT A THRESHOLD. Total foreign CPU as a share of all cores
  // separates the observed states far better than the load average does
  // (see the threshold note above): the contaminated moments summed to roughly
  // 20% of total capacity where a quiesced rig sits near 6-7%. It is recorded
  // and printed but deliberately NOT gated on, because the contaminated
  // readings above are reconstructed from top-process lists rather than
  // measured whole-table sums — calibrating a gate on reconstructed numbers is
  // exactly the mistake this file exists to prevent. Task 5 and 6 now collect
  // the real figure on every run; threshold it once there is measured data.
  const foreignCpuTotal = foreign.reduce((sum, row) => sum + (row.cpu ?? 0), 0)
  const foreignCpuPctOfMachine = Math.round((foreignCpuTotal / (cpuCount * 100)) * 1000) / 10

  const hottest = hot[0] ?? null
  const reasons = []
  if (loadPerCore > LOAD_PER_CORE) {
    reasons.push(`1-min load average ${oneMinute.toFixed(2)} on ${cpuCount} cores = ${loadPerCore.toFixed(2)}/core (limit ${LOAD_PER_CORE})`)
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
    busy: reasons.length > 0,
    reasons,
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
  if (!load.busy) return
  log('')
  log('  !! THE RIG IS BUSY — these numbers are measuring the machine, not the page.')
  for (const reason of load.reasons) log(`  !!   ${reason}`)
  log('  !! Measured during this campaign: a screensaver at 65-82% CPU made two consecutive')
  log('  !! idle-hero invocations disagree on every GPU metric. Quiesce the machine and re-run.')
  log('')
}
