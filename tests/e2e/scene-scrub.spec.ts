import { test, expect, type Page } from '@playwright/test'
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
 * Scroll to a fraction of the scene's scrub range. The wrapper is 550svh over a
 * 100svh sticky stage, so useScroll's 0..1 spans (wrapperHeight - viewport) and
 * playhead = p · 4.5 − 1.5: the overture runs to 0.2222, the approach to
 * 0.3333, and settled card k sits at (k + 1.5) / 4.5 — 0.3333 lands card 0,
 * 0.5556 lands card 1.
 */
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
  await page.waitForTimeout(160)
}

async function openScene(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()
  // See the note in perf-budget.spec.ts: the scene compiles and uploads at idle
  // after the entrance, and only then is the scrub the steady state.
  await page
    .locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]')
    .waitFor({ timeout: 30000 })
}

const CANVAS = '#projects canvas[data-canvas="selected-work-scene"]'

/** Every settled fraction plus the overture and the approach, then back to card 0. */
const SWEEP = [0, 0.2222, 0.3333, 0.4444, 0.5556, 0.6667, 0.7778, 0.8889, 1, 0.3333]

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
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  await openScene(page)
  for (const fraction of SWEEP) {
    await scrollToFraction(page, fraction)
    expect(problems, `after scrolling to ${fraction}`).toEqual([])
  }
  // …and through the middle of every transition, where the title morphs.
  for (const fraction of [0.4, 0.5, 0.62, 0.72, 0.84]) {
    await scrollToFraction(page, fraction)
  }
  expect(problems).toEqual([])
})

test('scrubbing the corridor swaps the settled slot, and reversing restores it', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)

  // The SR heading is static: it names the section, not the front card.
  const heading = page.locator('#projects .scene-title-sr')
  await expect(heading).toHaveText(/selected work|trabalhos selecionados/)

  await scrollToFraction(page, 0.3333)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  await scrollToFraction(page, 0.5556)
  await expect(canvas).toHaveAttribute('data-slot', '1')

  // Scroll is the playhead: going back restores the earlier state exactly.
  await scrollToFraction(page, 0.3333)
  await expect(canvas).toHaveAttribute('data-slot', '0')
  await expect(heading).toHaveText(/selected work|trabalhos selecionados/)
})

test('a full scrub never re-registers the corridor (no react state on scroll)', async ({
  page,
}) => {
  await openScene(page)
  const canvas = page.locator(CANVAS)
  await expect(canvas).toHaveAttribute('data-registrations', '1')

  for (const fraction of SWEEP) await scrollToFraction(page, fraction)

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

  await scrollToFraction(page, 0)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  await scrollToFraction(page, 0.1)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  // The approach: the line has flown past and the cards are in the distance.
  // Just past the −0.5 boundary (0.2222): a one-pixel scroll rounding would
  // otherwise land a hair inside the overture on some viewports.
  await scrollToFraction(page, 0.23)
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  await scrollToFraction(page, 0.3333)
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  // Exactly reversible.
  await scrollToFraction(page, 0)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
})

test('clicking the settled card opens its project', async ({ page }) => {
  await openScene(page)
  await scrollToFraction(page, 0.3333)
  const href = (await page.locator('#projects .scene-skiplink').first().getAttribute('href'))!

  // The settled card's projected rect, from the same geometry the scene uses.
  const { width, height } = page.viewportSize()!
  const { card } = frameRects(sceneGeometry(width, height))
  await page.mouse.click(((card.left + card.right) / 2) * width, ((card.top + card.bottom) / 2) * height)
  await expect(page).toHaveURL(new RegExp(href.replace(/[/]/g, '\\/')))
})

test('clicking a distant card scrolls it into the slot', async ({ page }) => {
  await openScene(page)
  await scrollToFraction(page, 0.3333)
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

test('the project index skip-link navigates to its project', async ({ page }) => {
  await openScene(page)
  await scrollToFraction(page, 0.3333)

  const link = page.locator('#projects .scene-skiplink').first()
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
  await scrollToFraction(page, 0.3333)

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
