import { test, expect } from '@playwright/test'

test('SVG name renders in place from frame 1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-name-word="kevin"]')).toBeVisible({ timeout: 2000 })
  await expect(page.locator('[data-name-word="shibuya"]')).toBeVisible()
})

test('loading cursor is mounted during the draw', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.loading-cursor')).toBeVisible({ timeout: 3000 })
})

test('handoff completes within 4s and nav availability dot is in DOM', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(
    () => document.body.dataset.loaderState === 'done',
    null,
    { timeout: 4000 }
  )
  // The dot is hidden by responsive CSS on viewports <= 720px (the entire
  // .nav-avail container is display:none on mobile), so we assert presence
  // in DOM rather than visibility.
  await expect(page.locator('.nav-avail-dot')).toHaveCount(1)
})

test('h1 hero name is visible after handoff', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(
    () => document.body.dataset.loaderState === 'done',
    null,
    { timeout: 4000 }
  )
  await expect(page.locator('[data-hero-word="kevin"]')).toBeVisible()
  await expect(page.locator('[data-hero-word="shibuya"]')).toBeVisible()
})

test('body scroll is locked while loader is active', async ({ page }) => {
  await page.goto('/')
  const stateDuring = await page.evaluate(() => document.body.dataset.loaderState)
  expect(stateDuring).toBe('loading')

  const overflowDuring = await page.evaluate(() =>
    getComputedStyle(document.body).overflow
  )
  expect(overflowDuring).toBe('hidden')

  await page.mouse.move(200, 200)
  await page.mouse.wheel(0, 1200)
  const scrollDuring = await page.evaluate(() => window.scrollY)
  expect(scrollDuring).toBe(0)

  await page.waitForFunction(
    () => document.body.dataset.loaderState === 'done',
    null,
    { timeout: 4000 }
  )
  const overflowAfter = await page.evaluate(() =>
    getComputedStyle(document.body).overflow
  )
  expect(overflowAfter).not.toBe('hidden')
})
