import { test, expect } from '@playwright/test'

interface RowMean { r: number; g: number; b: number }

// Reads a horizontal pixel row from the live hero WebGL canvas via
// gl.readPixels. Must run in the same JS task as a shader draw (the buffer is
// invalidated after compositing with preserveDrawingBuffer:false):
//  - animated path: read inside a rAF callback — the component's loop callback
//    is registered earlier, so it draws first within the same frame;
//  - reduced-motion path: dispatch a window resize (whose handler redraws the
//    static frame synchronously when in view) and read immediately after.
// yFrac is measured from the CANVAS BOTTOM (gl y-axis == shader vUv.y).
// Returns per-channel means over 64 samples across the row.
const readRow = ([yFrac, viaResize]: [number, boolean]): Promise<RowMean> =>
  new Promise((res) => {
    const c = document.querySelector('#top [data-canvas="fluid-waves"]') as HTMLCanvasElement
    const gl = c.getContext('webgl') as WebGLRenderingContext
    const read = (): void => {
      const w = c.width
      const buf = new Uint8Array(w * 4)
      const y = Math.max(0, Math.min(c.height - 1, Math.round(c.height * yFrac)))
      gl.readPixels(0, y, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf)
      let r = 0
      let g = 0
      let b = 0
      const n = 64
      for (let i = 0; i < n; i++) {
        const o = Math.floor(i * (w / n)) * 4
        r += buf[o]; g += buf[o + 1]; b += buf[o + 2]
      }
      res({ r: r / n, g: g / n, b: b / n })
    }
    if (viaResize) {
      window.dispatchEvent(new Event('resize'))
      read()
    } else {
      requestAnimationFrame(read)
    }
  })

// Sum of per-channel distances from cream #F5F2EC (245, 242, 236).
const creamDist = (px: RowMean): number =>
  Math.abs(px.r - 245) + Math.abs(px.g - 242) + Math.abs(px.b - 236)

test('hero grows past 100svh; shader cream dissolve really paints the melt band', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Geometry invariants: ~130svh section, canvas covers it fully, the name
  // (lowest hero text node) never enters the melt band below the 100svh zone.
  const geo = await page.evaluate(() => {
    const hero = document.querySelector('#top') as HTMLElement | null
    const zone = document.querySelector('#top .hero-zone') as HTMLElement | null
    const canvas = document.querySelector('#top [data-canvas="fluid-waves"]') as HTMLElement | null
    const name = document.querySelector('#top .hero-name') as HTMLElement | null
    if (!hero || !zone || !canvas || !name) return null
    const h = hero.getBoundingClientRect()
    return {
      heroH: h.height,
      innerH: window.innerHeight,
      heroTop: h.top,
      heroBottom: h.bottom,
      canvasTop: canvas.getBoundingClientRect().top,
      canvasBottom: canvas.getBoundingClientRect().bottom,
      zoneBottom: zone.getBoundingClientRect().bottom,
      nameBottom: name.getBoundingClientRect().bottom,
    }
  })
  expect(geo).not.toBeNull()
  expect(geo!.heroH).toBeGreaterThan(geo!.innerH * 1.15)
  expect(geo!.canvasTop).toBeLessThanOrEqual(geo!.heroTop + 1)
  expect(geo!.canvasBottom).toBeGreaterThanOrEqual(geo!.heroBottom - 1)
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.zoneBottom + 1)

  // Pixel truth (kills dissolveStrength=0: the cream floor is multiplied by
  // the strength uniform, so a disabled dissolve leaves raw paint here).
  const bottom = await page.evaluate(readRow, [0.01, false] as [number, boolean])
  const inBand = await page.evaluate(readRow, [0.06, false] as [number, boolean])
  const midPaint = await page.evaluate(readRow, [0.5, false] as [number, boolean])

  // Bottom row: solid cream seam onto the cream section (±6 per channel).
  expect(creamDist(bottom)).toBeLessThan(18)
  // Mid-canvas (well above the band top at ~0.23): raw tricolor paint, far
  // from cream — every accent color is ≥ ~200 summed distance.
  expect(creamDist(midPaint)).toBeGreaterThan(40)
  // Inside the noise-driven dissolve, ABOVE the hard cream floor (0.035–0.047)
  // — this row is cream only because the fBm field actually fires (kills
  // dissolveStart=0: a collapsed band leaves raw paint ≈250 here). Measured
  // 12–16 across seeds at preview; 60 gives ~4x seed/finger margin.
  expect(creamDist(inBand)).toBeLessThan(60)
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })

  test('static frame includes the cream dissolve', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('#top [data-canvas="fluid-waves"]')).toHaveAttribute('data-static', 'true')

    const bottom = await page.evaluate(readRow, [0.01, true] as [number, boolean])
    const midPaint = await page.evaluate(readRow, [0.5, true] as [number, boolean])
    expect(creamDist(bottom)).toBeLessThan(18)
    expect(creamDist(midPaint)).toBeGreaterThan(40)
  })
})
