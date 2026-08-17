// SYMPTOM: battery drain with the tab open.
//
// A 60s park on the settled hero, measured two ways:
//
//   ALWAYS  cumulative renderer + GPU-process CPU time, read from Chrome via
//           CDP `SystemInfo.getProcessInfo`, as ms of CPU burned per second of
//           wall clock. Coarse, but it needs no privileges and it is the series
//           that stays continuous across the whole campaign.
//   WHEN GRANTED  `sudo -n powermetrics` package/CPU/GPU milliwatts — the real
//           energy number.
//
// Kevin has decided to grant passwordless sudo for powermetrics. Whether the
// grant is actually in place is probed at runtime, and the report records
// which source produced the numbers (`sources.power`). Recording BOTH when
// both are available is deliberate: it means the day the grant lands does not
// split the campaign's energy baseline into two incomparable halves.

import {
  assertPageHealthy,
  launchRun,
  mainThreadDeltas,
  perfMetrics,
  scenarioUrl,
  sleep,
  waitForSettledHero,
} from '../lib/browser.mjs'
import { collect, framesIn, now } from '../lib/instrument.mjs'
import { frameStats } from '../lib/stats.mjs'
import { sampleChromeProcesses } from '../lib/trace.mjs'
import { powermetricsAvailable, startPowermetrics } from '../lib/power.mjs'

export const name = 'battery-proxy'
export const description = '60s park on the hero, energy proxy via powermetrics or process CPU time'

const LEAD_MS = 3000
const PARK_MS = 60_000

export const metrics = {
  'cpu.rendererMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3, sourceKey: 'cpu' },
  'cpu.gpuProcessMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3, sourceKey: 'cpu' },
  'cpu.browserMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3, sourceKey: 'cpu' },
  'cpu.totalMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 5, sourceKey: 'cpu' },
  'main.taskMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3 },
  'power.cpuMw': { unit: 'mW', lowerIsBetter: true, minBand: 50, sourceKey: 'power' },
  'power.gpuMw': { unit: 'mW', lowerIsBetter: true, minBand: 50, sourceKey: 'power' },
  'power.packageMw': { unit: 'mW', lowerIsBetter: true, minBand: 80, sourceKey: 'power' },
  'frame.fps': { unit: 'fps', informational: true },
}

/**
 * Probed once per process, not once per run: five sudo probes per invocation
 * is noise in the log and, on a rig where the grant is missing, five prompts'
 * worth of stderr.
 */
let powerProbe = null

export async function run(ctx) {
  const { log } = ctx
  if (powerProbe === null) {
    powerProbe = await powermetricsAvailable()
    log(
      powerProbe.available
        ? '  power source: sudo -n powermetrics (real watts)'
        : `  power source: process CPU time — powermetrics unavailable (${powerProbe.reason})`,
    )
  }

  const session = await launchRun()
  try {
    await session.page.goto(scenarioUrl('/'), { waitUntil: 'commit' })
    await waitForSettledHero(session.page)
    await sleep(LEAD_MS)

    const power = powerProbe.available ? startPowermetrics(PARK_MS) : null
    const cpuBefore = await sampleChromeProcesses(session.browserSession)
    const metricsBefore = await perfMetrics(session.client)
    const windowStart = await now(session.page)

    await sleep(PARK_MS)

    const windowEnd = await now(session.page)
    const metricsAfter = await perfMetrics(session.client)
    const cpuAfter = await sampleChromeProcesses(session.browserSession)
    const powerSample = power ? await power.stop() : null

    await assertPageHealthy(session, 'during the battery-proxy measurement window')
    const collected = await collect(session.page)

    const windowSeconds = (windowEnd - windowStart) / 1000
    const frames = framesIn(collected.frames, windowStart, windowEnd)
    const stats = frameStats(frames, ctx.nominalFrameMs)
    const main = mainThreadDeltas(metricsBefore, metricsAfter, windowSeconds)

    const perSecond = (deltaSeconds) => (windowSeconds > 0 ? (deltaSeconds * 1000) / windowSeconds : 0)
    const values = {
      'cpu.rendererMsPerSec': perSecond(cpuAfter.renderer - cpuBefore.renderer),
      'cpu.gpuProcessMsPerSec': perSecond(cpuAfter.gpu - cpuBefore.gpu),
      'cpu.browserMsPerSec': perSecond(cpuAfter.browser - cpuBefore.browser),
      'cpu.totalMsPerSec': perSecond(cpuAfter.total - cpuBefore.total),
      'main.taskMsPerSec': main.taskMsPerSec,
      'frame.fps': windowSeconds > 0 ? stats.count / windowSeconds : 0,
    }

    let powerSource = 'cdp:SystemInfo-process-cpu-time'
    if (powerSample && powerSample.sampleCount > 0) {
      powerSource = 'powermetrics'
      if (powerSample.cpuMw !== null) values['power.cpuMw'] = powerSample.cpuMw
      if (powerSample.gpuMw !== null) values['power.gpuMw'] = powerSample.gpuMw
      if (powerSample.packageMw !== null) values['power.packageMw'] = powerSample.packageMw
    } else if (powerProbe.available) {
      // The probe said yes and the run produced nothing — loud, never silent.
      log('  !! powermetrics was available at probe time but yielded no samples this run; falling back to process CPU time')
      powerSource = 'cdp:SystemInfo-process-cpu-time (powermetrics yielded no samples)'
    }

    return {
      metrics: values,
      sources: { power: powerSource, cpu: 'cdp:SystemInfo.getProcessInfo' },
      meta: {
        windowSeconds,
        powerProbe,
        powerSampleCount: powerSample?.sampleCount ?? 0,
        cpuPids: cpuAfter.pids,
        framesInWindow: stats.count,
        pageErrors: collected.errors,
        consoleErrors: session.consoleErrors,
      },
    }
  } finally {
    await session.close()
  }
}
