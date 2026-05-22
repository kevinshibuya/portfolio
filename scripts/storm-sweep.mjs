import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

mkdirSync('tmp/storm-sweep-v2', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => console.error('[pageerror]', e.message))
await page.goto('http://localhost:4173/', { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(2500)
await page.locator('#about').scrollIntoViewIfNeeded()
await page.waitForTimeout(800)

const stops = [0, 0.083, 0.125, 0.25, 0.417, 0.5, 0.583, 0.75, 0.917, 1.0]

for (const p of stops) {
  await page.evaluate((prog) => {
    const el = document.querySelector('#about')
    const rect = el.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const h = rect.height
    const vh = window.innerHeight
    window.scrollTo(0, top + prog * (h - vh))
  }, p)
  await page.waitForTimeout(900)
  const name = String(p).replace('.', '_').padEnd(5, '0')
  await page.screenshot({ path: `tmp/storm-sweep-v2/p${name}.png`, fullPage: false })
  console.log(`captured p=${p}`)
}

await browser.close()
