import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('reduced motion: loader resolves quickly and hero is final-state', async ({ page }) => {
  const start = Date.now()
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const ms = Date.now() - start
  expect(ms).toBeLessThan(1500) // generous; floor is 200 + paint
  const fragOp = await page.locator('[data-fragment="bars"]').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(fragOp).toBeGreaterThan(0.99)
})

test('reduced motion: shibuya hover does not scramble', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const word = page.locator('[data-hero-word="shibuya"]')
  await word.hover()
  await page.waitForTimeout(300)
  await expect(word).toHaveText('shibuya.')
})

test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
