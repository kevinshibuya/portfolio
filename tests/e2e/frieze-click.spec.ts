import { test, expect, type Page } from '@playwright/test'
import { openScene, scrollToActTwo, CANVAS } from './helpers/scene'
import { readFileSync } from 'node:fs'
import {
  actTwoProgress,
  actTwoPose,
  friezeFrame,
  playheadForColumn,
  sceneGeometry,
} from '../../src/utils/sceneMotion'
import { cellPixel, wallEdgePoint, type CanvasBox } from './helpers/frieze'
import type { FixtureCell, FriezeFixture } from '../unit/friezeFixture.shared'

/**
 * Clicking a cell on the act-two wall.
 *
 * The production build strips `window.__scene` and `window.__sceneCamera`, so
 * nothing here can ask the live camera where a cell went. The test recomputes
 * the whole chain from the same pure functions the scene uses — layout, extent,
 * `sceneGeometry` from the CANVAS box, `actTwoPose` — and then has to prove that
 * recomputation matches the frame actually on screen.
 *
 * It proves it with an EDGE BRACKET, not by clicking a cell centre and seeing
 * something happen. A centre probe only fails once the coordinate error exceeds
 * half a cell's screen pitch, so a systematic offset passes here and comes back
 * as flake on whichever viewport shrinks the pitch. Hovering EPS inside the
 * wall's edge must hit and EPS outside must miss, which bounds the error to EPS
 * on every run — and because the edges only project here when the rendered
 * frame is at the `u` the pose was built from, the same bracket catches Lenis
 * handing us a frame that has not settled.
 */

/**
 * The cells arrive as DATA, not from `src/data/archive`: that module reaches
 * `embeds.csv?raw`, a Vite-only import Playwright's loader cannot follow.
 * `tests/unit/friezeFixture.test.ts` recomputes this file from the live archive
 * on every unit run and fails if it has drifted, so it cannot go quietly stale.
 */
const fixture = JSON.parse(
  readFileSync('tests/e2e/fixtures/frieze-cells.json', 'utf8'),
) as FriezeFixture
const extent = fixture.extent

/** Bracket half-width. Well under half a cell's pitch (~72x52 px at desktop). */
const EPS = 4
/** A cell smaller than this on screen is a coin toss, not a click target. */
const MIN_CELL_PX = 16

/** The settled playhead that parks `cell`'s column, as act-two progress. */
const uFor = (cell: FixtureCell): number =>
  actTwoProgress(playheadForColumn(cell.col + cell.span / 2, extent))

async function canvasBox(page: Page): Promise<CanvasBox> {
  const box = await page.locator(CANVAS).boundingBox()
  expect(box, 'the scene canvas must be laid out').not.toBeNull()
  return box!
}

interface Frame {
  box: CanvasBox
  g: ReturnType<typeof sceneGeometry>
  cam: ReturnType<typeof actTwoPose>
  u: number
}

/**
 * Scroll to `u`, then measure.
 *
 * The canvas is a PINNED stage: at the top of the page it sits ~1200 px down,
 * and only once act two is on screen does it occupy the viewport. Measuring the
 * box before the scroll offsets every computed pixel by that distance, so the
 * order here is load-bearing. Its WIDTH is also not the viewport's — a
 * scrollbar makes it 1269 against 1280 — which is why `sceneGeometry` is fed
 * the canvas box and never `window.innerWidth`.
 */
async function frameAt(page: Page, u: number): Promise<Frame> {
  await scrollToActTwo(page, u)
  const box = await canvasBox(page)
  const g = sceneGeometry(box.width, box.height)
  return { box, g, cam: actTwoPose(u, extent, g), u }
}

/**
 * Where along an edge to probe: directly under the camera.
 *
 * The wall is 35 columns wide and the camera dollies along it, so its MIDPOINT
 * is far out of frame at most playheads — a fixed 0.5 puts the probe at x=2076
 * on a 1269 px canvas and tests nothing.
 */
function alongUnderCamera(frame: Frame): number {
  const f = friezeFrame(extent, frame.g)
  return Math.min(0.95, Math.max(0.05, (frame.cam.x - f.left) / f.width))
}

/** Cells that project safely into THIS canvas at their own settled playhead. */
function clickableCells(box: CanvasBox, want: (cell: FixtureCell) => boolean): FixtureCell[] {
  const g = sceneGeometry(box.width, box.height)
  return fixture.cells.filter((cell) => {
    if (!want(cell)) return false
    const target = cellPixel(cell, extent, g, actTwoPose(uFor(cell), extent, g), box)
    return (
      target.inFrame &&
      target.widthFrac * box.width >= MIN_CELL_PX &&
      target.heightFrac * box.height >= MIN_CELL_PX
    )
  })
}

const isCaseStudy = (cell: FixtureCell): boolean => cell.kind === 'caseStudy'
const isEmbed = (cell: FixtureCell): boolean => cell.kind === 'embed'

/** The canvas's inline cursor — the only hit signal the shipped build exposes. */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  await page.waitForTimeout(40)
  return page.locator(CANVAS).evaluate((el) => (el as HTMLElement).style.cursor)
}

/**
 * Scroll to `u` and wait until the wall's edges are where the test says.
 *
 * A fixed settle is a guess about the machine; this waits on the thing that
 * actually has to be true, and requires it twice at least 100 ms apart, because
 * an easing frame sweeps through a continuum of poses and can agree in passing
 * while still moving.
 */
