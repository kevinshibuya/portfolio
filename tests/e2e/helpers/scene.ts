import type { Page } from '@playwright/test'

/**
 * Shared scene helpers.
 *
 * `testDir` is `tests/e2e` with the default `*.spec.ts` match, so this file is
 * not collected as a suite.
 *
 * Everything here scrolls by PLAYHEAD, never by a fraction of the wrapper. The
 * wrapper's height is inline on the element and reported as `data-svh`, so the
 * helpers read what actually shipped instead of hardcoding 550: a playhead
 * means the same frame whatever the wrapper's height.
 */

export const CANVAS = '#projects canvas[data-canvas="selected-work-scene"]'

/** Default settle after a scroll; reduced motion renders on demand and needs longer. */
const SETTLE_MS = 160
const SETTLE_REDUCED_MS = 220

/**
 * How long to allow for the scene's warm-up. It compiles, uploads every
 * texture and renders one off-screen frame, and headless Chromium does all of
 * it on SwiftShader.
 */
const WARM_BUDGET_MS = 30_000

export async function openScene(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()
  // See the note in perf-budget.spec.ts: the scene compiles and uploads at idle
  // after the entrance, and only then is the scrub the steady state.
  await page
    .locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]')
    .waitFor({ timeout: WARM_BUDGET_MS })
}

/**
 * Pixels in one PLAYHEAD unit.
 *
 * One playhead unit is 100 svh, so it is `offsetHeight / (svh / 100)` and NOT
 * `offsetHeight / svh` — that second one is a single svh, 100x short. It would
 * make `scrollToPlayhead(page, 0)` scroll 1.5 % of a viewport instead of 1.5
 * viewports, park the scene at the overture, and let every "the corridor
 * scrubs" assertion pass against the wrong frame.
 */
async function unitPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement
    return wrapper.offsetHeight / (Number(wrapper.dataset.svh) / 100)
  })
}

/** Scroll so the scene's playhead reads `playhead`. The scene spans −1.5 to 3. */
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

export { SETTLE_REDUCED_MS, unitPx }
