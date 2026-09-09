// scripts/scene-title-identity.mjs · node scripts/scene-title-identity.mjs <out.json> [devUrl]
//
// The act-one identity dump: camera pose, title scale, title z and the four
// act-one title metrics at six playheads across six viewports, read off the
// running dev server through the DEV-only `window.__scene` handle.
//
// The "before" run happens on untouched code; the "after" run happens once act
// two is in the frame loop, and the two files must diff empty except, if at
// all, the camera's `far` (the act-two far plane, Assumption 12).
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
const [, , out, url = 'http://localhost:5173/'] = process.argv
const VIEWPORTS = [
  [1440, 900],
  [1920, 1080],
  [1280, 720],
  [393, 851],
  [820, 821],
  [960, 950],
]
const PLAYHEADS = [-1.5, -0.5, 0, 1, 2, 3]
const browser = await chromium.launch()
const result = {}
for (const [width, height] of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(url)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page
    .locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]')
    .waitFor({ timeout: 30000 })
  const samples = {}
  for (const playhead of PLAYHEADS) {
    await page.evaluate((p) => {
      const wrapper = document.querySelector('#projects .scene-scroll')
      const top = wrapper.getBoundingClientRect().top + window.scrollY
      // One playhead unit is 100 svh; svh equals innerHeight in headless Chromium.
      window.scrollTo({ top: top + (p + 1.5) * window.innerHeight, behavior: 'instant' })
    }, playhead)
    await page.waitForTimeout(500)
    samples[playhead] = await page.evaluate(() => {
      const s = window.__scene
      const camera = window.__sceneCamera?.current ?? null
      const r = (v) => Math.round(v * 1e6) / 1e6
      return {
        camera: camera
          ? [
              r(camera.position.x),
              r(camera.position.y),
              r(camera.position.z),
              r(camera.rotation.x),
              r(camera.rotation.y),
              r(camera.near),
              r(camera.far),
            ]
          : null,
        titleScale: s.title ? [r(s.title.scale.x), r(s.title.scale.y)] : null,
        titleZ: s.title ? r(s.title.position.z) : null,
        metrics: s.titleMetrics
          .slice(0, 4)
          .map((m) => [
            m.widthPx,
            m.heightPx,
            m.lineCount,
            r(m.drawnScale),
            m.baselinePx,
            m.inkTopPx,
            m.inkBottomPx,
          ]),
        slot: document.querySelector('#projects canvas').dataset.slot,
      }
    })
  }
  result[`${width}x${height}`] = samples
  await page.close()
}
await browser.close()
writeFileSync(out, JSON.stringify(result, null, 2))
