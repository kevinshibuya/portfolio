// Browser lifecycle for one scenario run: a fresh headed Chromium with a real
// GPU, a fresh profile, the instrumentation init script, and a CDP session.

import { chromium } from '@playwright/test'
import { INIT_SCRIPT } from './instrument.mjs'
import { BASE_URL } from './server.mjs'

export const VIEWPORT = { width: 1440, height: 900 }

/**
 * The pages run at deviceScaleFactor 2, not Playwright's default of 1.
 *
 * This is a deliberate measurement decision. `FluidWaves` sizes its backing
 * store at `min(devicePixelRatio, 1.5)`; at dSF 1 that cap never engages and
 * the harness would be measuring a shading load the reference rig never
 * actually runs — roughly 2.25x fewer fragments than Kevin's retina display
 * produces. The symptom being reproduced (heat, fans, battery) is a
 * fragment-cost symptom, so the DPR path has to match.
 */
export const DEVICE_SCALE_FACTOR = 2

/**
 * Task 1's determinism params, on every scenario load.
 *
 * `perf-seed=0.5` pins the shader's scatter seed. `perf-role=0` pins the hero
 * role line to the canonical title and stops the 5s cycle.
 *
 * NO `perf-freeze`: these scenarios measure LIVE animation. A frozen canvas
 * draws exactly one frame ever, which is the right tool for the pixel gate and
 * exactly the wrong one here.
 */
export const PERF_PARAMS = 'perf-seed=0.5&perf-role=0'

export const scenarioUrl = (pathAndQuery = '/') => {
  const joiner = pathAndQuery.includes('?') ? '&' : '?'
  return `${BASE_URL}${pathAndQuery}${joiner}${PERF_PARAMS}`
}

const LAUNCH_ARGS = [
  // Occlusion/backgrounding heuristics are the loudest source of "the numbers
  // changed and the code didn't" on a Mac: put another window in front of the
  // run and Chrome quietly throttles it. All three are measurement hygiene,
  // not performance tuning — none of them make the page faster. They are kept
  // under headless too: harmless, and they document the intent.
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion',
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
  // THESE TWO ARE WHY THE HARNESS CAN RUN HEADLESS AT ALL. Default headless on
  // this Mac falls back to SwiftShader — measured 2026-09-01, the renderer
  // string comes back "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device ...))"
  // and EXT_disjoint_timer_query is absent, i.e. software rasterisation, which
  // is exactly the trap the old headed-by-design rule was written to avoid.
  // WITH these flags headless reports "ANGLE (Apple, ANGLE Metal Renderer:
  // Apple M1)" and the GPU timer works with zero disjoint samples.
  '--use-angle=metal',
  '--enable-gpu',
]

/**
 * HEADLESS, since 2026-09-01 — and the reason the old rule said otherwise is
 * gone rather than ignored.
 *
 * The harness ran headed because headless meant SwiftShader. `--use-angle=metal`
 * removes that, verified on this rig by renderer string, by a working GPU
 * timer, and by measurement:
 *
 *   frame p50   16.700 ms headed vs 16.700 ms headless (identical, still vsync)
 *   frame count ~480 per 8 s in both (60 fps in both)
 *   GPU p50      5.32 ms headed vs 6.05 ms headless
 *
 * The GPU offset is real and reproducible (+12.3% and +13.7% on two alternated
 * A/B/A/B/A/B runs, every pair positive), so headed and headless numbers are
 * NOT interchangeable. That cost nothing here only because the `scenarios`
 * baseline had never been successfully written when the switch was made — both
 * attempts were refused. Anything recorded before this date is headed and must
 * not be compared against a headless run.
 *
 * The win is not cosmetic: headed opened a Chrome window per run — dozens per
 * batch — each stealing focus from whatever the owner was doing, which made
 * every long measurement session hostile to using the machine at all.
 */
const HEADLESS = true

/**
 * Launch one run's browser. `chromium.launch()` allocates a throwaway user
 * data dir per call, so every run starts from a cold profile with an empty
 * HTTP and shader cache.
 */
