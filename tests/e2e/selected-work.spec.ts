import { test, expect } from '@playwright/test'
import { collectErrors, open } from './helpers/site'

// "view" beside the project in play is a heading set at the project name's
// size, not small text.
test('the view label is set at the size of the project name beside it', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await open(page, '/')

  const first = page.locator('#work .stack-item').first()
  await first.waitFor()
  await first.scrollIntoViewIfNeeded()
  const active = page.locator('#work .stack-item.is-active')
  await expect(active).toHaveCount(1)
  await expect(active.locator('.stack-view')).toBeVisible()

  const sizes = await active.evaluate((item) => ({
    view: getComputedStyle(item.querySelector('.stack-view') as Element).fontSize,
    name: getComputedStyle(item.querySelector('.stack-name') as Element).fontSize,
    p1: getComputedStyle(item.querySelector('.stack-line') as Element).fontSize,
  }))
  expect(sizes.view).toBe(sizes.name)
  expect(Number.parseFloat(sizes.view)).toBeGreaterThan(Number.parseFloat(sizes.p1))
  expect(errors).toEqual([])
})
