import { test, expect } from '@playwright/test'
import { projects } from '../../src/data/projects'

// `src/data/projects` imports only a type, so Playwright CAN read it — unlike
// `src/data/archive`, which reaches `embeds.csv?raw`. Same filter and sort as
// Projects.tsx, so index 0 here is the card in the slot at playhead 0.
const FEATURED = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
import { openScene, scrollToPlayhead, scrollToActTwo, beats, CANVAS } from './helpers/scene'
import {
  CARD_H,
  CARD_W,
  CARD_Y,
  sceneGeometry,
  frameRects,
  cameraPose,
  cardPose,
  projectPoint,
} from '../../src/utils/sceneMotion'


/**
 * Every settled playhead plus the overture and the approach, then back to card
 * 0 — the same stops the fraction-based sweep meant, now said in the units the
 * scene actually runs on.
 */
const SWEEP = [-1.5, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 0]

/**
 * The suite's blind spot, closed.
 *
 * A `ReferenceError` in the scene — an identifier used but never imported —
 * took the whole title out and every one of the 79 e2e cases still passed: the
 * title lives inside the canvas, so no DOM assertion sees it, and nothing else
 * asserted the page stays quiet. The codex visual pass caught it instead. A
 * scrub with a clean console is the cheap guard against that whole class.
 */
test('a full scrub raises no console error and never rejects a promise', async ({ page }) => {
  // Act two roughly doubles this sweep: eleven more stops on the main pass, and
  // the act-two beats repeated at every short and near-square viewport. The
  // default 30 s budget was sized for act one alone.
  test.setTimeout(180_000)
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  await openScene(page)
  for (const playhead of SWEEP) {
    await scrollToPlayhead(page, playhead)
    expect(problems, `after scrolling to playhead ${playhead}`).toEqual([])
  }
  // …and through the middle of every transition, where the title morphs.
  for (const playhead of [0.3, 0.75, 1.29, 1.74, 2.28]) {
    await scrollToPlayhead(page, playhead)
  }
  expect(problems).toEqual([])

  // ACT TWO, at the beat boundaries the page actually shipped. A throw inside
  // the frame loop is invisible to every DOM assertion in this suite — the
  // canvas keeps its element and its attributes while the loop dies — so this
  // sweep is the only guard over the release, the approach and the dolly.
  const { release, approach } = await beats(page)
  const ACT_TWO_STOPS = [
    0, release / 2, release, (release + approach) / 2, approach, 0.3, 0.5, 0.75, 0.95, 1, 0.5,
  ]
  for (const u of ACT_TWO_STOPS) {
    await scrollToActTwo(page, u)
    expect(problems, `after scrolling to act two u=${u}`).toEqual([])
  }
  await scrollToPlayhead(page, 0)
  expect(problems).toEqual([])

  // Short viewports, which nothing else sweeps. Under ~225 CSS px of height the
  // title band closes: its bottom passes its top, and an unclamped shrink used
  // to drive a NEGATIVE font size into the rasteriser — `document.fonts.load`
  // rejects an unparseable shorthand, unhandled, and the title then stayed
  // stale for the session. Reachable by dragging a window short.
  for (const height of [400, 260, 220, 180]) {
    await page.setViewportSize({ width: 1440, height })
    await page.waitForTimeout(400)
    await scrollToPlayhead(page, 0.75)
    await page.waitForTimeout(400)
    expect(problems, `at 1440x${height}`).toEqual([])
    // Act two too: the wall's fit and the title distance are viewport-derived.
    await scrollToActTwo(page, 0.5)
    await page.waitForTimeout(400)
    expect(problems, `act two at 1440x${height}`).toEqual([])
  }

  // Near-square, both sides of the crossover. The card formula and the camera
  // height meet here, and a throw inside the frame loop is invisible to every
  // DOM assertion in this suite — the canvas keeps its element and attributes
  // while the loop dies. `visited` is the guard against a loop that silently
  // runs zero times.
  const visited: string[] = []
  for (const [width, height] of [
    [960, 950], [960, 970], [820, 821], [820, 819],
  ]) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400)
    await scrollToPlayhead(page, 0.75)
    await page.waitForTimeout(400)
    expect(problems, `at ${width}x${height}`).toEqual([])
    const near = await beats(page)
    for (const u of [near.release, near.approach, 0.5, 1]) {
      await scrollToActTwo(page, u)
      await page.waitForTimeout(200)
      expect(problems, `act two u=${u} at ${width}x${height}`).toEqual([])
    }
    visited.push(`${width}x${height}`)
  }
  expect(visited).toEqual(['960x950', '960x970', '820x821', '820x819'])
})

test('scrubbing the corridor swaps the settled slot, and reversing restores it', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)

  // The SR heading is static: it names the section, not the front card.
  const heading = page.locator('#projects .scene-title-sr')
  await expect(heading).toHaveText(/selected work|trabalhos selecionados/)

  await scrollToPlayhead(page, 0)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  await scrollToPlayhead(page, 1)
  await expect(canvas).toHaveAttribute('data-slot', '1')

  // Scroll is the playhead: going back restores the earlier state exactly.
  await scrollToPlayhead(page, 0)
  await expect(canvas).toHaveAttribute('data-slot', '0')
  await expect(heading).toHaveText(/selected work|trabalhos selecionados/)
})

test('a full scrub never re-registers the corridor (no react state on scroll)', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)
  await expect(canvas).toHaveAttribute('data-registrations', '1')

  for (const playhead of SWEEP) await scrollToPlayhead(page, playhead)
  // Act two adds two more titles and a frieze extent to the scene's props; if
  // any of it were a per-frame identity change, this is where it would show.
  for (const u of [0.1, 0.5, 1]) await scrollToActTwo(page, u)
  await scrollToPlayhead(page, 0)

  // Nothing in React re-rendered the scene subtree: the corridor registered
  // its objects exactly once, at mount (ADR 0011).
  await expect(canvas).toHaveAttribute('data-registrations', '1')
  await expect(canvas).toHaveAttribute('data-slot', '0')
})

