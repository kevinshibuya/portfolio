import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  // Every listed section renders a `.section-title` via SectionHeading: Work,
  // Skills and Contact. Projects is EXCLUDED: its header is the pinned scene.
  const titleSelectorFor = (id: string): string => `${id} .section-title`

  for (const id of ['#work', '#skills', '#contact']) {
    test(`${id} title transitions from hidden to visible on scroll`, async ({ page }) => {
      await page.goto('/')
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const titleSel = titleSelectorFor(id)
      const before = await page.locator(titleSel).first().evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      ).catch(() => null)
      // Scroll to section
      await page.locator(id).scrollIntoViewIfNeeded()
      // Title eventually fully visible
      await expect
        .poll(
          () => page.locator(titleSel).first().evaluate((el) =>
            parseFloat(getComputedStyle(el as HTMLElement).opacity)
          ),
          { timeout: 5_000 },
        )
        .toBeGreaterThan(0.99)
      void before
    })
  }
})
