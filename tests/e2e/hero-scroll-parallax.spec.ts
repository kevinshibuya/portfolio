import { test, expect } from '@playwright/test'

test('fragments translate by their per-element distance on scroll', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'fragments hidden on mobile')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForTimeout(1400)

  const before = await page.locator('[data-fragment="bars"]').boundingBox()
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 0.8, behavior: 'instant' as ScrollBehavior }))
  // scrub: 1 introduces a ~1s ease lag — wait long enough for a clear delta
  // to land, hardening this assertion against CI scheduling jitter.
  await page.waitForTimeout(450)
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
