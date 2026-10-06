import { test, expect } from '@playwright/test'
import { scrollToPlayhead } from './helpers/scene'

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
  await page.locator('#skills').waitFor()

  // Hero (dark): nav is not on-light.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(200)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)

  // Deep inside the pinned cream stage: nav flips on-light.
  // Playhead 0 is card one settled in the slot — inside #projects and inside
  // the light chapter. It replaced a 0.4 fraction of the wrapper, which now
  // means somewhere in act two's dolly rather than 'the projects section'.
  await scrollToPlayhead(page, 0)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // The whole light chapter holds the flip: the nav stays on-light all the way
  // from #projects to the bottom of #skills, and theme-color follows it so the
  // mobile browser chrome matches the cream sheet. Sampled at Work Experience,
  // the chapter's middle now that Archive's rows are the act-two wall.
  await scrollIntoSection(page, 'work', 0.3)
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
  // Wait for the lazy chunk before scrolling. scrollIntoSection() silently
  // no-ops when its target is absent (`if (!el) return`), so without this the
  // scroll below can land nowhere and the nav never flips — a pre-existing race
  // that shows up as an intermittent red at line 50 under machine load.
  await page.locator('#projects').waitFor()

  // Scrub into the cream Selected Work stage: nav flips on-light.
  await scrollToPlayhead(page, 0)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Follow the first project to its page (SPA nav, Header stays mounted)
  // through the keyboard path: the stream's case-study rows are the DOM's only
  // route into a project; the cards themselves live on the canvas (ADR 0011).
  // Playhead 0: card 0 settled in the slot.
  await scrollToPlayhead(page, 0)
  const link = page.locator('#archive .stream-item .workrow-link').first()
  const href = await link.getAttribute('href')
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')))

  // On the project page there is no chapter, and the page is fully ink. Both the
  // nav variant and theme-color must follow — this is the regression guard for
  // the stale-onLight bug found in review: the IO is disconnected in the same
  // commit that unmounts #chapter-light, so it never delivers a final
  // "not intersecting" and the flag has to be cleared explicitly.
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0B0E14')

  // Back to Home: the loader/route settle, then #projects remounts fresh.
  await page.goBack()
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Re-arm check: the observer watches #chapter-light, which remounts with the
  // lazy chunk; scrubbing back into #projects (still the wrapper's first child)
  // must flip the nav on-light again, not stay stuck dark on a detached observer.
  await scrollToPlayhead(page, 0)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F5F2EC')
})
