import { test, expect } from '@playwright/test'

// The stage is reached with `scrollIntoViewIfNeeded`, not a one-shot
// `window.scrollTo(0, scrollHeight)`: the below-the-fold sections are a single
// Suspense boundary with a 100vh fallback, so before their chunks mount the
// document is only ~2 viewports tall and an absolute scrollTo clamps there,
// never reaching the stage. This bites under reduced motion, where the instant
// entrance resolves before the idle-warm mounts the chunks. scrollIntoViewIfNeeded
// retries as the layout grows — the same pattern reduced-motion.spec.ts uses.

test('lining-waves mounts lazily on approach; canvas budget is exactly 2', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  // Not yet approached: backdrop not mounted.
  await expect(page.locator('[data-canvas="lining-waves"]')).toHaveCount(0)
  await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-canvas="lining-waves"]')).toHaveCount(1, { timeout: 10000 })
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
    await expect(page.locator('[data-canvas="lining-waves"]')).toHaveAttribute('data-static', 'true', { timeout: 10000 })
  })
})
