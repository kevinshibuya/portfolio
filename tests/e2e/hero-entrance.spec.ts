import { test, expect } from '@playwright/test'

// Helper: read the vertical translate (matrix f-component) of a .hero-line.
// Identity/none → 0; mid-rise or hidden-below-the-clip → non-zero.
const lineTranslateY = (el: Element): number => {
  const tf = getComputedStyle(el).transform
  if (tf === 'none') return 0
  const m = tf.match(/matrix\(([^)]+)\)/)
  if (!m) return 0
  const parts = m[1].split(',').map((n) => parseFloat(n))
  return parts[5] ?? 0
}

test('monumental name rises to a settled, identity position after the loader', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1.hero-name')).toContainText('kevin', { timeout: 2000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  // The rise plays after 'done' (delay + 0.9s); wait for the name to settle at
  // identity transform (fully risen out of its clip mask).
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.hero-line')
      if (!el) return false
      const tf = getComputedStyle(el).transform
      if (tf === 'none') return true
      const m = tf.match(/matrix\(([^)]+)\)/)
      const f = m ? parseFloat(m[1].split(',')[5]) : 0
      return Math.abs(f) < 0.5
    },
    null,
    { timeout: 4000 },
  )
  const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
  expect(op).toBeGreaterThan(0.99)
  await expect(page.locator('.hero-role')).toContainText('senior front-end engineer · react/typescript')
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

// DISCRIMINATOR: the name is HIDDEN below its clip mask while the loader is up,
// and only rises after the explosion handoff. The retired "settled from first paint" build
// held .hero-line at identity during 'loading'; the re-introduced entrance
// holds it translated down (y:110%). This asserts the non-identity offset while
// the loader is present, which fails against a settled-from-first-paint build.
test('name is held below its clip mask while the loader is up (rises after)', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  const offset = await page.locator('.hero-line').first().evaluate(lineTranslateY)
  // 110% of a huge clamp(64px,12vw,200px) line → clearly non-trivial px offset.
  expect(Math.abs(offset)).toBeGreaterThan(20)
})

test('body scroll is locked while the loader is up, released after the explosion', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflowAfter).not.toBe('hidden')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('reduced motion: hero settled fast, no rise', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    expect(Date.now() - start).toBeLessThan(2500)
    // Instant path: the name is already at identity (no rise animation).
    const offset = await page.locator('.hero-line').first().evaluate(lineTranslateY)
    expect(Math.abs(offset)).toBeLessThan(0.5)
    const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    expect(op).toBeGreaterThan(0.99)
  })
})
