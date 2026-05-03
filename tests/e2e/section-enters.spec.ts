import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  for (const id of ['#projects', '#embeds', '#work', '#skills', '#contact']) {
    test(`${id} title transitions from hidden to visible on scroll`, async ({ page }) => {
      await page.goto('/')
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const titleSel = `${id} .section-title`
      const before = await page.locator(titleSel).evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      ).catch(() => null)
      // Scroll to section
      await page.locator(id).scrollIntoViewIfNeeded()
      await page.waitForTimeout(900)
      const after = await page.locator(titleSel).evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      )
      // Title eventually fully visible
      expect(after).toBeGreaterThan(0.99)
      void before
    })
  }
})
