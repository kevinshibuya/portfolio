import { test, expect } from '@playwright/test'

test('hero shader pauses off-screen', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
  await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveAttribute('data-paused', 'true')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('hero shader renders a static frame (no loop)', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveAttribute('data-static', 'true')
  })
})
