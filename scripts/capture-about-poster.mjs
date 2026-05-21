// One-off poster capture for the About fallback. Loads the production
// build at http://localhost:4173, scrolls the About section to progress
// 0.25 (storm peak — robot front-facing, fully assembled, ~25% of viewport),
// and crops a 640x640 centered on the canvas.
//
// Run: npm run preview (in another terminal) then
//      node scripts/capture-about-poster.mjs

import { chromium } from 'playwright'
import sharp from 'sharp'

const URL = 'http://localhost:4173/'
const VIEWPORT = { width: 1440, height: 900 }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'no-preference' })
const page = await ctx.newPage()
await page.goto(URL, { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(3000)

// Wait for #about to be present (desktop branch may need a tick for useMediaQuery)
await page.waitForSelector('#about', { timeout: 8000 })

// Find the About outer and compute the scrollY where progress ~= 0.4.
const aboutBox = await page.evaluate(() => {
  const el = document.querySelector('#about')
  if (!el) throw new Error('#about not found')
  const r = el.getBoundingClientRect()
  return { top: r.top + window.scrollY, height: r.height }
})
// useScroll with ['start start','end end'] yields progress 0..1 over
// (aboutHeight - viewportHeight). Target progress 0.25 = peak pose.
const targetY = Math.round(aboutBox.top + 0.25 * (aboutBox.height - VIEWPORT.height))
await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), targetY)
await page.waitForTimeout(1500)

// Screenshot full viewport, then crop a 640x640 centered on the canvas.
const fullPath = '/tmp/about-poster-full.png'
await page.screenshot({ path: fullPath, fullPage: false })

const cx = VIEWPORT.width / 2
const cy = VIEWPORT.height / 2
await sharp(fullPath)
  .extract({ left: cx - 320, top: cy - 320, width: 640, height: 640 })
  .png({ quality: 100 })
  .toFile('public/images/about-toy-poster.png')
await sharp(fullPath)
  .extract({ left: cx - 320, top: cy - 320, width: 640, height: 640 })
  .webp({ quality: 80 })
  .toFile('public/images/about-toy-poster.webp')

await browser.close()
console.log('✓ poster written to public/images/about-toy-poster.{webp,png}')
