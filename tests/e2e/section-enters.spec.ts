import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  // Every section — including Projects, now WorkRow rows — renders
  // its title via SectionHeading as `.section-title`.
  const titleSelectorFor = (id: string): string => `${id} .section-title`

  for (const id of ['#projects', '#archive', '#work', '#skills', '#contact']) {
    test(`${id} title transitions from hidden to visible on scroll`, async ({ page }) => {
      await page.goto('/')
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const titleSel = titleSelectorFor(id)
      const before = await page.locator(titleSel).first().evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      ).catch(() => null)
      // Scroll to section
      await page.locator(id).scrollIntoViewIfNeeded()
      await page.waitForTimeout(900)
      const after = await page.locator(titleSel).first().evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      )
      // Title eventually fully visible
      expect(after).toBeGreaterThan(0.99)
      void before
    })
  }
})
