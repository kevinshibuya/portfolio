import { test, expect, type Page } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

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

  await scrollToFraction(page, 0.15)

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

  // Same segment: nothing moves.
  await scrollToFraction(page, 0.18)
  const sameBox = (await pill.boundingBox())!
  expect(Math.abs(sameBox.x - firstBox.x)).toBeLessThanOrEqual(1.5)
  expect(Math.abs(sameBox.y - firstBox.y)).toBeLessThanOrEqual(1.5)

  // Mid-segment: under RM there is no flight, so the pill stays usable.
  await scrollToFraction(page, 0.3)
  await expect(pill).toBeVisible()
  await expect(page.locator('#projects .scene-meta')).toHaveCSS('opacity', '1')
  await expect(pill).toHaveCSS('pointer-events', 'auto')

  // Next card: the project swaps, the overlay does not travel to get there.
  await scrollToFraction(page, 0.43)
  expect(await pill.getAttribute('href')).not.toBe(firstHref)
  const swappedBox = (await pill.boundingBox())!
  expect(Math.abs(swappedBox.y - firstBox.y)).toBeLessThanOrEqual(1.5)
})