test('the overture line stands at the top and is gone once the cards read', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)

  await scrollToPlayhead(page, -1.5)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  await scrollToPlayhead(page, -1.05)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  // The approach: the line has flown past and the cards are in the distance.
  // Just past the −0.5 boundary (0.2222): a one-pixel scroll rounding would
  // otherwise land a hair inside the overture on some viewports.
  await scrollToPlayhead(page, -0.47)
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  await scrollToPlayhead(page, 0)
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  // Exactly reversible.
  await scrollToPlayhead(page, -1.5)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
})

test('clicking the settled card opens its project', async ({ page }) => {
  await openScene(page)
  await scrollToPlayhead(page, 0)
  // The stream runs newest-first over the WHOLE archive, so its first row is
  // not the settled card. Ask for the row that belongs to the card in the slot
  // at playhead 0, which is `featured[0]` — the same order Projects.tsx builds
  // `cards` in.
  const href = `/projects/${FEATURED[0].slug}`
  await expect(page.locator(`#archive .stream-item a.workrow-link[href="${href}"]`)).toHaveCount(1)

  // The settled card's projected rect, from the same geometry the scene uses.
  const { width, height } = page.viewportSize()!
  const { card } = frameRects(sceneGeometry(width, height))
  await page.mouse.click(((card.left + card.right) / 2) * width, ((card.top + card.bottom) / 2) * height)
  await expect(page).toHaveURL(new RegExp(href.replace(/[/]/g, '\\/')))
})

test('clicking a distant card scrolls it into the slot', async ({ page }) => {
  await openScene(page)
  await scrollToPlayhead(page, 0)
  const canvas = page.locator(CANVAS)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // A point on card 1 (one spacing down the corridor) that card 0 cannot
  // cover on either project: to the right of its centre and just under its
  // top edge. Card 0 is offset the other way, and sits lower in the frame.
  const { width, height } = page.viewportSize()!
  const g = sceneGeometry(width, height)
  const cam = cameraPose(0, g)
  const pose = cardPose(1, 0, g)
  const top = projectPoint(pose.x, CARD_Y + CARD_H / 2, pose.z, cam, g)
  const bottom = projectPoint(pose.x, CARD_Y - CARD_H / 2, pose.z, cam, g)
  const right = projectPoint(pose.x + CARD_W / 2, CARD_Y + CARD_H / 2, pose.z, cam, g)
  const x = (top.fx + 0.6 * (right.fx - top.fx)) * width
  const y = (top.fy + 0.1 * (bottom.fy - top.fy)) * height
  await page.mouse.click(x, y)

  // Smooth scroll through Lenis (1.2 s), then the slot reports card 1.
  await expect(canvas).toHaveAttribute('data-slot', '1', { timeout: 4000 })
  await expect(page).toHaveURL(/\/$/)
})

test('a stream row navigates to its project', async ({ page }) => {
  await openScene(page)
  await scrollToPlayhead(page, 0)

  // The stream absorbed the skip links: a case-study row IS the keyboard route
  // into a project now, and it is a real link, clipped rather than hidden.
  const link = page.locator('#archive .stream-item .workrow-link').first()
  const href = (await link.getAttribute('href'))!
  expect(href).toMatch(/^\/projects\//)
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(href.replace(/[/]/g, '\\/')))
})

test('losing the webgl context falls back to a plain project list, permanently', async ({
  page,
}) => {
  await openScene(page)
  await scrollToPlayhead(page, 0)

  await page.evaluate(() => {
    const canvas = document.querySelector(
      '#projects canvas[data-canvas="selected-work-scene"]',
    ) as HTMLCanvasElement
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext
    gl.getExtension('WEBGL_lose_context')!.loseContext()
  })

  await expect(page.locator('#projects .scene-fallback .scene-fallback-link')).toHaveCount(4)
  await expect(page.locator('#projects .scene-scroll')).toHaveCount(0)
  await expect(page.locator('#projects canvas')).toHaveCount(0)
})

test('data-act names the act, and act two holds the last slot throughout', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)

  // Act two begins STRICTLY after playhead 3: at 3 exactly card four is settled
  // and `u` is 0, which is still act one (Spec conflict 6).
  //
  // Sampled at 2.99, not 3, for the same reason the overture test samples −0.47
  // and not −0.5: scroll lands on whole pixels, so a target exactly ON a
  // boundary rounds either side of it. At 589×1090 it rounded UP and read act
  // two. The strictness itself is asserted below, where every act-two stop is
  // past the boundary and reads 2.
  for (const playhead of [-1.5, 0, 2.99]) {
    await scrollToPlayhead(page, playhead)
    await expect(canvas, `playhead ${playhead}`).toHaveAttribute('data-act', '1')
  }

  for (const u of [0.05, 0.5, 1]) {
    await scrollToActTwo(page, u)
    await expect(canvas, `act two u=${u}`).toHaveAttribute('data-act', '2')
    // The act-one segment is clamped at 3 for the whole of act two, so
    // `frontIndexFor` keeps returning card four's index. In act two it names
    // the last act-one slot, NOT a card under the pointer (Assumption 18).
    await expect(canvas, `act two u=${u}`).toHaveAttribute('data-slot', '3')
  }

  // Reversible, like every other scroll-driven state in the scene.
  await scrollToPlayhead(page, 0)
  await expect(canvas).toHaveAttribute('data-act', '1')
  await expect(canvas).toHaveAttribute('data-slot', '0')
})
