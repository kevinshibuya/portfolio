// GPU cost via CDP tracing, with a `ps` degrade path.
//
// SOURCE DECISION (measured on this rig while building the runner; full record
// in perf/decisions.md):
//
//   Categories ['gpu', 'viz', 'toplevel'] yield, in the GPU process,
//   `ThreadControllerImpl::RunTask` (top-level, non-nesting -> summing them is
//   real busy time), `WebGL` (command-buffer decode -> the shader's own cost)
//   and `SkiaOutputSurfaceImplOnGpu::SwapBuffers` (presented frames).
//
//   Stability, two back-to-back 10s idle-hero windows:
//     gpu.busyMsPerFrame   1.707 vs 1.685  (1.3% apart)
//     gpu.webglMsPerFrame  0.593 vs 0.578  (2.5% apart)
//
//   Tracing overhead on the very frame times measured in the same window:
//     no trace  p50 16.70 / p95 17.50 / 601 frames
//     tracing   p50 16.70 / p95 17.50 / 600 frames
//   i.e. below the measurement's own resolution. Frame times and GPU cost can
//   therefore share one window instead of needing two passes.
//
// The brief permits falling back to GPU-process CPU time if trace events prove
// unstable. They did not, so the trace is the primary — but
// the fallback is implemented and fires automatically if a run yields no
// GPU-process trace events at all, and the source used is recorded in the
// report JSON either way. The harness never silently skips a metric.

export const TRACE_CATEGORIES = ['gpu', 'viz', 'toplevel']

const GPU_BUSY_EVENT = 'ThreadControllerImpl::RunTask'
const WEBGL_EVENT = 'WebGL'
const SWAP_EVENT = 'SkiaOutputSurfaceImplOnGpu::SwapBuffers'

/**
 * Trace exactly the measurement window: start, run the window, end. The trace
 * boundaries ARE the window boundaries, which sidesteps mapping the trace's
 * microsecond monotonic clock onto the page's `performance.now()` origin.
 */
export async function startTrace(browser) {
  const session = await browser.newBrowserCDPSession()
  const events = []
  session.on('Tracing.dataCollected', (payload) => {
    for (const event of payload.value) events.push(event)
  })
  const complete = new Promise((resolve) => session.once('Tracing.tracingComplete', resolve))
  await session.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: TRACE_CATEGORIES },
  })
  return {
    async stop() {
      await session.send('Tracing.end')
      await complete
      await session.detach().catch(() => {})
      return events
    },
  }
}

/** Aggregate GPU-process cost out of a trace slice. */
export function gpuFromTrace(events, windowSeconds) {
  let gpuPid = null
  for (const event of events) {
    if (event.ph === 'M' && event.name === 'process_name' && event.args?.name === 'GPU Process') {
      gpuPid = event.pid
      break
    }
  }
  if (gpuPid === null) return null

  let busyUs = 0
  let webglUs = 0
  let swaps = 0
  let sawAny = false
  for (const event of events) {
    if (event.pid !== gpuPid) continue
    sawAny = true
    if (event.ph !== 'X') continue
    if (event.name === GPU_BUSY_EVENT) busyUs += event.dur ?? 0
    else if (event.name === WEBGL_EVENT) webglUs += event.dur ?? 0
    else if (event.name === SWAP_EVENT) swaps += 1
  }
  if (!sawAny) return null

  return {
    source: 'trace:gpu-process',
    gpuPid,
    busyMs: busyUs / 1000,
    webglMs: webglUs / 1000,
    presentedFrames: swaps,
    busyMsPerSec: windowSeconds > 0 ? busyUs / 1000 / windowSeconds : 0,
    webglMsPerSec: windowSeconds > 0 ? webglUs / 1000 / windowSeconds : 0,
    busyMsPerFrame: swaps > 0 ? busyUs / 1000 / swaps : 0,
    webglMsPerFrame: swaps > 0 ? webglUs / 1000 / swaps : 0,
    presentedFps: windowSeconds > 0 ? swaps / windowSeconds : 0,
  }
}

/**
 * Cumulative per-process CPU time, read from Chrome itself via
 * `SystemInfo.getProcessInfo`.
 *
 * Chosen over walking a `ps` tree for two reasons that both matter here:
 * it is scoped to THIS browser's processes only (no chance of attributing
 * Kevin's own Chrome to a measurement), and `@playwright/test` does not expose
 * `browser.process()`, so there is no reliable root pid to walk from in the
 * first place.
 */
export async function sampleChromeProcesses(browserSession) {
  const { processInfo } = await browserSession.send('SystemInfo.getProcessInfo')
  const bucket = { renderer: 0, gpu: 0, browser: 0, total: 0, pids: { renderer: [], gpu: [], browser: [] } }
  for (const info of processInfo) {
    bucket.total += info.cpuTime
    if (info.type === 'renderer') {
      bucket.renderer += info.cpuTime
      bucket.pids.renderer.push(info.id)
    } else if (info.type === 'GPU') {
      bucket.gpu += info.cpuTime
      bucket.pids.gpu.push(info.id)
    } else if (info.type === 'browser') {
      bucket.browser += info.cpuTime
      bucket.pids.browser.push(info.id)
    }
  }
  return bucket
}

/**
 * Degrade path for GPU cost: the GPU process's own CPU time over the window,
 * from `SystemInfo.getProcessInfo`. Coarser than the trace (whole-process CPU,
 * no per-frame attribution) — which is exactly why it is the fallback, and why
 * its `source` string differs, so no downstream reader can mistake one for the
 * other.
 */
export function gpuFromProcessCpu(before, after, windowSeconds, presentedFramesGuess) {
  const busyMs = Math.max(0, (after.gpu - before.gpu) * 1000)
  return {
    source: 'cdp:SystemInfo-gpu-process-cpu',
    gpuPid: after.pids.gpu[0] ?? null,
    busyMs,
    webglMs: null,
    presentedFrames: presentedFramesGuess,
    busyMsPerSec: windowSeconds > 0 ? busyMs / windowSeconds : 0,
    webglMsPerSec: null,
    busyMsPerFrame: presentedFramesGuess > 0 ? busyMs / presentedFramesGuess : 0,
    webglMsPerFrame: null,
    presentedFps: windowSeconds > 0 ? presentedFramesGuess / windowSeconds : 0,
  }
}
