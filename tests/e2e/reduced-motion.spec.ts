import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// The Selected Work stage no longer renders a SectionHeading (.section-title moved
// into the gooey stage), and Archive's DOM rows are now the act-two wall. Assert the
// "titles never scroll-fade under RM" invariant against Work Experience, which keeps
// its SectionHeading.
test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#work').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#work .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
