import { test, expect } from '@playwright/test'
import { projects } from '../../src/data/projects'

// `src/data/projects` imports only a type, so Playwright CAN read it — unlike
// `src/data/archive`, which reaches `embeds.csv?raw`. Same filter and sort as
// Projects.tsx, so index 0 here is the card in the slot at playhead 0.
const FEATURED = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
import { openScene, scrollToPlayhead, CANVAS } from './helpers/scene'
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
  // The warm-up alone may take 30 s in software, and the viewport sweeps below
  // wait on every resize.
  test.setTimeout(120_000)
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
    // The end of the wrapper too: card four settled, the last title drawn.
    await scrollToPlayhead(page, 3)
    await page.waitForTimeout(400)
    expect(problems, `card four at 1440x${height}`).toEqual([])
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
    await scrollToPlayhead(page, 3)
    await page.waitForTimeout(200)
    expect(problems, `card four at ${width}x${height}`).toEqual([])
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
  // The card in the slot at playhead 0 is `featured[0]`, the same order
  // Projects.tsx builds `cards` and the card links in.
  const href = `/projects/${FEATURED[0].slug}`
  await expect(page.locator(`#projects a.scene-cardlink[href="${href}"]`)).toHaveCount(1)

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

test('a card link navigates to its project', async ({ page }) => {
  await openScene(page)
  await scrollToPlayhead(page, 0)

  // The card links are the keyboard route into a project (ADR 0011): real
  // links, clipped rather than hidden.
  const link = page.locator('#projects a.scene-cardlink').first()
  const href = (await link.getAttribute('href'))!
  expect(href).toBe(`/projects/${FEATURED[0].slug}`)
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

test('the scene ends with card four settled as the wrapper ends, and the page flows on', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)
  const wrapper = page.locator('#projects .scene-scroll')

  // The wrapper is back to 550 svh, and still publishes it: the scene helpers
  // and the scroll-transition perf scenario both read `data-svh`.
  await expect(wrapper).toHaveAttribute('data-svh', '550')
  const { offsetHeight, innerHeight } = await wrapper.evaluate((el) => ({
    offsetHeight: (el as HTMLElement).offsetHeight,
    innerHeight: window.innerHeight,
  }))
  expect(Math.abs(offsetHeight - 5.5 * innerHeight)).toBeLessThanOrEqual(2)

  // The last scroll position inside the pin is card four's slot.
  await page.evaluate(() => {
    const el = document.querySelector('#projects .scene-scroll') as HTMLElement
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + el.offsetHeight - window.innerHeight, behavior: 'instant' as ScrollBehavior })
  })
  await expect(canvas).toHaveAttribute('data-slot', '3')

  // No hold beat, no second act: one viewport further and the pin has released,
  // the canvas has scrolled up out of the frame with its section, and the slot
  // still names card four.
  await page.evaluate(() => window.scrollBy({ top: window.innerHeight, behavior: 'instant' as ScrollBehavior }))
  await expect
    .poll(async () => (await canvas.boundingBox())?.y ?? 0, { message: 'the pin releases' })
    .toBeLessThan(-0.5 * (page.viewportSize()?.height ?? 0))
  await expect(canvas).toHaveAttribute('data-slot', '3')
  expect(await canvas.getAttribute('data-act'), 'no act attribute survives').toBeNull()

  // Reversible, like every other scroll-driven state in the scene.
  await scrollToPlayhead(page, 0)
  await expect(canvas).toHaveAttribute('data-slot', '0')
})
