// SYMPTOM: jank scrolling from the hero, through the shader's cream dissolve,
// into the pinned Selected Work card stack.
//
// From the settled hero, one CDP-synthesized scroll gesture at a FIXED speed
// covering a distance derived from LIVE geometry — the same derivation the
// pixel gate uses for its `stage-arrival` golden — then a settle. A hardcoded
// pixel distance would silently re-aim at a different part of the page the
// first time a section's height changes.
//
// The gesture is a real wheel stream (`gestureSourceType: 'mouse'`), so it
// goes through Lenis exactly as a user's scroll does. Lenis then keeps easing
// after the gesture ends, which is why the window runs on until scrollY is
// stable rather than stopping when the gesture returns.
//
// The shader's sim clock is scroll-velocity-coupled BY DESIGN (~1.5x on steady
// scroll, capped 2x on a flick). This scenario therefore measures the shader
// running hot on purpose. That is the symptom, not noise in it.

import {
  assertPageHealthy,
  launchRun,
  mainThreadDeltas,
  perfMetrics,
  scenarioUrl,
  sleep,
  waitForSettledHero,
} from '../lib/browser.mjs'
import { collect, framesIn, gpuShaderMs, longTasksIn, now } from '../lib/instrument.mjs'
import { frameStats } from '../lib/stats.mjs'
import { gpuFromProcessCpu, gpuFromTrace, sampleChromeProcesses, startTrace } from '../lib/trace.mjs'

export const name = 'scroll-transition'
export const description = 'settled hero → fixed-speed scroll into the card stack → settle'

const PRE_DWELL_MS = 2000
/** Fixed gesture speed in px/s. Distance is derived; speed never is. */
const SCROLL_SPEED = 1200
/** Matches the pixel gate's STAGE_ARRIVAL_PROGRESS — the first card segment. */
const STAGE_ARRIVAL_PROGRESS = 0.04
const SETTLE_STABLE_MS = 500
const SETTLE_TIMEOUT_MS = 6000

export const metrics = {
  'frame.p50Ms': { unit: 'ms', lowerIsBetter: true, minBand: 0.5 },
  'frame.p95Ms': { unit: 'ms', lowerIsBetter: true, minBand: 1.5, gates: false },
  'frame.maxMs': { unit: 'ms', lowerIsBetter: true, minBand: 5, gates: false },
  'frame.dropped': { unit: 'frames', lowerIsBetter: true, minBand: 3, gates: false },
  'frame.fps': { unit: 'fps', lowerIsBetter: false, minBand: 2 },
  'frame.nominalMs': { unit: 'ms', lowerIsBetter: true, minBand: 0.5 },
  'longTasks.count': { unit: '', lowerIsBetter: true, minBand: 1, gates: false },
  'longTasks.totalMs': { unit: 'ms', lowerIsBetter: true, minBand: 20, gates: false },
  'gpu.busyMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.08, sourceKey: 'gpu' },
  'gpu.decodeMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.05, sourceKey: 'gpu' },
  // Real GPU execution time for the hero draw (EXT_disjoint_timer_query).
  //
  // minBand is the MEASURED unplanted leg-to-leg spread at this rig's own
  // scale: `gpu-timer-probe.mjs aaa 12` gave 5.4157 / 5.7829 / 5.7402 ms,
  // spread 0.3672 (6.5% of mean), on a quiet machine at 0.209 load/core.
  // An earlier 0.03 came from probe runs at deviceScaleFactor 1 — a
  // DIFFERENT quantity (smaller canvas), and it would have flagged every
  // single run as a regression.
  //
  // KNOWN LIMIT, not papered over: a single run cannot resolve the 2x
  // shader plant here (+0.3369 ms, inside the 0.3672 floor). The runner's
  // median-of-N is what has to close that gap, which is why Task 7b Step 5
  // puts the acceptance through `npm run perf` and not through the probe.
  'gpu.shaderMsPerFrame': { unit: 'ms', lowerIsBetter: true, minBand: 0.37, sourceKey: 'gpuTimer' },
  'gpu.busyMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 5, sourceKey: 'gpu' },
  'main.taskMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 5 },
  'main.scriptMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 4 },
  'main.layoutMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 2 },
  'main.recalcStyleMsPerSec': { unit: 'ms/s', lowerIsBetter: true, minBand: 2 },
  'scroll.distancePx': { unit: 'px', informational: true },
  'scroll.endY': { unit: 'px', informational: true },
  'scroll.windowMs': { unit: 'ms', informational: true },
}

