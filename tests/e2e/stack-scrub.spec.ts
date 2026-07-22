import { test, expect } from '@playwright/test'

// Helper: scroll the window to an absolute fraction of the stack wrapper's
// scrollable range and settle a frame. Explicit-return evaluate body (no
// Framer/GSAP object escapes the boundary → no serialization hang).
// ABSOLUTE document Y via getBoundingClientRect().top + window.scrollY —
// `offsetTop` would be relative to the positioned `#projects` (.section is
// position:relative) and would land the scroll in the Hero (review blocker #1).
async function scrollToStackFraction(page: import('@playwright/test').Page, frac: number): Promise<void> {
  await page.evaluate((f) => {
    const wrap = document.querySelector('#projects .stack-scroll') as HTMLElement | null
    if (!wrap) return
    const start = wrap.getBoundingClientRect().top + window.scrollY
    const range = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: start + range * f, behavior: 'instant' as ScrollBehavior })
  }, frac)
  await page.waitForTimeout(160)
}

test.describe('selected-work scrub', () => {
  test('midpoints change the front project; reversing restores it', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('#projects').scrollIntoViewIfNeeded()

    // Settle-plateau start of segment 0 (front = project 1). The settled title
    // is read from the accessible-name span (.gooey-title-sr tracks frontIndex);
    // it is the review-mandated title assertion — href/meta alone would stay
    // green with a frozen or mis-wired gooey title.
    await scrollToStackFraction(page, 0.02)
    const hrefP0 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const metaP0 = await page.locator('#projects .stack-meta').innerText()
    const titleP0 = await page.locator('#projects .gooey-title-sr').textContent()

    // Settle-plateau of the next project (past the first segment's morph window).
    await scrollToStackFraction(page, 0.34)
    const hrefP1 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const metaP1 = await page.locator('#projects .stack-meta').innerText()
    const titleP1 = await page.locator('#projects .gooey-title-sr').textContent()
    expect(hrefP1).not.toBe(hrefP0)
    expect(metaP1).not.toBe(metaP0)
    expect(titleP1).not.toBe(titleP0)

    // Reverse back to the first plateau — the previous project is restored.
    await scrollToStackFraction(page, 0.02)
    const hrefBack = await page.locator('#projects .stack-card-link').getAttribute('href')
    const titleBack = await page.locator('#projects .gooey-title-sr').textContent()
    expect(hrefBack).toBe(hrefP0)
    expect(titleBack).toBe(titleP0)
  })

  test('front-card link navigates to the project page', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('#projects').scrollIntoViewIfNeeded()
    await scrollToStackFraction(page, 0.02)

    const href = await page.locator('#projects .stack-card-link').getAttribute('href')
    expect(href).toMatch(/^\/projects\//)
    await page.locator('#projects .stack-card-link').click()
    await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')))
  })
})