export async function launchRun() {
  const browser = await chromium.launch({ headless: HEADLESS, args: LAUNCH_ARGS })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  await page.addInitScript(INIT_SCRIPT)

  // Errors are TAGGED, because the two kinds are not equally disqualifying.
  // `pageerror` is an uncaught JS exception — the app did something it does not
  // do in a healthy run, so the measurement is void. A `console` error is often
  // just a failed subresource, which is a content problem the e2e suite and the
  // pixel gate own, not a reason to void a timing measurement.
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push({ kind: 'console', text: message.text() })
  })
  page.on('pageerror', (error) => consoleErrors.push({ kind: 'pageerror', text: String(error) }))

  const client = await context.newCDPSession(page)
  await client.send('Performance.enable')

  // Browser-level session: `Tracing` and `SystemInfo` are browser-scoped
  // domains, and `@playwright/test` exposes no `browser.process()` to reach
  // the OS pids any other way.
  const browserSession = await browser.newBrowserCDPSession()

  return {
    browser,
    browserSession,
    context,
    page,
    client,
    consoleErrors,
    close: async () => {
      await browser.close().catch(() => {})
    },
  }
}

/**
 * A run whose PAGE misbehaved, as opposed to a run that merely measured badly.
 *
 * Given its own type so the runner can tell it apart from a deterministic
 * scenario bug (a missing selector, a changed card count). Health failures are
 * transient by nature and get the discard-and-rerun treatment the spec
 * prescribes for a bad run; deterministic bugs must abort immediately, because
 * retrying them three times only wastes twenty minutes and hides the cause.
 */
export class MeasurementHealthError extends Error {
  /**
   * `kind` decides whether the runner may retry, and the split is the whole
   * point:
   *
   *   'context-loss'  the GPU dropped the WebGL context. A property of the RIG
   *                   and the driver — genuinely transient, retry it.
   *   'page-error'    an uncaught JS exception. A property of the CODE: the app
   *                   took a path it does not take in a healthy run. Retrying
   *                   that is how a Task 8 batch whose rAF callback throws on
   *                   1 frame in 5000 gets retried away and KEPT. Fail fast.
   */
  constructor(message, kind) {
    super(message)
    this.name = 'MeasurementHealthError'
    this.isHealthFailure = true
    this.kind = kind
    this.retryable = kind === 'context-loss'
  }
}

/**
 * Console errors that do NOT void a timing measurement.
 *
 * Scoped deliberately to failed subresource loads. A 404 is a content problem
 * that the e2e suite and the pixel gate already own; letting one transient
 * resource hiccup fail every run of every scenario turns this harness into a
 * campaign stall. Uncaught JS exceptions (`pageerror`) are NEVER allowlisted —
 * those mean the app took a code path it does not take in a healthy run.
 *
 * Allowlisted entries are still logged, every time, so they can never rot into
 * invisible background noise.
 */
const BENIGN_CONSOLE_PATTERNS = [
  /Failed to load resource/i,
  /net::ERR_/i,
  /favicon/i,
  /the server responded with a status of 4\d\d/i,
]

const isBenign = (entry) => entry.kind === 'console' && BENIGN_CONSOLE_PATTERNS.some((re) => re.test(entry.text))

/**
 * A WebGL context loss as it appears on the CONSOLE, which happens before the
 * React fallback swap lands in the DOM. Used to reclassify what would otherwise
 * look like an ordinary fatal console error.
 */
const GL_CONTEXT_LOSS_PATTERN = /context[\s_-]*lost|CONTEXT_LOST_WEBGL|WEBGL_lose_context|GPU process (?:crashed|exited)/i

