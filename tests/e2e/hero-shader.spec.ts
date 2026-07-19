import { test, expect } from '@playwright/test'

// Un-fixme'd in Task 4 when Hero mounts the canvas.
test('hero shader canvas mounts with zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveCount(1)
  expect(errors).toEqual([])
})

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
