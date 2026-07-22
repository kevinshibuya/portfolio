import { test, expect } from '@playwright/test'

// Stage reached via scrollIntoViewIfNeeded (not scrollTo(scrollHeight)): the
// below-the-fold sections are one Suspense boundary with a 100vh fallback, so
// an absolute scrollTo clamps before the stage mounts. scrollIntoViewIfNeeded
// retries as layout grows.

test('backdrop mounts lazily on approach; canvas budget is exactly 2', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(0)
  await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(1, { timeout: 10000 })
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeLessThanOrEqual(2)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('backdrop renders a static frame', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
    await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveAttribute('data-static', 'true', { timeout: 10000 })
  })
})