export async function run(ctx) {
  const session = await launchRun()
  try {
    await session.page.goto(scenarioUrl('/'), { waitUntil: 'commit' })
    await waitForSettledHero(session, ctx.log)
    await sleep(PRE_DWELL_MS)

    const geometry = await session.page.evaluate((progress) => {
      const wrap = document.querySelector('#projects .stack-scroll')
      if (!(wrap instanceof HTMLElement)) return null
      const start = wrap.getBoundingClientRect().top + window.scrollY
      const range = wrap.offsetHeight - window.innerHeight
      return {
        target: start + range * progress,
        from: window.scrollY,
        cards: document.querySelectorAll('#projects .stack-card').length,
      }
    }, STAGE_ARRIVAL_PROGRESS)

    if (!geometry) throw new Error('#projects .stack-scroll not found — cannot derive the scroll distance')
    // Same silent coupling the pixel gate documents: the settle plateau is
    // `p <= 0.15 / (n - 1)`. At n = 4 that is 0.05 and 0.04 fits; a fifth
    // featured project would move the target without any other symptom.
    if (geometry.cards !== 4) {
      throw new Error(
        `scroll-transition is calibrated for 4 featured cards; found ${geometry.cards}. ` +
          'Recompute STAGE_ARRIVAL_PROGRESS against 0.15 / (n - 1) before trusting this scenario.',
      )
    }
    const distance = Math.round(geometry.target - geometry.from)
    if (distance <= 0) throw new Error(`derived a non-positive scroll distance (${distance}px) — page geometry is unexpected`)

    const trace = await startTrace(session.browser)
    const cpuBefore = await sampleChromeProcesses(session.browserSession)
    const metricsBefore = await perfMetrics(session.client)
    const windowStart = await now(session.page)

    await session.client.send('Input.synthesizeScrollGesture', {
      x: 720,
      y: 450,
      xDistance: 0,
      // CDP: positive yDistance scrolls UP. Down the page is negative.
      yDistance: -distance,
      speed: SCROLL_SPEED,
      gestureSourceType: 'mouse',
      repeatCount: 0,
    })
    const endY = await waitForScrollSettle(session.page)

    const windowEnd = await now(session.page)
    const metricsAfter = await perfMetrics(session.client)
    const cpuAfter = await sampleChromeProcesses(session.browserSession)
    const { events, traceSeconds } = await trace.stop()

    await assertPageHealthy(session, 'during the scroll-transition measurement window', ctx.log)
    const collected = await collect(session.page)

    return summarize({
      collected,
      windowStart,
      windowEnd,
      metricsBefore,
      metricsAfter,
      events,
      traceSeconds,
      cpuBefore,
      cpuAfter,
      nominalFrameMs: ctx.nominalFrameMs,
      distance,
      endY,
      target: geometry.target,
      consoleErrors: session.consoleErrors,
    })
  } finally {
    await session.close()
  }
}

/**
 * Lenis keeps easing after the gesture ends; wait for scrollY to stop moving.
 *
 * The predicate runs IN-PAGE against `__PERF__.lastScrollAt`, which a passive
 * scroll listener in the init script maintains. The earlier version polled
 * `page.evaluate(() => window.scrollY)` every 100ms — ~30 CDP round trips, each
 * executing a script inside the very measurement window whose
 * `main.taskMsPerSec` it then contributed to. A harness must not be a
 * meaningful share of what it measures.
 */
