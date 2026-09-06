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

  // The overlay is always fully visible and always clickable under RM.
  const pill = page.locator('#projects .scene-meta-pill')
  await expect(pill).toBeVisible()
  await expect(page.locator('#projects .scene-meta')).toHaveCSS('opacity', '1')
  const firstHref = await pill.getAttribute('href')
  const firstBox = (await pill.boundingBox())!

  // Short of the segment midpoint (playhead ≈ 0.48): still card 0, nothing moves.
  await scrollToFraction(page, 0.44)
  const sameBox = (await pill.boundingBox())!
  expect(Math.abs(sameBox.x - firstBox.x)).toBeLessThanOrEqual(1.5)
  expect(Math.abs(sameBox.y - firstBox.y)).toBeLessThanOrEqual(1.5)

  // Past the midpoint (playhead 0.75): reduced motion has already snapped to
  // card 1 with no flight, so the pill is still fully usable.
  await scrollToFraction(page, 0.5)
  await expect(pill).toBeVisible()
  await expect(page.locator('#projects .scene-meta')).toHaveCSS('opacity', '1')
  await expect(pill).toHaveCSS('pointer-events', 'auto')

  // Next card settled: the project swaps, the overlay does not travel to get there.
  await scrollToFraction(page, 0.5556)
  expect(await pill.getAttribute('href')).not.toBe(firstHref)
  const swappedBox = (await pill.boundingBox())!
  expect(Math.abs(swappedBox.y - firstBox.y)).toBeLessThanOrEqual(1.5)
})