/** Loader gone, hero rise finished, hero canvas mounted and not fallen back. */
export async function waitForSettledHero(session, log = () => {}) {
  // Back-compat: earlier call sites passed the bare page.
  const ctx = session.page ? session : { page: session, consoleErrors: [] }
  const { page } = ctx
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', undefined, { timeout: 30_000 })
  await page.waitForSelector('[data-entrance="settled"]', { timeout: 30_000 })

  // RACE the canvas against the fallback. On context loss `FluidWaves` REPLACES
  // the canvas with the gradient div, so waiting on the canvas alone would sit
  // for the full 30s and then throw a Playwright TimeoutError carrying no
  // `isHealthFailure` — turning a retryable cold-GPU hiccup at load (a very
  // plausible trigger: first shader compile on a cold GPU) into a hard abort of
  // the entire invocation.
  const canvasOrFallback = await Promise.race([
    page.waitForSelector('[data-canvas="fluid-waves"]', { timeout: 30_000 }).then(() => 'canvas'),
    page.waitForSelector('[data-testid="fluid-waves-fallback"]', { timeout: 30_000 }).then(() => 'fallback'),
  ])
  if (canvasOrFallback === 'fallback') {
    throw new MeasurementHealthError(
      'hero WebGL context was lost before the measurement window (the gradient fallback rendered ' +
        'instead of the canvas). Retryable environment failure, not a performance result.',
      'context-loss',
    )
  }

  await assertPageHealthy(ctx, 'before the measurement window', log)

  // Everything up to here is load noise. The post-window check judges only what
  // happened AFTER this point, so a navigation-time console error cannot fail
  // a window it never touched.
  ctx.healthCheckpoint = (ctx.consoleErrors ?? []).length
  ctx.pageErrorCheckpoint = await page.evaluate(() => (window.__PERF__?.errors ?? []).length).catch(() => 0)
}

/**
 * Fail the run if the page broke — checked BEFORE and, critically, AFTER every
 * measurement window.
 *
 * The after-check is the one that matters. If the hero's WebGL context is lost
 * mid-window the canvas unmounts and a flat gradient div takes over: GPU work
 * stops, `gpu.busyMsPerFrame` and `gpu.decodeMsPerFrame` COLLAPSE, and the run
 * exits 0 printing `improvement`. Under `--update-baseline` those collapsed
 * numbers become the reference, after which every healthy run reads as a
 * permanent regression — and during Tasks 7-12 a shader batch that destabilises
 * the context would read as the campaign's single biggest win.
 *
 * So this is an assertion, never a warning: a measurement taken while the thing
 * being measured was not running is not a slow measurement, it is not a
 * measurement at all. What the RUNNER does with the failure (discard and rerun,
 * up to a bounded budget) is a separate decision — see `runScenario`.
 */
export async function assertPageHealthy(session, when, log = () => {}) {
  // Gather BOTH facts before classifying. The old order checked the fallback
  // first and returned immediately, so a run that threw AND lost its context
  // was reported as a bare context loss and the exception never surfaced.
  const rawPageErrors = await session.page
    .evaluate(() => (window.__PERF__?.errors ?? []).slice())
    .catch(() => [])
  const pageErrors = rawPageErrors
    .slice(session.pageErrorCheckpoint ?? 0)
    .map((text) => ({ kind: 'pageerror', text: String(text) }))
  const consoleErrors = (session.consoleErrors ?? []).slice(session.healthCheckpoint ?? 0)

  const all = [...consoleErrors, ...pageErrors]
  const benign = all.filter(isBenign)
  const fatal = all.filter((entry) => !isBenign(entry))

  // Always visible, never silent — an allowlisted error is still a fact about
  // the run, and a failure must always name what caused it.
  for (const entry of benign) log(`  (ignored ${entry.kind}: ${entry.text.slice(0, 140)})`)

  let fallbacks = await session.page.locator('[data-testid="fluid-waves-fallback"]').count()

  // A context loss announces itself on the console BEFORE React re-renders the
  // canvas into the fallback div. Sampling the DOM once, in that gap, would
  // classify a genuinely transient GPU loss as a non-retryable page error and
  // hard-abort the whole invocation. If anything mentions a lost context, give
  // React a beat and look again rather than trusting a single sample.
  const mentionsContextLoss = fatal.some((entry) => GL_CONTEXT_LOSS_PATTERN.test(entry.text))
  if (fallbacks === 0 && mentionsContextLoss) {
    await sleep(400)
    fallbacks = await session.page.locator('[data-testid="fluid-waves-fallback"]').count()
  }

  const threw = fatal.some((entry) => entry.kind === 'pageerror')

  // CLASSIFICATION ORDER, and the middle rule is the load-bearing one:
  //
  //   1. fallback in the DOM  -> context-loss. The DOM is authoritative; the
  //      canvas really was replaced, whatever else also happened.
  //   2. no fallback, but the page THREW -> page-error, even if the exception
  //      text happens to contain "context lost". Matching the pattern across
  //      all fatal entries regardless of kind would let any uncaught exception
  //      whose message mentions a lost context take the retryable branch that
  //      Important 2 deliberately closed to `pageerror` — burning replacement
  //      budget and mislabelling a code fault as a rig fault.
  //   3. no fallback, didn't throw, but the CONSOLE said context lost ->
  //      context-loss. This is the real race the 400ms re-check exists for.
  //
  // Nothing here can be silently retried away and baselined either way:
  // `healthBlocker` forces exitCode 1 and refuses the baseline on any health
  // discard. This is about spending the budget correctly and labelling the
  // cause honestly.
  const consoleOnlyContextLoss = !threw && fatal.some((entry) => entry.kind === 'console' && GL_CONTEXT_LOSS_PATTERN.test(entry.text))
  const contextLost = fallbacks > 0 || consoleOnlyContextLoss

  if (fatal.length > 0) for (const entry of fatal) log(`  !! ${entry.kind}: ${entry.text.slice(0, 200)}`)

  if (contextLost) {
    const alsoThrew = fatal.filter((entry) => entry.kind === 'pageerror')
    throw new MeasurementHealthError(
      `hero WebGL context was lost ${when} (${fallbacks > 0 ? 'the gradient fallback is showing' : 'reported on the console'}). ` +
        'GPU metrics from this run would read as a large improvement and are discarded. ' +
        'This is an environment/stability failure, not a performance result.' +
        (alsoThrew.length > 0
          ? `\n  NOTE: the page ALSO threw ${alsoThrew.length} uncaught error(s) — retried as a context loss, but read these:\n  ` +
            alsoThrew.slice(0, 3).map((entry) => entry.text).join('\n  ')
          : ''),
      'context-loss',
    )
  }

  if (fatal.length > 0) {
    // Derive the kind from what actually happened. `page-error` carries the
    // claim "the app took a code path it does not take in a healthy run",
    // which is only true of an uncaught exception — asserting it over a bare
    // console.error would misattribute the failure.
    const kind = threw ? 'page-error' : 'console-error'
    const preamble = threw
      ? 'An uncaught page error is a statement about the CODE, not the rig, so this is NOT retried'
      : 'A non-benign console error is not attributable to the rig either, so this is NOT retried'
    throw new MeasurementHealthError(
      `page reported ${fatal.length} error(s) ${when} — the run is not a clean measurement. ${preamble}:\n  ` +
        fatal.slice(0, 5).map((entry) => `[${entry.kind}] ${entry.text}`).join('\n  '),
      kind,
    )
  }
}

