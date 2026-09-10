import { expect, test, type Page } from '@playwright/test'

/**
 * Shared scene helpers.
 *
 * `testDir` is `tests/e2e` with the default `*.spec.ts` match, so this file is
 * not collected as a suite.
 *
 * Everything here scrolls by PLAYHEAD, never by a fraction of the wrapper. The
 * wrapper is no longer a fixed 550 svh: it is `sceneWrapperSvh(columns)` from
 * the frieze's own data, inline on the element and reported as `data-svh`. A
 * fraction therefore means something different per column count, while a
 * playhead means the same frame forever. Nothing in an e2e file hardcodes a
 * column count or a beat fraction; `data-svh` is on the page precisely so the
 * test reads what actually shipped.
 */

export const CANVAS = '#projects canvas[data-canvas="selected-work-scene"]'

/** Default settle after a scroll; reduced motion renders on demand and needs longer. */
const SETTLE_MS = 160
const SETTLE_REDUCED_MS = 220

/**
 * How long to allow for a full raster of the wall, by project.
 *
 * It covers the warm-up and every later redraw (a language switch, a settled
 * resize), because both rebuild all 171 cells across five panels.
 *
 * The warm-up compiles, uploads every texture and renders one off-screen frame,
 * and headless Chromium does all of it on SwiftShader. Its cost therefore scales
 * with the backing store, and `desktop-hidpi` is a 1904x1620 buffer carrying the
 * frieze's largest mask set (27.16 MiB at the 612.8 texels/world ceiling) against
 * 1269x720 and 6.00 MiB on `desktop-chromium` — about 3.4x the pixels.
 *
 * Measured on the reference machine, idle: warm lands at 21-25 s there against
 * 30 s here, headroom that disappears once earlier tests have loaded the machine.
 * That is a rasteriser cost, not a product regression, so the cap follows the
 * project rather than the suite loosening for everyone. A genuine warm failure
 * still fails; it just fails later on the one project that legitimately needs it.
 */
export function rasterBudgetMs(): number {
  return test.info().project.name === 'desktop-hidpi' ? 120_000 : 30_000
}

export async function openScene(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()
  // See the note in perf-budget.spec.ts: the scene compiles and uploads at idle
  // after the entrance, and only then is the scrub the steady state.
  await page
    .locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]')
    .waitFor({ timeout: rasterBudgetMs() })
}

/** The wrapper's height in svh, as the page rendered it. */
export async function readSvh(page: Page): Promise<number> {
  const svh = await page.evaluate(() => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement | null
    return wrapper ? Number(wrapper.dataset.svh) : NaN
  })
  expect(Number.isFinite(svh) && svh > 0, 'data-svh is on .scene-scroll').toBe(true)
  return svh
}

/**
 * Where act two's beats fall, in act-two progress `u`, derived from the extent
 * the page actually rendered.
 *
 * The plan draft's literal `1/7` and `3/14` are the FICTIONAL 22-column
 * fixture's boundaries. At the shipped 26 columns they are 0.125 and 0.1875, so
 * those stops would sample the middle of the release and the middle of the
 * approach and never test a boundary at all.
 */
export async function beats(page: Page): Promise<{ release: number; approach: number }> {
  const svh = await readSvh(page)
  const actTwo = svh - 550
  return { release: 100 / actTwo, approach: 150 / actTwo }
}

/**
 * Pixels in one PLAYHEAD unit.
 *
 * One playhead unit is 100 svh, so it is `offsetHeight / (svh / 100)` and NOT
 * `offsetHeight / svh` — that second one is a single svh, 100x short. At the
 * shipped extent it would make `scrollToPlayhead(page, 0)` scroll 1.5 % of a
 * viewport instead of 1.5 viewports, park the scene at the overture, and let
 * every "act one still scrubs" assertion pass against the wrong frame.
 */
async function unitPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement
    return wrapper.offsetHeight / (Number(wrapper.dataset.svh) / 100)
  })
}

/** Scroll so the scene's playhead reads `playhead`. Act one spans −1.5 to 3. */
export async function scrollToPlayhead(
  page: Page,
  playhead: number,
  options: { settle?: number } = {},
): Promise<void> {
  await page.evaluate((p) => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement | null
    if (!wrapper) return
    const top = wrapper.getBoundingClientRect().top + window.scrollY
    const unit = wrapper.offsetHeight / (Number(wrapper.dataset.svh) / 100)
    window.scrollTo({ top: top + (p + 1.5) * unit, behavior: 'instant' as ScrollBehavior })
  }, playhead)
  await page.waitForTimeout(options.settle ?? SETTLE_MS)
}

/**
 * Scroll into act two at progress `u` (0 = card four settled, 1 = the end).
 * `unit` stands in for the viewport height because 100 svh IS `innerHeight` in
 * headless Chromium, which has no dynamic toolbar.
 */
export async function scrollToActTwo(
  page: Page,
  u: number,
  options: { settle?: number } = {},
): Promise<void> {
  await page.evaluate((uu) => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement | null
    if (!wrapper) return
    const top = wrapper.getBoundingClientRect().top + window.scrollY
    const unit = wrapper.offsetHeight / (Number(wrapper.dataset.svh) / 100)
    const actTwoRange = wrapper.offsetHeight - unit - 4.5 * unit
    window.scrollTo({
      top: top + 4.5 * unit + uu * actTwoRange,
      behavior: 'instant' as ScrollBehavior,
    })
  }, u)
  await page.waitForTimeout(options.settle ?? SETTLE_MS)
}

export { SETTLE_REDUCED_MS, unitPx }
