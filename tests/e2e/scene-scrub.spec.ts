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

  const pill = page.locator('#projects .scene-meta-pill')
  const href = await pill.getAttribute('href')
  expect(href).toMatch(/^\/projects\//)

  await pill.click()
  await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')))
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
