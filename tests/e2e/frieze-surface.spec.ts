import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { openScene, scrollToActTwo, CANVAS } from './helpers/scene'
import {
  actTwoProgress,
  actTwoPose,
  playheadForColumn,
  sceneGeometry,
} from '../../src/utils/sceneMotion'
import { cellPixel, wallEdgePoint, type CanvasBox } from './helpers/frieze'
import type { FriezeFixture } from '../unit/friezeFixture.shared'

/**
 * The act-two wall as a RENDERED SURFACE.
 *
 * A canvas keeps its element and every attribute while its frame loop throws,
 * so DOM assertions cannot tell a drawn wall from a dead one. Everything here
 * that matters is therefore pixels or console output. Readback via
 * `page.evaluate` is not an option — the context has no `preserveDrawingBuffer`
 * and reads back blank — so the evidence comes from Playwright screenshots,
 * the same route `scene-effects.spec.ts` takes.
 */

const fixture = JSON.parse(
  readFileSync('tests/e2e/fixtures/frieze-cells.json', 'utf8'),
) as FriezeFixture
const extent = fixture.extent

test.describe('act two · the wall as a rendered surface', () => {
  test.describe.configure({ timeout: 90_000 })

  interface Luminance {
    min: number
    max: number
    mean: number
  }

  async function strip(page: Page, box: CanvasBox, yFrac: number, h = 40): Promise<Luminance> {
    const shot = await page.screenshot({
      clip: { x: box.x, y: box.y + Math.round(box.height * yFrac), width: box.width, height: h },
    })
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true })
    let min = 255
    let max = 0
    let sum = 0
    let n = 0
    for (let i = 0; i < data.length; i += info.channels) {
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      if (lum < min) min = lum
      if (lum > max) max = lum
      sum += lum
      n++
    }
    return { min, max, mean: sum / n }
  }

  /** Every console error, page error and unhandled rejection, in order. */
  function watchErrors(page: Page): string[] {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`)
    })
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    return errors
  }

  const embedCell = fixture.cells.find((c) => c.kind === 'embed')!
  const embedU = actTwoProgress(
    playheadForColumn(embedCell.col + embedCell.span / 2, extent),
  )

  test('the surface loads, sweeps act two and reports nothing to the console', async ({
    page,
  }) => {
    const errors = watchErrors(page)
    await openScene(page)

    expect(await page.locator('#root').evaluate((el) => el.children.length)).toBeGreaterThan(0)

    const canvas = page.locator(CANVAS)
    // ADR 0011: the corridor registers exactly once. The wall's own Suspense
    // boundary exists so its late-arriving covers cannot tear the shared one
    // down and push this to 2.
    await expect(canvas).toHaveAttribute('data-registrations', '1')

    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      await scrollToActTwo(page, u)
      await page.waitForTimeout(220)
    }
    await expect(canvas).toHaveAttribute('data-act', '2')
    await expect(canvas).toHaveAttribute('data-frieze', 'ready')
    expect(errors, 'an act-two sweep must be silent').toEqual([])
  })

  test('the wall draws real glyphs on real cream, not a blank sheet', async ({ page }) => {
    await openScene(page)
    await scrollToActTwo(page, embedU)
    await expect(page.locator(CANVAS)).toHaveAttribute('data-frieze', 'ready')
    await page.waitForTimeout(900)
    const box = (await page.locator(CANVAS).boundingBox())!

    // Sampled DEEP in the wall, well below the act-two year title, so the ink
    // found here is the frieze's own text and never the title's.
    for (const yFrac of [0.55, 0.85]) {
      const lum = await strip(page, box, yFrac)
      expect(lum.min, `ink present at ${yFrac}`).toBeLessThan(40)
      expect(lum.max, `light present at ${yFrac}`).toBeGreaterThan(200)
      // A wall that failed to raster would be uniform cream: bright mean, but
      // no ink at all. A black frame would fail the mean instead.
      expect(lum.mean, `the wall stays predominantly light at ${yFrac}`).toBeGreaterThan(170)
    }
  })

  test('hovering a cell repaints it', async ({ page }) => {
    await openScene(page)
    await scrollToActTwo(page, embedU)
    await expect(page.locator(CANVAS)).toHaveAttribute('data-frieze', 'ready')
    await page.waitForTimeout(900)
    const box = (await page.locator(CANVAS).boundingBox())!
    const g = sceneGeometry(box.width, box.height)
    const target = cellPixel(embedCell, extent, g, actTwoPose(embedU, extent, g), box)

    const clip = {
      x: Math.round(target.px - 24),
      y: Math.round(target.py - 24),
      width: 48,
      height: 48,
    }
    // Park the pointer OFF the wall first, so the baseline is genuinely unhovered.
    const edge = wallEdgePoint(extent, g, actTwoPose(embedU, extent, g), box, 'top', 0.5)
    await page.mouse.move(edge.px, box.y + 2)
    await page.waitForTimeout(250)
    const before = await page.screenshot({ clip })

    await page.mouse.move(target.px, target.py)
    await page.waitForTimeout(300)
    const after = await page.screenshot({ clip })

    const [a, b] = await Promise.all([
      sharp(before).raw().toBuffer(),
      sharp(after).raw().toBuffer(),
    ])
    let changed = 0
    for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 6) changed++
    expect(changed, 'the hovered cell must repaint').toBeGreaterThan(0)
  })

  test('the wall survives EN → PT → EN and redraws each time', async ({ page }) => {
    const errors = watchErrors(page)
    await openScene(page)
    await scrollToActTwo(page, embedU)
    const canvas = page.locator(CANVAS)
    await expect(canvas).toHaveAttribute('data-frieze', 'ready')

    for (const pass of [1, 2]) {
      await page.locator('.nav-lang').click()
      // The generation is superseded and rebuilt; it must come back, not park.
      await expect(canvas, `language pass ${pass} must redraw`).toHaveAttribute(
        'data-frieze',
        'ready',
        { timeout: 30_000 },
      )
      await page.waitForTimeout(400)
    }
    const box = (await canvas.boundingBox())!
    const lum = await strip(page, box, 0.55)
    expect(lum.min, 'still real glyphs after the round trip').toBeLessThan(40)
    expect(errors, 'a language round trip must be silent').toEqual([])
  })

  test('a resize rebuilds the wall instead of parking it', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium', 'viewport resize is a desktop concern')
    const errors = watchErrors(page)
    await openScene(page)
    await scrollToActTwo(page, embedU)
    const canvas = page.locator(CANVAS)
    await expect(canvas).toHaveAttribute('data-frieze', 'ready')

    await page.setViewportSize({ width: 1100, height: 800 })
    await page.waitForTimeout(600)
    await expect(canvas, 'a settled resize must redraw').toHaveAttribute('data-frieze', 'ready', {
      timeout: 30_000,
    })

    const box = (await canvas.boundingBox())!
    expect(box.width, 'the canvas follows the new viewport').toBeLessThan(1200)
    const lum = await strip(page, box, 0.55)
    expect(lum.min, 'glyphs survive the resize').toBeLessThan(40)
    expect(errors, 'a resize must be silent').toEqual([])
  })
})
