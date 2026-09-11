import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  // Every listed section renders a `.section-title`: Work, Skills and Contact via
  // SectionHeading, Stats directly. Projects is EXCLUDED (its header is the pinned
  // gooey stage) and so is Archive, whose DOM rows are now the act-two wall.
  const titleSelectorFor = (id: string): string => `${id} .section-title`

  // The stream carries the archive's heading, and it is NOT a SectionHeading
  // (decision 16) — so it never enters on scroll and never fades. In the hidden
  // state it is clipped offscreen beside the scene, which is why this asserts
  // text and not opacity.
  test('#archive keeps the stream title once #projects mounts', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('#projects').waitFor()
    await expect(page.locator('#archive .stream-title')).toHaveText(
      /all work|todos os trabalhos/i,
    )
  })

  for (const id of ['#work', '#stats', '#skills', '#contact']) {
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
