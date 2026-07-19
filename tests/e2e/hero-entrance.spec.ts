import { test, expect } from '@playwright/test'

test('monumental name is real settled text with the canonical role', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1.hero-name')).toContainText('kevin', { timeout: 2000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  // Final-state assertion (passes pre- and post-Task-5 — NOT the discriminator).
  const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
  expect(op).toBeGreaterThan(0.99)
  await expect(page.locator('.hero-role')).toContainText('senior front-end engineer · react/typescript')
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

// DISCRIMINATOR for Task 5 (settled-from-first-paint). Computed opacity is 1
// throughout the retired cascade too, so opacity alone is a hollow gate. The
// real tell is the TRANSFORM: the retired GSAP entrance held .hero-line at
// yPercent:112 (a non-identity transform) while the loader was up, then rose it
// to 0. Settled-from-first-paint means .hero-line sits at identity transform
// even during 'loading'. This fails RED against pre-Task-5 code (non-identity
// translateY present) and passes only once the entrance timeline is deleted.
test('name is settled from first paint — identity transform while the loader is up', async ({ page }) => {
  await page.goto('/')
  // The min dwell (≥600ms) guarantees a ~1.5s 'loading' window; wait for the
  // stamp (waitForFunction throws if it is never observed) rather than a
  // race-prone immediate read. By the time 'loading' is observable, React has
  // committed and both the loader-lock effect and the (retired) Hero entrance
  // effect have run — so a lingering yPercent transform is already applied.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  const line = page.locator('.hero-line').first()
  const op = await line.evaluate((el) => parseFloat(getComputedStyle(el).opacity))
  expect(op).toBeGreaterThan(0.99)
  const transform = await line.evaluate((el) => getComputedStyle(el).transform)
  expect(transform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(transform)).toBeTruthy()
})

test('body scroll is locked while the loader is up, released after the bleed', async ({ page }) => {
  await page.goto('/')
  // Robustly observe the 'loading' stamp (throws if never seen) instead of a
  // race-prone immediate read, then wait for release.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflowAfter).not.toBe('hidden')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('reduced motion: hero settled fast, no bleed', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    expect(Date.now() - start).toBeLessThan(2500)
    const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    expect(op).toBeGreaterThan(0.99)
  })
})
