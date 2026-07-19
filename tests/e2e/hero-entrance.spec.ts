import { test, expect } from '@playwright/test'

test('SVG hero name renders in place from frame 1', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-name-word="kevin"]')).toBeVisible({ timeout: 2000 })
  await expect(page.locator('[data-name-word="shibuya"]')).toBeVisible()
})

test('hero entrance completes within 4s and unlocks scroll', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(
    () => document.body.dataset.loaderState === 'done',
    null,
    { timeout: 4000 }
  )
  // After entrance, the nav becomes visible/interactive.
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

test('body scroll is locked while the hero entrance plays', async ({ page }) => {
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