async function settleAt(page: Page, frame: Frame): Promise<void> {
  const edge = wallEdgePoint(
    extent,
    frame.g,
    frame.cam,
    frame.box,
    'top',
    alongUnderCamera(frame),
  )

  const inside = { x: edge.px - edge.outward.dx * EPS, y: edge.py - edge.outward.dy * EPS }
  const outside = { x: edge.px + edge.outward.dx * EPS, y: edge.py + edge.outward.dy * EPS }

  let agreed = 0
  await expect
    .poll(
      async () => {
        const hit = await cursorAt(page, inside.x, inside.y)
        const miss = await cursorAt(page, outside.x, outside.y)
        agreed = hit === 'pointer' && miss !== 'pointer' ? agreed + 1 : 0
        if (agreed === 1) await page.waitForTimeout(100)
        return agreed
      },
      {
        intervals: [100, 150, 250, 400],
        timeout: 15_000,
        message:
          'the wall never settled with its top edge where the recomputed pose puts it — ' +
          'either the projection is off or the rendered frame is not at this u',
      },
    )
    .toBeGreaterThanOrEqual(2)
}

test.describe('act two · clicking the wall', () => {
  // `openScene` waits on the scene's compile-and-upload warm-up, ~10 s headless
  // before anything here asserts, and the settle poll may spend 15 s more. The
  // default 30 s makes these tests fail on load rather than on behaviour.
  test.describe.configure({ timeout: 90_000 })

  test('the wall edge brackets exactly where the recomputed pose puts it', async ({ page }) => {
    await openScene(page)
    const cells = clickableCells(await canvasBox(page), isEmbed)
    expect(cells.length, 'the packing must expose clickable embed cells').toBeGreaterThan(0)

    const frame = await frameAt(page, uFor(cells[0]))
    await settleAt(page, frame)

    // A second, perpendicular edge: a translation that satisfied the top edge
    // by luck cannot also satisfy the bottom one.
    const edge = wallEdgePoint(extent, frame.g, frame.cam, frame.box, 'bottom', alongUnderCamera(frame))
    const inside = await cursorAt(page, edge.px - edge.outward.dx * EPS, edge.py - edge.outward.dy * EPS)
    const outside = await cursorAt(page, edge.px + edge.outward.dx * EPS, edge.py + edge.outward.dy * EPS)
    expect(inside, 'just inside the bottom edge must hit the wall').toBe('pointer')
    expect(outside, 'just outside the bottom edge must miss it').not.toBe('pointer')
  })

  test('a case study cell routes to its project', async ({ page }) => {
    await openScene(page)
    const cells = clickableCells(await canvasBox(page), isCaseStudy)
    expect(cells.length, 'at least one case study must be clickable here').toBeGreaterThan(0)

    const cell = cells[0]
    const frame = await frameAt(page, uFor(cell))
    await settleAt(page, frame)

    const target = cellPixel(cell, extent, frame.g, frame.cam, frame.box)
    await page.mouse.click(target.px, target.py)
    await expect(page).toHaveURL(new RegExp(`/projects/${cell.slug!}$`))
  })

  test('two cells in one frame open their OWN links, not one another\u2019s', async ({
    page,
    context,
  }) => {
    await openScene(page)
    const cells = clickableCells(await canvasBox(page), isEmbed)
    // Same column means the same settled playhead, so both clicks land in ONE
    // frame. That is what makes this a real negative control: cell B's link is
    // falsifiable evidence that the click did not simply hit cell A twice.
    const u = uFor(cells[0])
    const sameFrame = cells.filter((c) => uFor(c) === u).slice(0, 2)
    expect(sameFrame.length, 'need two embed cells sharing a playhead').toBe(2)
    expect(sameFrame[0].href).not.toBe(sameFrame[1].href)

    const frame = await frameAt(page, u)
    await settleAt(page, frame)

    for (const cell of sameFrame) {
      const href = cell.href!
      await context.route(href, (route) =>
        route.fulfill({ contentType: 'text/html', body: '<title>intercepted</title>' }),
      )
      const target = cellPixel(cell, extent, frame.g, frame.cam, frame.box)
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.mouse.click(target.px, target.py),
      ])
      expect(popup.url()).toBe(href)
      expect(await popup.evaluate(() => window.opener), 'noopener must hold').toBeNull()
      await popup.close()
    }
  })

  test('a drag past the tap threshold opens nothing, a tap still does', async ({
    page,
    context,
  }) => {
    await openScene(page)
    const cells = clickableCells(await canvasBox(page), isEmbed)
    const cell = cells[0]
    const href = cell.href!
    const frame = await frameAt(page, uFor(cell))
    await settleAt(page, frame)

    await context.route(href, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>intercepted</title>' }),
    )
    const target = cellPixel(cell, extent, frame.g, frame.cam, frame.box)

    let opened = false
    const watch = (): void => {
      opened = true
    }
    context.on('page', watch)
    await page.mouse.move(target.px - 20, target.py)
    await page.mouse.down()
    await page.mouse.move(target.px, target.py, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    context.off('page', watch)
    expect(opened, 'a 20px drag must not count as a tap').toBe(false)

    // The drag IS a scroll gesture as far as the page is concerned: it moves the
    // wall. (Re-checking the pre-drag frame here fails, which is how this was
    // found.) So re-establish the frame from scratch before the confirming tap.
    const settled = await frameAt(page, uFor(cell))
    await settleAt(page, settled)
    const after = cellPixel(cell, extent, settled.g, settled.cam, settled.box)

    // The same frame still opens on a real tap — proof the path was live when
    // the negative ran, which absence alone could never show.
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.mouse.click(after.px, after.py),
    ])
    expect(popup.url()).toBe(href)
    await popup.close()
  })
})
