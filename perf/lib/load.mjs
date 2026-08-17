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
 * `LOAD_PER_CORE = 0.7` is the coarse backstop for death-by-a-thousand-cuts
 * load that no single process accounts for. Deliberately NOT tighter: a
 * normally-busy Mac (editor, Spotify, Docker, a chat app) sits near 0.3-0.55
 * and must still be able to record a baseline, per the ruling.
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
export async function sampleMachineLoad() {
  const cpuCount = os.cpus().length || 1
  const [oneMinute, fiveMinute, fifteenMinute] = os.loadavg()
  const loadPerCore = oneMinute / cpuCount

  const protectedPids = await selfAncestry()
  const rows = await psTable()
  const hot = rows
    .filter((row) => !protectedPids.has(row.pid) && !OWN_PROCESS_PATTERN.test(row.command))
    .map((row) => ({ pid: row.pid, cpu: row.cpu ?? 0, command: shortName(row.command) }))
    .filter((row) => row.cpu > 0)
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 5)

  const hottest = hot[0] ?? null
  const reasons = []
  if (loadPerCore > LOAD_PER_CORE) {
    reasons.push(`1-min load average ${oneMinute.toFixed(2)} on ${cpuCount} cores = ${loadPerCore.toFixed(2)}/core (limit ${LOAD_PER_CORE})`)
  }
  if (hottest && hottest.cpu >= HOT_PROCESS_PCT) {
    reasons.push(`"${hottest.command}" is using ${hottest.cpu.toFixed(1)}% CPU (limit ${HOT_PROCESS_PCT}%)`)
  }

  return {
    cpuCount,
    loadAverage: { oneMinute, fiveMinute, fifteenMinute },
    loadPerCore: Math.round(loadPerCore * 1000) / 1000,
    topProcesses: hot,
    busy: reasons.length > 0,
    reasons,
    thresholds: { loadPerCore: LOAD_PER_CORE, hotProcessPct: HOT_PROCESS_PCT },
  }
}

const shortName = (command) => {
  const first = (command ?? '').split(' ')[0]
  return first.split('/').pop() || first
}

/** Always print the load; shout only when it is over a threshold. */
export function reportMachineLoad(load, log) {
  const top = load.topProcesses
    .slice(0, 3)
    .map((process) => `${process.command} ${process.cpu.toFixed(0)}%`)
    .join(' · ')
  log(
    `load: ${load.loadAverage.oneMinute.toFixed(2)} 1-min on ${load.cpuCount} cores ` +
      `(${load.loadPerCore.toFixed(2)}/core)${top ? ` · top: ${top}` : ''}`,
  )
  if (!load.busy) return
  log('')
  log('  !! THE RIG IS BUSY — these numbers are measuring the machine, not the page.')
  for (const reason of load.reasons) log(`  !!   ${reason}`)
  log('  !! Measured during this campaign: a screensaver at 65-82% CPU made two consecutive')
  log('  !! idle-hero invocations disagree on every GPU metric. Quiesce the machine and re-run.')
  log('')
}
