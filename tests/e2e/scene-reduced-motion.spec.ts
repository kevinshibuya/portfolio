import { test, expect } from '@playwright/test'
import { scrollToPlayhead, CANVAS } from './helpers/scene'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

/** Reduced motion renders ON DEMAND, so every stop needs the longer settle. */
const SETTLE = { settle: 220 }

test('reduced motion keeps the pin and swaps cards without flight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()

  await scrollToPlayhead(page, 0, SETTLE)

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
  const canvas = page.locator(CANVAS)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // The overture is a still frame at the top and absent once the cards show.
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  await scrollToPlayhead(page, -1.5, SETTLE)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  await scrollToPlayhead(page, 0, SETTLE)
  await expect(canvas).toHaveAttribute('data-overture', 'false')

  // Short of the segment midpoint (playhead 0.48): still card 0.
  await scrollToPlayhead(page, 0.48, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // Past the midpoint (playhead 0.75): reduced motion has already snapped to
  // card 1 with no flight.
  await scrollToPlayhead(page, 0.75, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '1')

  // Next card settled, then back: scroll is the playhead, exactly reversible.
  await scrollToPlayhead(page, 1, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '1')
  await scrollToPlayhead(page, 0, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // The scene ends on card four, still static.
  await scrollToPlayhead(page, 3, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '3')
  await expect(canvas).toHaveAttribute('data-static', 'true')
})
