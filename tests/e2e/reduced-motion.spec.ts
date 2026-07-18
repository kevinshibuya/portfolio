import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('reduced motion: loader resolves quickly and hero is final-state', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const ms = Date.now() - start
  expect(ms).toBeLessThan(1500) // generous; floor is 200 + paint
  // The SVG name entrance resolves to its final ink-filled state immediately
  // under reduced motion — both words visible, no trace animation pending.
  await expect(page.locator('[data-name-word="kevin"]')).toBeVisible()
  await expect(page.locator('[data-name-word="shibuya"]')).toBeVisible()
})

test('reduced motion: byline portrait takes the static img fallback, no canvas', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#byline').scrollIntoViewIfNeeded()
  // The fallback predicate must route reduced-motion viewers to the pre-baked
  // duotone <img>; the live WebGL canvas must never mount (wiring regression
  // guard — the predicate itself is unit-covered).
  await expect(page.locator('#byline .byline-portrait img')).toBeVisible()
  await expect(page.locator('#byline canvas')).toHaveCount(0)
})

test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  // Projects (reverted to the bento grid) renders its title via
  // SectionHeading as `.section-title`, like every other section.
  const op = await page.locator('#projects .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
