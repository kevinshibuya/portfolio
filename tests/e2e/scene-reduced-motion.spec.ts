import { test, expect, type Page } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// Fractions of the 550svh scrub range: playhead = p · 4.5 − 1.5, so settled
// card k is at (k + 1.5) / 4.5 (0.3333 → card 0, 0.5556 → card 1) and the
// midpoint between them, where reduced motion snaps to the next card, is 0.4444.
async function scrollToFraction(page: Page, fraction: number): Promise<void> {
  await page.evaluate((frac) => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement | null
    if (!wrapper) return
    const top = wrapper.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: top + frac * (wrapper.offsetHeight - window.innerHeight),
      behavior: 'instant' as ScrollBehavior,
    })
  }, fraction)
  await page.waitForTimeout(220)
}

test('reduced motion keeps the pin and swaps cards without flight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()

  await scrollToFraction(page, 0.3333)

  // The section still pins.
  const stickyTop = await page.evaluate(
    () => document.querySelector('#projects .scene-sticky')!.getBoundingClientRect().top,
  )
  expect(Math.abs(stickyTop)).toBeLessThanOrEqual(4)

  // On demand, one static frame, and no SVG filter left over from the old title.
  await expect(
    page.locator('#projects canvas[data-canvas="selected-work-scene"]'),
  ).toHaveAttribute('data-static', 'true')
  await expect(page.locator('#projects svg filter')).toHaveCount(0)

  // The settled slot is reported on the canvas itself; there is no DOM overlay.
  const canvas = page.locator('#projects canvas[data-canvas="selected-work-scene"]')
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // The overture is a still frame at the top and absent once the cards show.
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  await scrollToFraction(page, 0)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  await scrollToFraction(page, 0.3333)
  await expect(canvas).toHaveAttribute('data-overture', 'false')

  // Short of the segment midpoint (playhead ≈ 0.48): still card 0.
  await scrollToFraction(page, 0.44)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // Past the midpoint (playhead 0.75): reduced motion has already snapped to
  // card 1 with no flight.
  await scrollToFraction(page, 0.5)
  await expect(canvas).toHaveAttribute('data-slot', '1')

  // Next card settled, then back: scroll is the playhead, exactly reversible.
  await scrollToFraction(page, 0.5556)
  await expect(canvas).toHaveAttribute('data-slot', '1')
  await scrollToFraction(page, 0.3333)
  await expect(canvas).toHaveAttribute('data-slot', '0')
})
