import { test, expect, type Page } from '@playwright/test'

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
