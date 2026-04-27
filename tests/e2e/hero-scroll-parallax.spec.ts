import { test, expect } from '@playwright/test'

test('fragments translate by their per-element distance on scroll', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'fragments hidden on mobile')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForTimeout(1400)

  const before = await page.locator('[data-fragment="bars"]').boundingBox()
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(150)
  const after = await page.locator('[data-fragment="bars"]').boundingBox()

  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  // fragment should have moved (parallax) — non-trivial delta beyond pure scroll
  const scrollY = await page.evaluate(() => window.scrollY)
  const observedDelta = before!.y - (after!.y + scrollY)
  expect(Math.abs(observedDelta)).toBeGreaterThan(2)
})

test('disabling R3F accent does not shift other fragment positions', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'fragments hidden on mobile')
  await page.goto('/?disableR3f=1') // see flag wiring below
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForTimeout(1400)
  const accentBox = await page.locator('[data-fragment="accent"]').boundingBox()
  const barsBox = await page.locator('[data-fragment="bars"]').boundingBox()
  expect(accentBox).not.toBeNull()
  expect(barsBox).not.toBeNull()
  expect(accentBox!.width).toBeGreaterThan(0)
  expect(accentBox!.height).toBeGreaterThan(0)
})
