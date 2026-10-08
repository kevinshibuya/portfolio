import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { openScene, scrollToActTwo, scrollToPlayhead, rasterBudgetMs, CANVAS } from './helpers/scene'
import {
  actTwoProgress,
  actTwoPose,
  frameRects,
  playheadForColumn,
  sceneGeometry,
} from '../../src/utils/sceneMotion'
import { cellPixel, wallEdgePoint, type CanvasBox, type CellPixel } from './helpers/frieze'
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
  // 90 s covers `desktop-chromium`, where a full raster is ~10 s. On
  // `desktop-hidpi` the same redraw rebuilds all 171 cells at the 612.8
  // texels/world ceiling — 27.16 MiB of masks against 6.00 — under a software
  // rasteriser, and the language round trip does it twice on top of the
  // warm-up. The budget is per-assertion (`rasterBudgetMs`); this is only the
  // ceiling that stops a genuinely hung test from running forever.
  test.describe.configure({ timeout: 240_000 })

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

  /**
   * Luminance INSIDE one cell's projected footprint.
   *
   * A full-width strip across the wall is not evidence of glyphs: at any
   * playhead the frame also holds slivers of the nine case-study covers, which
   * are photographic and carry plenty of sub-40 ink of their own. A strip would
   * therefore stay green with `drawUnit` painting nothing at all — a mode this
   * codebase has already seen once, when an unparseable `ctx.font` made
   * `fillText` a silent no-op. An EMBED cell has no cover, so ink found inside
   * its own footprint is the frieze's own text and nothing else.
   */
  async function cellInk(page: Page, box: CanvasBox, target: CellPixel): Promise<Luminance> {
    const w = Math.max(8, Math.round(target.widthFrac * box.width))
    const h = Math.max(8, Math.round(target.heightFrac * box.height))
    const x = Math.round(Math.max(box.x, Math.min(target.px - w / 2, box.x + box.width - w)))
    const y = Math.round(Math.max(box.y, Math.min(target.py - h / 2, box.y + box.height - h)))
    const shot = await page.screenshot({ clip: { x, y, width: w, height: h } })
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
  // Same column, so it is in frame at `embedU`, but below row 1: the top of a
  // block's first column carries the year count, whose band is deliberately
  // non-interactive and whose ink is the count rather than a cell's own text.
  const glyphCell =
    fixture.cells.find((c) => c.kind === 'embed' && c.col === embedCell.col && c.row >= 2) ??
    embedCell
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
      // window: absence check: each stop runs the frame loop long enough for an error to surface
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
    // window: the ready raster reaches the screen before pixels are sampled
    await page.waitForTimeout(900)
    const box = (await page.locator(CANVAS).boundingBox())!

    // One embed cell, sampled inside its own projected footprint: no cover can
    // supply the ink, so this goes red if the rasteriser draws nothing.
    const g = sceneGeometry(box.width, box.height)
    const target = cellPixel(glyphCell, extent, g, actTwoPose(embedU, extent, g), box)
    expect(target.inFrame, 'the sampled cell must be wholly in frame').toBe(true)
    const cell = await cellInk(page, box, target)
    expect(cell.min, 'glyph ink inside the cell').toBeLessThan(40)
    expect(cell.max, 'cream inside the cell').toBeGreaterThan(200)

    // And the wall at large stays a light surface: a black frame or a composer
    // that swallowed the scene fails here rather than in the cell.
    for (const yFrac of [0.55, 0.85]) {
      const lum = await strip(page, box, yFrac)
      expect(lum.max, `light present at ${yFrac}`).toBeGreaterThan(200)
      expect(lum.mean, `the wall stays predominantly light at ${yFrac}`).toBeGreaterThan(170)
    }
  })

  test('hovering a cell repaints it', async ({ page }) => {
    await openScene(page)
    await scrollToActTwo(page, embedU)
    await expect(page.locator(CANVAS)).toHaveAttribute('data-frieze', 'ready')
    // window: the ready raster reaches the screen before pixels are sampled
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
    // window: absence check: the unhovered baseline of a before/after pair
    await page.waitForTimeout(250)
    const before = await page.screenshot({ clip })

    await page.mouse.move(target.px, target.py)
    // window: the hover repaint lands before the after-shot of the pair
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
      const before = await canvas.getAttribute('data-frieze-gen')
      await page.locator('.nav-lang').click()
      // `data-frieze` cannot witness this: the wall SWAPS rather than blanks, so
      // it reads 'ready' throughout and a generation that parked forever would
      // satisfy it. The committed-generation counter is what actually moves.
      await expect(canvas, `language pass ${pass} must redraw`).not.toHaveAttribute(
        'data-frieze-gen',
        before!,
        { timeout: rasterBudgetMs() },
      )
      await expect(canvas, `language pass ${pass} must land ready`).toHaveAttribute(
        'data-frieze',
        'ready',
      )
      // window: the ready raster reaches the screen before pixels are sampled
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

    const beforeGen = await canvas.getAttribute('data-frieze-gen')
    await page.setViewportSize({ width: 1100, height: 800 })
    // Same reason as the language pass: only the counter proves a new
    // generation was committed rather than the old one still standing.
    await expect(canvas, 'a settled resize must redraw').not.toHaveAttribute(
      'data-frieze-gen',
      beforeGen!,
      { timeout: rasterBudgetMs() },
    )
    await expect(canvas, 'the resized wall lands ready').toHaveAttribute('data-frieze', 'ready')

    const box = (await canvas.boundingBox())!
    expect(box.width, 'the canvas follows the new viewport').toBeLessThan(1200)
    const lum = await strip(page, box, 0.55)
    expect(lum.min, 'glyphs survive the resize').toBeLessThan(40)
    expect(errors, 'a resize must be silent').toEqual([])
  })
})

