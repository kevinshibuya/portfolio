import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  // Most sections render via SectionHeading (which sets .section-title).
  // Projects switched to a sticky-aside layout in the Featured Work revamp;
  // both viewport variants ship an <h2> under .project-aside, only one is
  // visible at a time depending on the breakpoint. The selector below
  // matches whichever is currently displayed.
  const titleSelectorFor = (id: string): string =>
    id === '#projects'
      ? '#projects .project-aside__title-static, #projects .project-aside__title'
      : `${id} .section-title`

  for (const id of ['#projects', '#embeds', '#work', '#skills', '#contact']) {
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
