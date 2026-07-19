import { test, expect } from '@playwright/test'

test('page renders on the dark ink system with zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const color = await page.evaluate(() => getComputedStyle(document.body).color)
  expect(bg).toBe('rgb(11, 14, 20)')      // #0B0E14
  expect(color).toBe('rgb(245, 242, 236)') // #F5F2EC
  expect(errors).toEqual([])
})
