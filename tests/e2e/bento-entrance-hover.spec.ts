import { test, expect } from '@playwright/test'

// Regression: hovering a bento card while the staggered whileInView entrance
// is in flight used to re-render Projects (setHovering for the cursor pill),
// which killed the in-flight child animations. With viewport.once the
// "visible" state never re-fired, leaving every card stuck at opacity 0.
// In practice any fast scroll sweeps the cards under the cursor, so this
// looked like "scroll too fast and the grid vanishes".
test('bento cards finish their entrance when hovered mid-stagger', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover interaction is desktop-only')

  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Park the mouse where the grid will land so the scroll alone doesn't hover.
  await page.mouse.move(10, 10)

  // Wheel toward the section until the entrance starts (first card fading in).
  const firstCard = page.locator('.bento-card').first()
  let entranceStarted = false
  for (let i = 0; i < 80 && !entranceStarted; i++) {
    await page.mouse.wheel(0, 300)
    await page.waitForTimeout(40)
    entranceStarted = await firstCard.evaluate((el) => {
      const o = parseFloat(getComputedStyle(el).opacity)
      return o > 0.01 && o < 0.95
    })
  }
  expect(entranceStarted, 'entrance animation should have started').toBe(true)

  // Mid-stagger, glide the cursor onto the first card (fires mouseenter).
  const box = await firstCard.boundingBox()
  if (!box) throw new Error('first bento card has no bounding box')
  const viewport = page.viewportSize()
  if (!viewport) throw new Error('viewport size unavailable')
  const x = box.x + box.width / 2
  const y = Math.min(box.y + box.height / 2, viewport.height - 40)
  await page.mouse.move(x, y, { steps: 6 })

  // Every card must still reach full visibility.
  const cards = page.locator('.bento-card')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect
      .poll(
        () => cards.nth(i).evaluate((el) => parseFloat(getComputedStyle(el).opacity)),
        { timeout: 5_000, message: `bento card ${i} should reach opacity 1` }
      )
      .toBeGreaterThan(0.99)
  }
})
