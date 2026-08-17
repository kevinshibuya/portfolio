// SYMPTOM: jank during the loader explosion and the hero text rise.
//
// Navigate cold and follow the entrance to its end, taking every landmark off
// the DOM the app already stamps (no app-code hooks):
//
//   firstDraw        first WebGL drawArrays  — the shader's first painted frame
//   explosionStart   first transform write on #loader g.loader-ks — the GSAP
//                    exit's anticipation beat starting
//   loaderDone       body[data-loader-state="done"] — this attribute has TWO
//                    writers that converge: `useScrollLockDuringEntrance` flips
//                    it when `entranceDone` resolves (the ~92% explosion
//                    handoff), and `main.tsx`'s finishLoader() flips it at 100%.
//                    The mark catches the FIRST, so `entrance.loaderDoneMs`
//                    means "the entrance gate resolved", not "the loader element
//                    was removed" — measured 2516ms against a computed handoff
//                    of ~2524ms, which confirms the reading. A wall-clock
//                    landmark, not a jank measure.
//   entranceSettled  [data-entrance="settled"] on the hero section
//
// The measured window is [explosionStart, entranceSettled]: the 45x SVG mask
// blow-through overlapping the Framer text rise, with the shader running under
// both. That overlap is where the jank was reported, and it is the one moment
// on this page where GSAP, Framer and WebGL are all live at once.
//
// NOTE the loader's fixed 1.2s savor dwell sits BEFORE explosionStart and is
// therefore outside the window by construction — `entrance.settledMs` still
// includes it, which is why that metric is a wall-clock landmark rather than a
// jank measure.

import {
  assertPageHealthy,
  launchRun,
  mainThreadDeltas,
  perfMetrics,
  scenarioUrl,
  sleep,
  waitForSettledHero,
} from '../lib/browser.mjs'
import { collect, framesIn, longTasksIn } from '../lib/instrument.mjs'
import { frameStats } from '../lib/stats.mjs'

export const name = 'load-entrance'
export const description = 'cold navigation through the loader explosion and hero text rise'

const SETTLE_TAIL_MS = 1500

export const metrics = {
  'entrance.firstShaderFrameMs': { unit: 'ms', lowerIsBetter: true, minBand: 25 },
  'entrance.explosionStartMs': { unit: 'ms', lowerIsBetter: true, minBand: 25 },
  'entrance.loaderDoneMs': { unit: 'ms', lowerIsBetter: true, minBand: 25 },
  'entrance.settledMs': { unit: 'ms', lowerIsBetter: true, minBand: 25 },
  'window.durationMs': { unit: 'ms', informational: true },
  'window.frame.p50Ms': { unit: 'ms', lowerIsBetter: true, minBand: 0.6 },
  'window.frame.p95Ms': { unit: 'ms', lowerIsBetter: true, minBand: 2, gates: false },
  'window.frame.maxMs': { unit: 'ms', lowerIsBetter: true, minBand: 6, gates: false },
  'window.frame.dropped': { unit: 'frames', lowerIsBetter: true, minBand: 2, gates: false },
  'window.frame.fps': { unit: 'fps', lowerIsBetter: false, minBand: 2 },
  'window.frame.nominalMs': { unit: 'ms', lowerIsBetter: true, minBand: 0.5 },
  'window.longTasks.count': { unit: '', lowerIsBetter: true, minBand: 1, gates: false },
  'window.longTasks.totalMs': { unit: 'ms', lowerIsBetter: true, minBand: 20, gates: false },
  'load.main.taskMs': { unit: 'ms', lowerIsBetter: true, minBand: 30 },
  'load.main.scriptMs': { unit: 'ms', lowerIsBetter: true, minBand: 25 },
  'load.main.layoutMs': { unit: 'ms', lowerIsBetter: true, minBand: 10 },
}

export async function run(ctx) {
  const session = await launchRun()
  try {
    await session.page.goto(scenarioUrl('/'), { waitUntil: 'commit' })
    const metricsBefore = await perfMetrics(session.client)

    await waitForSettledHero(session.page)

    // Read the main-thread counters AT settle, not after the tail dwell —
    // otherwise `load.main.*` would silently cover [commit, settled + tail]
    // while its own comment claimed [commit, settled].
    const metricsAfter = await perfMetrics(session.client)

    // Let the last rise frames and any trailing long task land in the buffers
    // before they are read out; the window itself ends at entranceSettled.
    await sleep(SETTLE_TAIL_MS)
    await assertPageHealthy(session, 'during the load-entrance measurement window')

    const collected = await collect(session.page)
    return summarize(collected, metricsBefore, metricsAfter, ctx.nominalFrameMs, session.consoleErrors)
  } finally {
    await session.close()
  }
}

function summarize(collected, metricsBefore, metricsAfter, nominalFrameMs, consoleErrors) {
  const marks = collected.marks
  const required = ['explosionStart', 'entranceSettled']
  for (const key of required) {
    if (marks[key] === undefined) {
      throw new Error(
        `load-entrance: the "${key}" landmark never fired. The entrance did not run as expected ` +
          `(reduced motion forced on? GSAP exit threw? loader markup changed?). Marks seen: ${JSON.stringify(marks)}`,
      )
    }
  }

  const windowStart = marks.explosionStart
  const windowEnd = marks.entranceSettled
  const windowSeconds = (windowEnd - windowStart) / 1000
  const frames = framesIn(collected.frames, windowStart, windowEnd)
  const stats = frameStats(frames, nominalFrameMs)
  const longTasks = longTasksIn(collected.longTasks, windowStart, windowEnd)

  // Whole-load main-thread cost: the delta is taken inside ONE document
  // (`before` is read after the navigation commit), so these are totals for
  // this page load rather than a rate.
  const loadSeconds = windowEnd / 1000
  const main = mainThreadDeltas(metricsBefore, metricsAfter, loadSeconds)

  const values = {
    'entrance.explosionStartMs': windowStart,
    'entrance.settledMs': windowEnd,
    'window.durationMs': windowEnd - windowStart,
    'window.frame.p50Ms': stats.p50,
    'window.frame.p95Ms': stats.p95,
    'window.frame.maxMs': stats.max,
    'window.frame.dropped': stats.dropped,
    'window.frame.fps': windowSeconds > 0 ? stats.count / windowSeconds : 0,
    'window.frame.nominalMs': stats.nominalMs,
    'window.longTasks.count': longTasks.length,
    'window.longTasks.totalMs': longTasks.reduce((sum, task) => sum + task.duration, 0),
    'load.main.taskMs': main.taskMsPerSec * loadSeconds,
    'load.main.scriptMs': main.scriptMsPerSec * loadSeconds,
    'load.main.layoutMs': main.layoutMsPerSec * loadSeconds,
  }
  const firstDraw = marks['firstDraw:fluid-waves'] ?? marks.firstDraw
  if (firstDraw !== undefined) values['entrance.firstShaderFrameMs'] = firstDraw
  if (marks.loaderDone !== undefined) values['entrance.loaderDoneMs'] = marks.loaderDone

  return {
    metrics: values,
    sources: { marks: 'dom-mutation+getContext-hook', frames: 'raf-ring-buffer' },
    meta: {
      marks,
      windowSeconds,
      framesInWindow: stats.count,
      frameBufferOverflowed: collected.overflowed,
      pageErrors: collected.errors,
      consoleErrors,
    },
  }
}
