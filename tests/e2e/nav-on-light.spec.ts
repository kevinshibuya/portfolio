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

test('nav flips to on-light over the cream Selected Work zone and back to dark', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Hero (dark): nav is not on-light.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(200)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)

  // Deep inside the pinned cream stage: nav flips on-light.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Into the dark section below (Archive): nav returns to dark.
  await scrollIntoSection(page, 'archive', 0.3)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)
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

  // Re-arm check: scrubbing back into the (freshly-mounted) #projects node
  // must flip the nav on-light again, not stay stuck dark on a detached observer.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)
})
