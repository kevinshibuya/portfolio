import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// Scroll the window to an absolute fraction of the stack wrapper's scrollable
// range. ABSOLUTE document Y via getBoundingClientRect().top + window.scrollY —
// `offsetTop` would be relative to the positioned `#projects` (.section is
// position:relative), which lands the scroll in the Hero (review blocker #1).
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

test('reduced motion: stage pins, no SVG filter, content swaps without flight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Enter the pin range FIRST — at scrollIntoViewIfNeeded(#projects) the sticky
  // child is still below the fold and top would read a few hundred px (review
  // blocker #2). Inside the range, sticky top must be ~0.
  await scrollToStackFraction(page, 0.02)

  // No gooey SVG filter is emitted at all under reduced motion.
  const filterCount = await page.locator('#projects .gooey-title-defs').count()
  expect(filterCount).toBe(0)

  // The sticky stage is pinned to the viewport top inside the pin range.
  const stickyTopWhilePinned = await page.evaluate(() => {
    const el = document.querySelector('#projects .stack-sticky') as HTMLElement | null
    if (!el) return { ok: false, top: NaN }
    return { ok: true, top: el.getBoundingClientRect().top }
  })
  expect(stickyTopWhilePinned.ok).toBe(true)
  expect(Math.abs(stickyTopWhilePinned.top)).toBeLessThan(4)

  // Front-card state at the first plateau.
  const firstHref = await page.locator('#projects .stack-card-link').getAttribute('href')
  const boxBefore = await page.locator('#projects .stack-card-link').boundingBox()

  // "No card flight": within the same segment (0.02 → 0.10, front swap happens
  // at ~0.167 under RM), the front card's geometry must not move at all — the
  // sticky stage is viewport-fixed and RM freezes every card transform.
  await scrollToStackFraction(page, 0.10)
  const boxWithin = await page.locator('#projects .stack-card-link').boundingBox()
  expect(boxWithin).not.toBeNull()
  expect(Math.abs(boxWithin!.x - boxBefore!.x)).toBeLessThan(1.5)
  expect(Math.abs(boxWithin!.y - boxBefore!.y)).toBeLessThan(1.5)
  expect(Math.abs(boxWithin!.width - boxBefore!.width)).toBeLessThan(1.5)

  // Cross the RM swap point: the front project changes (instant swap), and the
  // new front card sits at the SAME static geometry (swap, not flight).
  await scrollToStackFraction(page, 0.34)
  const secondHref = await page.locator('#projects .stack-card-link').getAttribute('href')
  expect(secondHref).not.toBe(firstHref)
  const boxAfterSwap = await page.locator('#projects .stack-card-link').boundingBox()
  expect(Math.abs(boxAfterSwap!.y - boxBefore!.y)).toBeLessThan(1.5)
})
