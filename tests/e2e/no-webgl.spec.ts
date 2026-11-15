import { test, expect } from '@playwright/test'
import { collectErrors, disableWebgl, open } from './helpers/site'

// Without WebGL the paint cannot run: each paint canvas gives way to the still
// stand-in in the paint's colours, and the page renders as ever.
test('home renders with the paint’s still stand-in', async ({ page }) => {
  const errors = collectErrors(page)
  await disableWebgl(page)
  await open(page, '/')

  await expect(page.locator('h1.hero-name')).toBeVisible()
  await expect(page.locator('.paint-fallback[data-kind="hero"]')).toBeVisible()
  await expect(page.locator('canvas.paint-canvas')).toHaveCount(0)

  await page.locator('#contact').scrollIntoViewIfNeeded()
  await expect(page.locator('.paint-fallback[data-kind="footer"]')).toBeAttached()
  await expect(page.locator('canvas.paint-canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a project page renders without WebGL', async ({ page }) => {
  const errors = collectErrors(page)
  await disableWebgl(page)
  await open(page, '/projects/radar-legislativo')
  await expect(page.locator('h1.p-title')).toBeVisible()
  await expect(page.locator('canvas.paint-canvas')).toHaveCount(0)
  expect(errors).toEqual([])
})
