import { test, expect, type Page } from '@playwright/test'

/**
 * Scroll to a fraction of the scene's scrub range. The wrapper is 450svh over a
 * 100svh sticky stage, so useScroll's 0..1 spans (wrapperHeight - viewport):
 * fraction 0.15 lands card 0 settled, 0.43 lands card 1 settled.
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

/**
 * The overlay rides the card, which breathes, so its box drifts a pixel or two
 * every frame. Playwright's actionability loop can hit-test a point the element
 * has already moved off, and never converges. Assert the hit test ourselves —
 * which is the regression that actually matters, the canvas covering the pill —
 * then click without the retry loop.
 */
async function clickPill(page: Page): Promise<string> {
  const pill = page.locator('#projects .scene-meta-pill')
  await expect(pill).toBeVisible()
  const href = (await pill.getAttribute('href'))!
  const hitsPill = await page.evaluate(() => {
    const el = document.querySelector('#projects .scene-meta-pill')
    if (!el) return false
    const box = el.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return !!hit && el.contains(hit)
  })
  expect(hitsPill, 'the view pill must not be covered by the canvas').toBe(true)
  await pill.click({ force: true })
  return href
}

test('scrubbing the corridor swaps the front project, and reversing restores it', async ({
  page,
}) => {
  await openScene(page)

  await scrollToFraction(page, 0.15)
  const firstHref = await page.locator('#projects .scene-meta-pill').getAttribute('href')
  const firstSubtitle = await page.locator('#projects .scene-meta-subtitle').textContent()
  const firstTitle = await page.locator('#projects .scene-title-sr').textContent()

  // A settled card shows its overlay at full strength and takes clicks.
  await expect(page.locator('#projects .scene-meta-pill')).toBeVisible()
  await expect(page.locator('#projects .scene-meta')).toHaveCSS('opacity', '1')

  await scrollToFraction(page, 0.43)
  expect(await page.locator('#projects .scene-meta-pill').getAttribute('href')).not.toBe(firstHref)
  expect(await page.locator('#projects .scene-meta-subtitle').textContent()).not.toBe(firstSubtitle)
  expect(await page.locator('#projects .scene-title-sr').textContent()).not.toBe(firstTitle)

  // Scroll is the playhead: going back restores the earlier state exactly.
  await scrollToFraction(page, 0.15)
  expect(await page.locator('#projects .scene-meta-pill').getAttribute('href')).toBe(firstHref)
  expect(await page.locator('#projects .scene-title-sr').textContent()).toBe(firstTitle)
})

test('the settled card view pill navigates to its project', async ({ page }) => {
  await openScene(page)
  await scrollToFraction(page, 0.15)

  const href = await clickPill(page)
  expect(href).toMatch(/^\/projects\//)
  await expect(page).toHaveURL(new RegExp(href.replace(/[/]/g, '\\/')))
})

test('losing the webgl context falls back to a plain project list, permanently', async ({
  page,
}) => {
  await openScene(page)
  await scrollToFraction(page, 0.15)

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
