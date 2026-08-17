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
  // not performance tuning — none of them make the page faster.
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion',
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
]

/**
 * Launch one run's browser. `chromium.launch()` allocates a throwaway user
 * data dir per call, so every run starts from a cold profile with an empty
 * HTTP and shader cache.
 */
export async function launchRun() {
  const browser = await chromium.launch({ headless: false, args: LAUNCH_ARGS })
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
  constructor(message) {
    super(message)
    this.name = 'MeasurementHealthError'
    this.isHealthFailure = true
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

/** Loader gone, hero rise finished, hero canvas mounted and not fallen back. */
export async function waitForSettledHero(session, log = () => {}) {
  // Back-compat: earlier call sites passed the bare page.
  const ctx = session.page ? session : { page: session, consoleErrors: [] }
  const { page } = ctx
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', undefined, { timeout: 30_000 })
  await page.waitForSelector('[data-entrance="settled"]', { timeout: 30_000 })
  await page.waitForSelector('[data-canvas="fluid-waves"]', { timeout: 30_000 })
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
 * stops, `gpu.busyMsPerFrame` and `gpu.webglMsPerFrame` COLLAPSE, and the run
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
  const fallbacks = await session.page.locator('[data-testid="fluid-waves-fallback"]').count()
  if (fallbacks > 0) {
    throw new MeasurementHealthError(
      `hero WebGL context was lost ${when} (the gradient fallback is showing). ` +
        'GPU metrics from this run would read as a large improvement and are discarded. ' +
        'This is an environment/stability failure, not a performance result.',
    )
  }

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

  if (fatal.length > 0) {
    for (const entry of fatal) log(`  !! ${entry.kind}: ${entry.text.slice(0, 200)}`)
    throw new MeasurementHealthError(
      `page reported ${fatal.length} error(s) ${when} — the run is not a clean measurement:\n  ` +
        fatal.slice(0, 5).map((entry) => `[${entry.kind}] ${entry.text}`).join('\n  '),
    )
  }
}

/**
 * Measure the display's real frame cadence, on a blank page with nothing else
 * running. Called once per invocation; the result pins `nominalMs` for every
 * scenario's dropped-frame arithmetic (see `frameStats`).
 */
export async function measureRefresh() {
  const browser = await chromium.launch({ headless: false, args: LAUNCH_ARGS })
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
