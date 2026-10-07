import { test, expect } from '@playwright/test'

// Stage reached via scrollIntoViewIfNeeded (not scrollTo(scrollHeight)): the
// below-the-fold sections are one Suspense boundary with a 100vh fallback, so
// an absolute scrollTo clamps before the stage mounts. scrollIntoViewIfNeeded
// retries as layout grows.

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('backdrop renders a static frame', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
    await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveAttribute('data-static', 'true', { timeout: 10000 })
  })
})