async function waitForScrollSettle(page) {
  await page
    .waitForFunction(
      (stableMs) => {
        const perf = window.__PERF__
        return perf.lastScrollAt !== null && performance.now() - perf.lastScrollAt >= stableMs
      },
      SETTLE_STABLE_MS,
      { timeout: SETTLE_TIMEOUT_MS, polling: 100 },
    )
    .catch(() => {})
  return page.evaluate(() => window.scrollY)
}

function summarize({ collected, windowStart, windowEnd, metricsBefore, metricsAfter, events, traceSeconds, cpuBefore, cpuAfter, nominalFrameMs, distance, endY, target, consoleErrors }) {
  const windowSeconds = (windowEnd - windowStart) / 1000
  const frames = framesIn(collected.frames, windowStart, windowEnd)
  const stats = frameStats(frames, nominalFrameMs)
  const longTasks = longTasksIn(collected.longTasks, windowStart, windowEnd)
  const main = mainThreadDeltas(metricsBefore, metricsAfter, windowSeconds)

  const traced = gpuFromTrace(events, traceSeconds)
  const gpu = traced ?? gpuFromProcessCpu(cpuBefore, cpuAfter, windowSeconds, stats.count)

  const values = {
    'frame.p50Ms': stats.p50,
    'frame.p95Ms': stats.p95,
    'frame.maxMs': stats.max,
    'frame.dropped': stats.dropped,
    'frame.fps': windowSeconds > 0 ? stats.count / windowSeconds : 0,
    'frame.nominalMs': stats.nominalMs,
    'longTasks.count': longTasks.length,
    'longTasks.totalMs': longTasks.reduce((sum, task) => sum + task.duration, 0),
    'gpu.busyMsPerFrame': gpu.busyMsPerFrame,
    'gpu.busyMsPerSec': gpu.busyMsPerSec,
    'main.taskMsPerSec': main.taskMsPerSec,
    'main.scriptMsPerSec': main.scriptMsPerSec,
    'main.layoutMsPerSec': main.layoutMsPerSec,
    'main.recalcStyleMsPerSec': main.recalcStyleMsPerSec,
    'scroll.distancePx': distance,
    'scroll.endY': endY,
    'scroll.windowMs': windowEnd - windowStart,
  }
  if (gpu.decodeMsPerFrame !== null) values['gpu.decodeMsPerFrame'] = gpu.decodeMsPerFrame
  // An absent extension or an empty window yields null, and the metric goes
  // MISSING rather than reporting a zero that would read as a free shader.
  const shader = gpuShaderMs(collected.gpu, 'fluid-waves', windowStart, windowEnd)
  if (shader.p50Ms !== null) values['gpu.shaderMsPerFrame'] = shader.p50Ms

  return {
    metrics: values,
    sources: {
      gpu: gpu.source,
      gpuTimer: shader.n ? 'webgl1:EXT_disjoint_timer_query@fluid-waves' : 'unavailable',
      scroll: `cdp:synthesizeScrollGesture@${SCROLL_SPEED}px/s`,
    },
    meta: {
      windowSeconds,
      traceSeconds: gpu.traceSeconds ?? null,
      scrollTarget: target,
      scrollEndY: endY,
      scrollOvershootPx: Math.round(endY - target),
      framesInWindow: stats.count,
      presentedFrames: gpu.presentedFrames,
      traceEvents: events.length,
      frameBufferOverflowed: collected.overflowed,
      // Sample count and discarded-query count travel WITH the number: a
      // thin window or a preempted GPU has to be visible to whoever reads it.
      gpuTimerSamples: shader.n,
      gpuTimerDisjointDiscarded: shader.disjoint,
      gpuTimerMissingOn: collected.gpu?.missing ?? [],
      pageErrors: collected.errors,
      consoleErrors,
    },
  }
}
