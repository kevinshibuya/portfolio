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

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))

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

/** Loader gone, hero rise finished, hero canvas mounted and not fallen back. */
export async function waitForSettledHero(page) {
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', undefined, { timeout: 30_000 })
  await page.waitForSelector('[data-entrance="settled"]', { timeout: 30_000 })
  await page.waitForSelector('[data-canvas="fluid-waves"]', { timeout: 30_000 })
  const fallbacks = await page.locator('[data-testid="fluid-waves-fallback"]').count()
  if (fallbacks > 0) {
    throw new Error('hero WebGL context was lost (gradient fallback is showing) — environment failure, not a measurement')
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
  const countPerSecond = (name) => {
    const delta = (after[name] ?? 0) - (before[name] ?? 0)
    return windowSeconds > 0 ? delta / windowSeconds : 0
  }
  return {
    taskMsPerSec: perSecond('TaskDuration'),
    scriptMsPerSec: perSecond('ScriptDuration'),
    layoutMsPerSec: perSecond('LayoutDuration'),
    recalcStyleMsPerSec: perSecond('RecalcStyleDuration'),
    layoutsPerSec: countPerSecond('LayoutCount'),
    recalcStylesPerSec: countPerSecond('RecalcStyleCount'),
    heapUsedMb: (after.JSHeapUsedSize ?? 0) / (1024 * 1024),
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
