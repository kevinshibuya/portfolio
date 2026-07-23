import { test, expect } from '@playwright/test'

test('hero grows past 100svh with a cream veil band below the name zone', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // The hero section is stretched to ~130svh: rendered height clearly exceeds the
  // viewport (100svh). Read absolute geometry, no offsetTop.
  const geo = await page.evaluate(() => {
    const hero = document.querySelector('#top') as HTMLElement | null
    const zone = document.querySelector('#top .hero-zone') as HTMLElement | null
    const veil = document.querySelector('#top .hero-veil') as HTMLElement | null
    const name = document.querySelector('#top .hero-name') as HTMLElement | null
    if (!hero || !zone || !veil || !name) return null
    const h = hero.getBoundingClientRect()
    const z = zone.getBoundingClientRect()
    const v = veil.getBoundingClientRect()
    const nm = name.getBoundingClientRect()
    return {
      heroH: h.height,
      innerH: window.innerHeight,
      zoneBottom: z.bottom,
      veilTop: v.top,
      nameBottom: nm.bottom,
      veilText: (veil.textContent || '').trim(),
    }
  })
  expect(geo).not.toBeNull()
  // > 100svh (allow measurement slack; target is ~130svh).
  expect(geo!.heroH).toBeGreaterThan(geo!.innerH * 1.15)
  // The name sits fully inside the 100svh zone, above the veil band.
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.zoneBottom + 1)
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.veilTop + 1)
  // No text ever renders inside the veil band.
  expect(geo!.veilText).toBe('')
})
