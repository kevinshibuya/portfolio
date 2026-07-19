import { test, expect } from '@playwright/test'

test('loader shows the ks. window mark + corner meta, bleeds away, zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  // Loader present at first with the SVG ink mask and 3 glyph-window paths.
  await expect(page.locator('#loader svg.loader-ink')).toHaveCount(1)
  expect(await page.locator('#loader mask#loader-mask path').count()).toBe(3)
  await expect(page.locator('#loader .loader-meta')).toHaveCount(4)
  await expect(page.locator('#loader')).toContainText('kevin shibuya')
  // Bleed completes → loader removed, gate resolved.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  await expect(page.locator('#loader')).toHaveCount(0)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('reduced motion: loader fades (no bleed) and is removed', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('#loader')).toHaveCount(0)
  })
})
