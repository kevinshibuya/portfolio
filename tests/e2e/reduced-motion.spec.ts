import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// The Selected Work stage no longer renders a SectionHeading (.section-title moved
// into the gooey stage). Assert the "titles never scroll-fade under RM" invariant
// against Archive, which keeps its SectionHeading in both plans.
test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#archive').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#archive .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
