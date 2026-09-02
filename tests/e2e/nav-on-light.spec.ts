import { test, expect } from '@playwright/test'

// Absolute document-Y scroll to a fraction INTO a section (no offsetTop).
async function scrollIntoSection(page: import('@playwright/test').Page, id: string, frac: number): Promise<void> {
  await page.evaluate((args) => {
    const el = document.querySelector('#' + args.id) as HTMLElement | null
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + el.offsetHeight * args.frac, behavior: 'instant' as ScrollBehavior })
  }, { id, frac })
  await page.waitForTimeout(200)
}

test('nav flips to on-light over the cream chapter (Projects → Skills) and back to dark', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Hero (dark): nav is not on-light.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(200)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)

  // Deep inside the pinned cream stage: nav flips on-light.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Archive is INSIDE the light chapter now (Plan B): the nav stays on-light
  // all the way from #projects to the bottom of #skills, and theme-color
  // follows the flip so the mobile browser chrome matches the cream sheet.
  await scrollIntoSection(page, 'archive', 0.3)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F5F2EC')

  // Still on-light at the chapter's last section.
  await scrollIntoSection(page, 'skills', 0.5)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Past the exit veil into the dark Contact/Footer stage: nav returns to dark.
  await scrollIntoSection(page, 'contact', 0.3)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0B0E14')
})

test('nav re-arms on-light after SPA back-nav from a project page', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Scrub into the cream Selected Work stage: nav flips on-light.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Follow the front card to its project page (SPA nav, Header stays mounted).
  const href = await page.locator('#projects .stack-card-link').getAttribute('href')
  await page.locator('#projects .stack-card-link').click()
  await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')))

  // Back to Home: the loader/route settle, then #projects remounts fresh.
  await page.goBack()
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Re-arm check: the observer watches #chapter-light, which remounts with the
  // lazy chunk; scrubbing back into #projects (still the wrapper's first child)
  // must flip the nav on-light again, not stay stuck dark on a detached observer.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)
})
