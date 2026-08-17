// SYMPTOM: heat and fan spin-up while parked on the hero.
//
// Park on the settled hero for 30s and measure the middle 20s. The 5s of lead
// and 5s of tail are thrown away on purpose: the head still carries load work
// (chunk evaluation, font swap, first shader compile, Framer's entrance
// teardown) and the tail is where the browser's own idle heuristics start
// making decisions. What is left is the page doing nothing but painting the
// shader — which is the state Kevin's fans respond to.

import { launchRun, mainThreadDeltas, perfMetrics, scenarioUrl, sleep, waitForSettledHero } from '../lib/browser.mjs'
import { collect, framesIn, longTasksIn, now } from '../lib/instrument.mjs'
import { frameStats } from '../lib/stats.mjs'
import { gpuFromProcessCpu, gpuFromTrace, sampleChromeProcesses, startTrace } from '../lib/trace.mjs'

export const name = 'idle-hero'
export const description = 'park on the settled hero for 30s, measure the middle 20s'

const PARK_MS = 30_000
const LEAD_MS = 5_000
const WINDOW_MS = 20_000

export const metrics = {
  'frame.p50Ms': { unit: 'ms', lowerIsBetter: true, minBand: 0.4 },
  'frame.p95Ms': { unit: 'ms', lowerIsBetter: true, minBand: 0.8 },
  'frame.maxMs': { unit: 'ms', lowerIsBetter: true, minBand: 4 },
  'frame.fps': { unit: 'fps', lowerIsBetter: false, minBand: 1 },
  'frame.droppedPerSec': { unit: '1/s', lowerIsBetter: true, minBand: 0.25 },
  'frame.nominalMs': { unit: 'ms', informational: true },
  'longTasks.count': { unit: '', lowerIsBetter: true, minBand: 2 },
  'longTasks.totalMs': { unit: 'ms', lowerIsBetter: true, minBand: 20 },
  'main.taskMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3 },
  'main.scriptMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 2 },
  'main.layoutMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 1 },
  'main.recalcStyleMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 1 },
  'main.heapUsedMb': { unit: 'MB', lowerIsBetter: true, minBand: 2 },
  'gpu.busyMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.05 },
  'gpu.webglMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.03 },
  'gpu.busyMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 3 },
  'gpu.presentedFps': { unit: 'fps', lowerIsBetter: false, minBand: 1 },
}

export async function run(ctx) {
  const session = await launchRun()
  try {
    await session.page.goto(scenarioUrl('/'), { waitUntil: 'commit' })
    await waitForSettledHero(session.page)

    await sleep(LEAD_MS)

    const trace = await startTrace(session.browser)
    const cpuBefore = await sampleChromeProcesses(session.browserSession)
    const metricsBefore = await perfMetrics(session.client)
    const windowStart = await now(session.page)

    await sleep(WINDOW_MS)

    const windowEnd = await now(session.page)
    const metricsAfter = await perfMetrics(session.client)
    const cpuAfter = await sampleChromeProcesses(session.browserSession)
    const events = await trace.stop()

    await sleep(Math.max(0, PARK_MS - LEAD_MS - WINDOW_MS))

    const collected = await collect(session.page)
    return summarize({ collected, windowStart, windowEnd, metricsBefore, metricsAfter, events, cpuBefore, cpuAfter, ctx, consoleErrors: session.consoleErrors })
  } finally {
    await session.close()
  }
}

function summarize({ collected, windowStart, windowEnd, metricsBefore, metricsAfter, events, cpuBefore, cpuAfter, consoleErrors }) {
  const windowSeconds = (windowEnd - windowStart) / 1000
  const frames = framesIn(collected.frames, windowStart, windowEnd)
  const stats = frameStats(frames)
  const longTasks = longTasksIn(collected.longTasks, windowStart, windowEnd)
  const main = mainThreadDeltas(metricsBefore, metricsAfter, windowSeconds)

  const traced = gpuFromTrace(events, windowSeconds)
  const gpu = traced ?? gpuFromProcessCpu(cpuBefore, cpuAfter, windowSeconds, stats.count)

  const values = {
    'frame.p50Ms': stats.p50,
    'frame.p95Ms': stats.p95,
    'frame.maxMs': stats.max,
    'frame.fps': stats.count / windowSeconds,
    'frame.droppedPerSec': stats.dropped / windowSeconds,
    'frame.nominalMs': stats.nominalMs,
    'longTasks.count': longTasks.length,
    'longTasks.totalMs': longTasks.reduce((sum, task) => sum + task.duration, 0),
    'main.taskMsPerSec': main.taskMsPerSec,
    'main.scriptMsPerSec': main.scriptMsPerSec,
    'main.layoutMsPerSec': main.layoutMsPerSec,
    'main.recalcStyleMsPerSec': main.recalcStyleMsPerSec,
    'main.heapUsedMb': main.heapUsedMb,
    'gpu.busyMsPerFrame': gpu.busyMsPerFrame,
    'gpu.busyMsPerSec': gpu.busyMsPerSec,
    'gpu.presentedFps': gpu.presentedFps,
  }
  if (gpu.webglMsPerFrame !== null) values['gpu.webglMsPerFrame'] = gpu.webglMsPerFrame

  return {
    metrics: values,
    sources: { gpu: gpu.source },
    meta: {
      windowSeconds,
      framesInWindow: stats.count,
      presentedFrames: gpu.presentedFrames,
      traceEvents: events.length,
      frameBufferOverflowed: collected.overflowed,
      pageErrors: collected.errors,
      consoleErrors,
    },
  }
}
