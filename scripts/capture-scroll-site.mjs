#!/usr/bin/env node
// Capture a scroll-driven site as a frame sequence + per-frame runtime state.
//
// Usage:
//   node scripts/capture-scroll-site.mjs <url> [--out <dir>] [--steps <n>] [--width <px>] [--height <px>] [--wait <ms>]
//
// Outputs into <dir> (default /tmp/scroll-capture):
//   frame-000.png … frame-NNN.png         viewport screenshots at each scroll step
//   state.json                            { url, viewport, steps:[{i,scrollY,docHeight,activeAnimated,gsap,lenis,intersecting}] }
//   page.html                             initial DOM snapshot
//   resources.json                        list of script/stylesheet URLs the page loaded
//
// Why this exists: I can't watch video, but for scroll-driven animations a
// scripted sweep with per-frame state inspection is strictly more useful — it
// gives me deterministic frames *and* the underlying transforms/timelines.

import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
if (args.length === 0 || args[0].startsWith('--')) {
  console.error('usage: node scripts/capture-scroll-site.mjs <url> [--out dir] [--steps n] [--width px] [--height px] [--wait ms]')
  process.exit(1)
}

const url = args[0]
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}
const outDir = resolve(flag('out', '/tmp/scroll-capture'))
const steps = Number(flag('steps', 30))
const width = Number(flag('width', 1440))
const height = Number(flag('height', 900))
const waitMs = Number(flag('wait', 800))

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
})
const page = await ctx.newPage()

const resources = []
page.on('response', (res) => {
  const ct = res.headers()['content-type'] || ''
  if (ct.includes('javascript') || ct.includes('css') || res.url().endsWith('.js') || res.url().endsWith('.css')) {
    resources.push({ url: res.url(), status: res.status(), type: ct })
  }
})

console.log(`→ navigating to ${url}`)
await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
await page.waitForTimeout(waitMs)

// Snapshot DOM + resources before we start scrolling
await writeFile(`${outDir}/page.html`, await page.content())
await writeFile(`${outDir}/resources.json`, JSON.stringify(resources, null, 2))

const docHeight = await page.evaluate(() => Math.max(
  document.documentElement.scrollHeight,
  document.body.scrollHeight,
))
const maxScroll = Math.max(0, docHeight - height)
console.log(`→ doc height: ${docHeight}px, max scroll: ${maxScroll}px, capturing ${steps} frames`)

const stepData = []

for (let i = 0; i < steps; i++) {
  const t = steps === 1 ? 0 : i / (steps - 1)
  const y = Math.round(maxScroll * t)

  await page.evaluate((targetY) => {
    // Bypass smooth scroll libraries — they make capture nondeterministic.
    // Many sites wrap window.scrollTo; we set the native scroll directly and
    // also dispatch a synthetic scroll event so listeners fire.
    window.scrollTo({ top: targetY, behavior: 'instant' })
    document.documentElement.scrollTop = targetY
    document.body.scrollTop = targetY
    window.dispatchEvent(new Event('scroll'))
  }, y)

  // Settle: rAF a few times so any scroll-driven transforms update.
  await page.evaluate(() => new Promise((r) => {
    let n = 0
    const tick = () => (++n < 6 ? requestAnimationFrame(tick) : r())
    requestAnimationFrame(tick)
  }))
  await page.waitForTimeout(120)

  const idx = String(i).padStart(3, '0')
  await page.screenshot({ path: `${outDir}/frame-${idx}.png`, fullPage: false })

  const state = await page.evaluate(() => {
    const out = {
      scrollY: window.scrollY,
      innerHeight: window.innerHeight,
      docHeight: document.documentElement.scrollHeight,
    }

    // Library detection
    out.libs = {
      gsap: typeof window.gsap !== 'undefined' ? window.gsap.version : null,
      scrollTrigger: typeof window.ScrollTrigger !== 'undefined',
      lenis: typeof window.lenis !== 'undefined' || typeof window.__lenis !== 'undefined',
      three: typeof window.THREE !== 'undefined',
      framerMotion: !!document.querySelector('[data-framer-component-type]'),
    }

    // Active ScrollTriggers
    if (typeof window.ScrollTrigger !== 'undefined' && window.ScrollTrigger.getAll) {
      out.scrollTriggers = window.ScrollTrigger.getAll().map((st) => ({
        trigger: st.trigger?.tagName + (st.trigger?.className ? '.' + st.trigger.className.split(' ').slice(0,2).join('.') : ''),
        start: st.start,
        end: st.end,
        progress: Number(st.progress?.toFixed(3)),
        isActive: st.isActive,
        pin: !!st.pin,
      }))
    }

    // Elements currently animated (non-identity transform or non-default opacity)
    // within or near the viewport.
    const inViewport = (rect) => rect.bottom > -200 && rect.top < window.innerHeight + 200
    const animated = []
    const all = document.querySelectorAll('body *')
    for (const el of all) {
      if (animated.length > 40) break
      const rect = el.getBoundingClientRect()
      if (!inViewport(rect)) continue
      const cs = getComputedStyle(el)
      const t = cs.transform
      const op = parseFloat(cs.opacity)
      if ((t && t !== 'none') || (op < 0.99 && op > 0)) {
        animated.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 80) : '',
          id: el.id || '',
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
          transform: t,
          opacity: op,
          text: (el.textContent || '').trim().slice(0, 40),
        })
      }
    }
    out.animated = animated

    // Visible section-like elements
    const sections = []
    document.querySelectorAll('section, [data-section], main > div, main > section').forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        sections.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || el.getAttribute('data-section') || '',
          cls: (typeof el.className === 'string') ? el.className.slice(0, 80) : '',
          y: Math.round(rect.top),
          h: Math.round(rect.height),
        })
      }
    })
    out.sections = sections

    // Canvas presence (Three.js / WebGL)
    out.canvases = Array.from(document.querySelectorAll('canvas')).map((c) => ({
      w: c.width, h: c.height, cls: typeof c.className === 'string' ? c.className.slice(0, 60) : '',
      visible: c.getBoundingClientRect().bottom > 0 && c.getBoundingClientRect().top < window.innerHeight,
    }))

    return out
  })

  stepData.push({ i, t: Number(t.toFixed(3)), targetY: y, ...state })
  process.stdout.write(`\r→ frame ${i + 1}/${steps} (scroll ${y}px)`)
}
process.stdout.write('\n')

await writeFile(`${outDir}/state.json`, JSON.stringify({
  url,
  viewport: { width, height },
  docHeight,
  maxScroll,
  steps: stepData,
}, null, 2))

await browser.close()
console.log(`✓ wrote ${steps} frames + state to ${outDir}`)
