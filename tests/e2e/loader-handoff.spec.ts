import { test, expect } from '@playwright/test'

test('loader hands off to hero with bbox-continuous word lines', async ({ page }) => {
  await page.goto('/')

  // Capture loader-end bbox of "shibuya" word (when underline is full)
  const loaderShibuya = page.locator('[data-loader-word="shibuya"]')
  await expect(loaderShibuya).toBeVisible({ timeout: 5000 })
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('[data-loader-progress]')
    return el ? Number(el.dataset.value) >= 1 : false
  })
  const beforeBox = await loaderShibuya.boundingBox()

  // Wait for loader to fully resolve
  await page.waitForFunction(() =>
    document.body.dataset.loaderState === 'done'
  )

  // After handoff, hero word in same on-screen location
  const heroShibuya = page.locator('[data-hero-word="shibuya"]')
  await expect(heroShibuya).toBeVisible()
  const afterBox = await heroShibuya.boundingBox()

  expect(beforeBox).not.toBeNull()
  expect(afterBox).not.toBeNull()
  expect(Math.abs(afterBox!.x - beforeBox!.x)).toBeLessThan(2)
  expect(Math.abs(afterBox!.y - beforeBox!.y)).toBeLessThan(2)
})

test('body scroll is locked while loader is visible', async ({ page }) => {
  await page.goto('/')

  // Loader is up — body should be marked loading and have overflow:hidden,
  // and a real wheel event must not advance scrollY.
  await expect(page.locator('[data-loader-panel]')).toBeVisible({ timeout: 5000 })

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

  // After loader resolves, body returns to its normal scrolling state.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  const overflowAfter = await page.evaluate(() =>
    getComputedStyle(document.body).overflow
  )
  expect(overflowAfter).not.toBe('hidden')
})

test('loader underline reaches scaleX=1 before any other timeline starts', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => {
    const el = document.querySelector<HTMLElement>('[data-loader-progress]')
    return el ? Number(el.dataset.value) >= 1 : false
  })
  // The hero supplementary content (eyebrow/role/desc) must NOT yet be visible at opacity 1
  const eyebrow = page.locator('[data-hero-eyebrow]')
  const opacity = await eyebrow.evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(opacity).toBeLessThan(0.95)
})
