import { test, expect, type Page } from '@playwright/test'

// The console-clean mount checks, one per surface (ADR 0013). Each collector
// attaches before page.goto, so load-time errors are caught.
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  return errors
}

test('page renders on the dark ink system with zero console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const color = await page.evaluate(() => getComputedStyle(document.body).color)
  expect(bg).toBe('rgb(11, 14, 20)')      // #0B0E14
  expect(color).toBe('rgb(245, 242, 236)') // #F5F2EC
  expect(errors).toEqual([])
})

test('hero shader canvas mounts with zero console errors', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveCount(1)
  expect(errors).toEqual([])
})

// Stage reached via scrollIntoViewIfNeeded (not scrollTo(scrollHeight)): the
// below-the-fold sections are one Suspense boundary with a 100vh fallback, so
// an absolute scrollTo clamps before the stage mounts. scrollIntoViewIfNeeded
// retries as layout grows.
test('backdrop mounts lazily on approach; canvas budget is exactly 2', async ({ page }) => {
  const errors = collectConsoleErrors(page)
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(0)
  await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(1, { timeout: 10000 })
  // The scene made this a THREE-canvas page (ADR 0009). The invariant is no
  // longer a raw count: at most three canvases mounted, at most two LIVE, and
  // the scene's own canvas must be paused once the contact stage is in view.
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeLessThanOrEqual(3)
  const live = await page.locator('canvas:not([data-paused])').count()
  expect(live).toBeLessThanOrEqual(2)
  await expect(
    page.locator('#projects canvas[data-canvas="selected-work-scene"]'),
  ).toHaveAttribute('data-paused', 'true')
  expect(errors).toEqual([])
})
