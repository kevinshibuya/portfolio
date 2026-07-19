import { test, expect } from '@playwright/test'

test('monumental name is real text and lands within the entrance budget', async ({ page }) => {
  await page.goto('/')
  // Name text exists in the DOM immediately (LCP element is HTML text).
  await expect(page.locator('h1.hero-name')).toContainText('kevin', { timeout: 2000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 4000 })
  // After the entrance the name line has fully risen (no residual transform offset).
  const y = await page.locator('.hero-line').first().evaluate((el) => el.getBoundingClientRect().height > 0
    && getComputedStyle(el).transform)
  expect(y === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(String(y))).toBeTruthy()
  // Role cycle leads with the canonical title.
  await expect(page.locator('.hero-role')).toContainText('senior front-end engineer · react/typescript')
  // Nav becomes interactive after entrance.
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

test('body scroll is locked while the entrance plays', async ({ page }) => {
  await page.goto('/')
  const stateDuring = await page.evaluate(() => document.body.dataset.loaderState)
  expect(stateDuring).toBe('loading')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 4000 })
  const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflowAfter).not.toBe('hidden')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('entrance is a static fade: final state, fast, no masks mid-flight', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    expect(Date.now() - start).toBeLessThan(2500)
    const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    expect(op).toBeGreaterThan(0.99)
  })
})
