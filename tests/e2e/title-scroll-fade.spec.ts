import { test, expect } from '@playwright/test'

test('section title is opaque when far below viewport top', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -200, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.95)
})

test('section title fades as it scrolls past top', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const titleLoc = page.locator('#projects .section-title')
  const handle = await titleLoc.elementHandle()
  // Step 1: scroll title into full-opacity view (top ~ +200) so IntersectionObserver
  // fires and useScrollFade's hasEntered gate opens.
  await page.evaluate((el) => {
    const r = (el as HTMLElement).getBoundingClientRect()
    window.scrollBy({ top: r.top - 200, behavior: 'instant' as ScrollBehavior })
  }, handle)
  await page.waitForTimeout(150)
  // Step 2: scroll past the top so title is at viewport y ≈ -40
  await page.evaluate((el) => {
    const r = (el as HTMLElement).getBoundingClientRect()
    // Scroll so element top is at viewport y = -40 (works within both desktop and mobile fade bands)
    window.scrollBy({ top: r.top + 40, behavior: 'instant' as ScrollBehavior })
  }, handle)
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.4)
  expect(op).toBeLessThan(0.7)
})
