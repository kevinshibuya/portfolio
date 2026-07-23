import { test, expect } from '@playwright/test'

test('hero grows past 100svh and melts to the page via the shader cream dissolve', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // The hero section is stretched to ~130svh: rendered height clearly exceeds the
  // viewport (100svh). The transparent→cream melt below the zone is now drawn by
  // the shader itself (cream dissolve), not a CSS .hero-veil element — so we
  // assert the canvas covers the full section and carries the dissolve marker.
  const geo = await page.evaluate(() => {
    const hero = document.querySelector('#top') as HTMLElement | null
    const zone = document.querySelector('#top .hero-zone') as HTMLElement | null
    const canvas = document.querySelector('#top [data-canvas="fluid-waves"]') as HTMLElement | null
    const name = document.querySelector('#top .hero-name') as HTMLElement | null
    if (!hero || !zone || !canvas || !name) return null
    const h = hero.getBoundingClientRect()
    const z = zone.getBoundingClientRect()
    const c = canvas.getBoundingClientRect()
    const nm = name.getBoundingClientRect()
    return {
      heroH: h.height,
      innerH: window.innerHeight,
      zoneBottom: z.bottom,
      canvasTop: c.top,
      canvasBottom: c.bottom,
      heroTop: h.top,
      heroBottom: h.bottom,
      nameBottom: nm.bottom,
      dissolve: canvas.getAttribute('data-dissolve'),
    }
  })
  expect(geo).not.toBeNull()
  // > 100svh (allow measurement slack; target is ~130svh).
  expect(geo!.heroH).toBeGreaterThan(geo!.innerH * 1.15)
  // The canvas covers the FULL hero section height, so the melt band is real
  // painted shader (not an overlay) all the way to the section bottom.
  expect(geo!.canvasTop).toBeLessThanOrEqual(geo!.heroTop + 1)
  expect(geo!.canvasBottom).toBeGreaterThanOrEqual(geo!.heroBottom - 1)
  // The dissolve uniforms are active on the hero canvas.
  expect(geo!.dissolve).toBe('hero')
  // The name sits fully inside the 100svh zone; no text renders in the melt band
  // below the zone (geometry invariant — the name is the lowest hero text node).
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.zoneBottom + 1)
})
