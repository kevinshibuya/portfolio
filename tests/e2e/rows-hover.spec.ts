import { test, expect } from '@playwright/test'

test('work experience rows expand with aria-expanded', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#work').scrollIntoViewIfNeeded()
  const buttons = page.locator('#work .workrow button[aria-expanded]')
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true') // default open
  const rows = page.locator('#work .workrow--expandable')
  // panel content actually renders, not just the attribute flip
  await expect(rows.first().locator('.work-bullets li').first()).toBeVisible()
  await buttons.nth(1).click()
  await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'false') // single-open
  await expect(rows.nth(1).locator('.work-bullets li').first()).toBeVisible()
  await expect(rows.first().locator('.work-bullets li')).toHaveCount(0) // closed panel unmounts
})
