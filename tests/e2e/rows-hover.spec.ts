import { test, expect } from '@playwright/test'

test('featured rows render as WorkRows and tint on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is desktop-only')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  const rows = page.locator('#projects .workrow')
  await expect(rows).toHaveCount(4)
  const title = rows.first().locator('.workrow-title')
  const before = await title.evaluate((el) => getComputedStyle(el).color)
  await rows.first().hover()
  await page.waitForTimeout(400)
  const after = await title.evaluate((el) => getComputedStyle(el).color)
  expect(after).not.toBe(before)
  expect(after).toBe('rgb(230, 77, 102)') // ACCENTS[0] #E64D66
})

test('rows finish their entrance even when hovered mid-stagger', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is desktop-only')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.mouse.move(10, 10)
  await page.locator('#projects').scrollIntoViewIfNeeded()
  const first = page.locator('#projects .workrow').first()
  const box = await first.boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
  const wraps = page.locator('#projects .workrow-wrap')
  const count = await wraps.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(wraps.nth(i)).toHaveCSS('opacity', '1', { timeout: 4000 })
  }
})
