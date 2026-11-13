import { test, expect } from '@playwright/test'
import { scrollToPlayhead, scrollToActTwo, beats, CANVAS } from './helpers/scene'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

/** Reduced motion renders ON DEMAND, so every stop needs the longer settle. */
const SETTLE = { settle: 220 }

test('reduced motion keeps the pin and swaps cards without flight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()

  await scrollToPlayhead(page, 0, SETTLE)

  // The section still pins.
  const stickyTop = await page.evaluate(
    () => document.querySelector('#projects .scene-sticky')!.getBoundingClientRect().top,
  )
  expect(Math.abs(stickyTop)).toBeLessThanOrEqual(4)

  // On demand, one static frame, and no SVG filter left over from the old title.
  await expect(
    page.locator('#projects canvas[data-canvas="selected-work-scene"]'),
  ).toHaveAttribute('data-static', 'true')
  await expect(page.locator('#projects svg filter')).toHaveCount(0)

  // The settled slot is reported on the canvas itself; there is no DOM overlay.
  const canvas = page.locator(CANVAS)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // The overture is a still frame at the top and absent once the cards show.
  await expect(canvas).toHaveAttribute('data-overture', 'false')
  await scrollToPlayhead(page, -1.5, SETTLE)
  await expect(canvas).toHaveAttribute('data-overture', 'true')
  await scrollToPlayhead(page, 0, SETTLE)
  await expect(canvas).toHaveAttribute('data-overture', 'false')

  // Short of the segment midpoint (playhead 0.48): still card 0.
  await scrollToPlayhead(page, 0.48, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '0')

  // Past the midpoint (playhead 0.75): reduced motion has already snapped to
  // card 1 with no flight.
  await scrollToPlayhead(page, 0.75, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '1')

  // Next card settled, then back: scroll is the playhead, exactly reversible.
  await scrollToPlayhead(page, 1, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '1')
  await scrollToPlayhead(page, 0, SETTLE)
  await expect(canvas).toHaveAttribute('data-slot', '0')
})

test('reduced motion renders act two as stills, and a still does not drift', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-canvas-wrap[data-ready="true"]').waitFor()
  await page.locator(`${CANVAS}[data-warm="true"]`).waitFor({ timeout: 30000 })
  const stills = page.locator(CANVAS)

  await scrollToActTwo(page, 0.5, SETTLE)
  await expect(stills).toHaveAttribute('data-act', '2')
  await expect(stills).toHaveAttribute('data-static', 'true')
  await expect(stills).toHaveAttribute('data-slot', '3')
  expect(problems).toEqual([])

  // BLOCKED, and deliberately not asserted here. The plan asks this spec to
  // sample `window.__scene`'s camera and title index at two `u` values inside
  // ONE still interval. It cannot: the e2e suite serves the PRODUCTION preview
  // (`playwright.config.ts` webServer is `npm run preview`, i.e. build +
  // wrangler dev), and the `__scene` handle sits behind `import.meta.env.DEV`
  // in SceneRig, so it is stripped from that build. Exposing it in production
  // would be a source change, which this task's boundary forbids.
  //
  // What the unit suite proves is NOT the same property, and the gap matters:
  // it shows `sceneMotion`'s act-two functions are pure in `u` given a still
  // descriptor, across twenty samples in each of the five intervals. The
  // assertion this replaces would have shown that SceneRig feeds them the
  // DESCRIPTOR's `u` and not the live one. Swap `uAct` back in at any of the
  // rig's four still reads and every test in this branch stays green while a
  // reduced-motion reader gets exactly the drift Assumption 10 forbids. That
  // wiring is correct by inspection today and unproven by any test.
  //
  // The cheap proof, for whoever next touches this file: write the still index
  // imperatively onto `gl.domElement` the way `data-slot` and `data-act`
  // already are — no DEV guard, so it survives the preview build — and assert
  // it is identical at two `u` inside one interval. That is a source change,
  // which this task's boundary forbids.
  //
  // What these two stops add is the production-visible half: the same still
  // interval, sampled twice, staying in act two with no console error.
  const { approach } = await beats(page)
  for (const u of [approach + 0.02, approach + 0.04]) {
    await scrollToActTwo(page, u, SETTLE)
    await expect(stills, `act two u=${u}`).toHaveAttribute('data-act', '2')
    await expect(stills, `act two u=${u}`).toHaveAttribute('data-static', 'true')
    expect(problems, `act two u=${u}`).toEqual([])
  }

  await scrollToPlayhead(page, 0, SETTLE)
  await expect(stills).toHaveAttribute('data-act', '1')
  expect(problems).toEqual([])
})