// The wall stands behind the corridor in act one, fogged to the background's
// cream. Its cards' covers and captions once skipped the depth test, so at
// 1440x900 they painted cream rectangles over settled cards 1 and 3 wherever a
// wall card sat behind them on screen. One viewport, one project: this guards
// the depth contract, not a layout.
test.describe('act one · the wall never paints over a settled card', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a band under each settled card top edge carries no cream', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium', 'one viewport is enough for a depth contract')
    test.setTimeout(120_000)
    await openScene(page)
    // The canvas is pinned, so its box is only on screen once the scene is.
    await scrollToPlayhead(page, 0)
    const box = (await page.locator(CANVAS).boundingBox())!
    const { card } = frameRects(sceneGeometry(box.width, box.height))
    const h = (card.bottom - card.top) * box.height
    const clip = {
      x: Math.round(box.x + (card.left + 0.1 * (card.right - card.left)) * box.width),
      y: Math.round(box.y + card.top * box.height + 0.015 * h),
      width: Math.round(0.8 * (card.right - card.left) * box.width),
      height: Math.round(0.08 * h),
    }
    const creamPixels: number[] = []
    // frameRects is the LEFT slot, where cards 1 and 3 settle; 2 and 4 settle right.
    for (const playhead of [0, 2]) {
      await scrollToPlayhead(page, playhead, { settle: 2000 }) // window: the card settles into the slot
      const { data, info: raw } = await sharp(await page.screenshot({ clip }))
        .raw()
        .toBuffer({ resolveWithObject: true })
      let cream = 0
      for (let i = 0; i < data.length; i += raw.channels) {
        if (Math.abs(data[i] - 0xf5) <= 6 && Math.abs(data[i + 1] - 0xf2) <= 6 && Math.abs(data[i + 2] - 0xec) <= 6) cream++
      }
      creamPixels.push(cream)
    }
    // Measured 2026-10-07 on a ~17 400 px band: the cutouts painted 1543 and
    // 1015 cream pixels; the fixed build reads 0 and at most 110, card 3's
    // cover antialiasing as it breathes. 400 sits between the two. Card 1 is the
    // dependable red: the wall is fully fogged there whatever the fog's drift,
    // while card 3's wall is only partly fogged. The band is the card's top, so
    // it guards the covers; a caption-only regression would land lower.
    for (const [i, cream] of creamPixels.entries()) {
      expect(cream, `cream pixels inside settled card ${i === 0 ? 1 : 3}`).toBeLessThan(400)
    }
  })
})