/**
 * Measure the display's real frame cadence, on a blank page with nothing else
 * running. Called once per invocation; the result pins `nominalMs` for every
 * scenario's dropped-frame arithmetic (see `frameStats`).
 */
export async function measureRefresh() {
  const browser = await chromium.launch({ headless: HEADLESS, args: LAUNCH_ARGS })
  try {
    const context = await browser.newContext({ viewport: VIEWPORT })
    const page = await context.newPage()
    const deltas = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const stamps = []
          const tick = (t) => {
            stamps.push(t)
            if (stamps.length < 90) requestAnimationFrame(tick)
            else resolve(stamps.slice(1).map((s, i) => s - stamps[i]))
          }
          requestAnimationFrame(tick)
        }),
    )
    return deltas
  } finally {
    await browser.close().catch(() => {})
  }
}

/** CDP `Performance.getMetrics` as a flat name -> value map. */
export async function perfMetrics(client) {
  const { metrics } = await client.send('Performance.getMetrics')
  const out = {}
  for (const metric of metrics) out[metric.name] = metric.value
  return out
}

/**
 * Main-thread cost over a window, from `Performance.getMetrics` deltas.
 * Chrome reports these cumulative durations in SECONDS; everything below is
 * converted to ms-per-second-of-wall-clock so windows of different lengths
 * stay comparable.
 */
export function mainThreadDeltas(before, after, windowSeconds) {
  const perSecond = (name) => {
    const delta = (after[name] ?? 0) - (before[name] ?? 0)
    return windowSeconds > 0 ? (delta * 1000) / windowSeconds : 0
  }
  return {
    taskMsPerSec: perSecond('TaskDuration'),
    scriptMsPerSec: perSecond('ScriptDuration'),
    layoutMsPerSec: perSecond('LayoutDuration'),
    recalcStyleMsPerSec: perSecond('RecalcStyleDuration'),
    heapUsedMb: (after.JSHeapUsedSize ?? 0) / (1024 * 1024),
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
