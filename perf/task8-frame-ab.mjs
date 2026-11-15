#!/usr/bin/env node
// Task 8 (B2) arbiter (b): frozen-frame A/B across the scroll span.
//
//   node perf/task8-frame-ab.mjs capture <outDir>
//   node perf/task8-frame-ab.mjs diff <dirA> <dirB>
//
// The plan requires "frozen-frame A/B at >=6 scroll offsets spanning hero-top
// -> stage-arrival — capture with perf-seed/freeze/role pinned on the pre-batch
// build, re-capture identically post-batch, every pair must diff within
// pixel-gate tolerance". This is BATCH-LOCAL EVIDENCE, deliberately not a
// committed golden: the pixel gate owns the golden set, and adding scroll
// offsets to it would mean regenerating goldens during an optimization
// campaign, which its own rule 1 forbids.
//
// WHAT IT CAN AND CANNOT PROVE. A `?perf-freeze` canvas draws exactly one frame
// and never redraws, so these captures prove the batch did not change the
// SHADING at any scroll offset. They do NOT exercise the live scissor rect —
// that is arbiter (c)'s job — because the frozen frame deliberately draws the
// full canvas (see the FROZEN FRAME note in FluidWaves.tsx). Stating that here
// so nobody reads a green diff as more than it is.
//
// The server is `npx vite preview` on 4173, matching the perf harness rather
// than the Playwright config's `wrangler dev`: the two capture halves have to
// be served identically, and vite preview is the one this campaign measures on.

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, devices } from '@playwright/test'
import sharp from 'sharp'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = 'http://localhost:4173'

const SEED = 0.873
const FREEZE = 2
const ROLE = 0

// Pixel-gate tolerance, verbatim (`tests/e2e/pixel-gate.spec.ts` SHOT).
const THRESHOLD = 0.05
const MAX_DIFF_PIXEL_RATIO = 0.001

const log = (line = '') => process.stdout.write(`${line}\n`)

/**
 * The scroll offsets, derived from layout rather than hardcoded so they keep
 * meaning if the section heights change: hero top, three points down the hero
 * (including the dissolve band the shader work actually touches), the hero/stage
 * seam, and two inside the pinned stage. Eight, where the plan asks for six.
 */
async function scrollOffsets(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('#top')
    const wrap = document.querySelector('#projects .stack-scroll')
    if (!hero || !wrap) throw new Error('#top or #projects .stack-scroll not found')
    const heroTop = hero.getBoundingClientRect().top + window.scrollY
    const heroBottom = hero.getBoundingClientRect().bottom + window.scrollY
    const heroHeight = heroBottom - heroTop
    const stackTop = wrap.getBoundingClientRect().top + window.scrollY
    const stackHeight = wrap.getBoundingClientRect().height
    const vh = window.innerHeight
    return [
      { name: '1-hero-top', y: heroTop },
      { name: '2-hero-quarter', y: heroTop + heroHeight * 0.25 },
      { name: '3-hero-half', y: heroTop + heroHeight * 0.5 },
      { name: '4-dissolve', y: Math.max(0, heroBottom - vh) },
      { name: '5-hero-exit', y: heroBottom - vh * 0.25 },
      { name: '6-stage-entry', y: stackTop },
      { name: '7-stage-first-card', y: stackTop + stackHeight * 0.12 },
      { name: '8-stage-mid', y: stackTop + stackHeight * 0.4 },
    ].map((o) => ({ ...o, y: Math.round(Math.max(0, o.y)) }))
  })
}

async function capture(outDir) {
  mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({ ...devices['Desktop Chrome'] })
    const page = await context.newPage()
    // Same scrollbar-gutter pin the pixel gate uses: macOS flips between
    // overlay and classic scrollbars, and an ~11px gutter appearing between the
    // two halves of an A/B would read as a paint change.
    await context.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const style = document.createElement('style')
        style.textContent = 'html { scrollbar-gutter: auto !important; }'
        document.head.appendChild(style)
      })
    })

    await page.goto(`${BASE_URL}/?perf-seed=${SEED}&perf-freeze=${FREEZE}&perf-role=${ROLE}`)
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 30_000 })
    await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]', { timeout: 30_000 })
    // The HERO TEXT RISE has to be settled before the first shot, not just the
    // loader. Found the hard way: without this the y=0 capture raced the
    // staggered name/role rise and the two halves differed on 9596 px in a box
    // at x 81..665 / y 325..675 — exactly the bottom-left signature name, while
    // every scrolled offset was byte-identical. A full-bleed canvas change
    // could never localise like that; an entrance mid-flight is the only thing
    // that can, and an arbiter that reports it as a paint diff is an arbiter
    // that cries wolf on the one shot it matters most on.
    await page.waitForSelector('[data-entrance="settled"]', { timeout: 30_000 })
    await page.waitForTimeout(400)

    // A context-loss fallback screenshots cleanly and would diff green against
    // itself — the one failure this arbiter must never call a pass.
    const fellBack = await page.locator('[data-testid="fluid-waves-fallback"]').count()
    if (fellBack > 0) throw new Error('the hero canvas fell back to the gradient div — WebGL context lost; this capture proves nothing')

    const offsets = await scrollOffsets(page)
    for (const offset of offsets) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), offset.y)
      // Two rAFs so scroll-derived state has published and re-rendered, then a
      // short settle for anything the scroll started.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null)))))
      await page.waitForTimeout(250)
      await page.screenshot({ path: path.join(outDir, `${offset.name}.png`) })
      log(`  captured ${offset.name} @ y=${offset.y}`)
    }
    log(`captured ${offsets.length} offsets -> ${path.relative(REPO_ROOT, outDir)}`)
  } finally {
    await browser.close()
  }
}

/**
 * Per-pixel max-channel distance, normalised to 0..1, counted against the
 * pixel gate's own threshold and ratio. Deliberately STRICTER than pixelmatch's
 * YIQ metric rather than an approximation of it — an arbiter that is looser
 * than the gate it borrows its numbers from would pass things the gate fails.
 */
async function diff(dirA, dirB) {
  const names = readdirSync(dirA).filter((f) => f.endsWith('.png')).sort()
  if (names.length === 0) throw new Error(`no PNGs in ${dirA}`)
  let worst = 0
  let failures = 0
  log(`${'offset'.padEnd(24)}${'diff px'.padStart(10)}${'ratio'.padStart(12)}${'identical'.padStart(11)}  verdict`)
  for (const name of names) {
    const bPath = path.join(dirB, name)
    if (!existsSync(bPath)) throw new Error(`${name} is missing from ${dirB} — the two captures are not comparable`)
    const [a, b] = await Promise.all([
      sharp(path.join(dirA, name)).raw().toBuffer({ resolveWithObject: true }),
      sharp(bPath).raw().toBuffer({ resolveWithObject: true }),
    ])
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      throw new Error(`${name}: ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height} — different geometry, not comparable`)
    }
    const channels = a.info.channels
    const pixels = a.info.width * a.info.height
    let differing = 0
    let identical = true
    for (let i = 0; i < pixels; i += 1) {
      let maxDelta = 0
      for (let c = 0; c < Math.min(channels, 3); c += 1) {
        const d = Math.abs(a.data[i * channels + c] - b.data[i * channels + c])
        if (d > maxDelta) maxDelta = d
      }
      if (maxDelta !== 0) identical = false
      if (maxDelta / 255 > THRESHOLD) differing += 1
    }
    const ratio = differing / pixels
    if (ratio > worst) worst = ratio
    const pass = ratio <= MAX_DIFF_PIXEL_RATIO
    if (!pass) failures += 1
    log(`${name.padEnd(24)}${String(differing).padStart(10)}${ratio.toFixed(6).padStart(12)}${String(identical).padStart(11)}  ${pass ? 'pass' : 'FAIL'}`)
  }
  log('')
  log(`worst ratio ${worst.toFixed(6)} against a limit of ${MAX_DIFF_PIXEL_RATIO} — ${failures === 0 ? 'ALL PAIRS WITHIN PIXEL-GATE TOLERANCE' : `${failures} PAIR(S) OUT OF TOLERANCE`}`)
  return failures === 0 ? 0 : 1
}

const [mode, ...rest] = process.argv.slice(2)
if (mode === 'capture' && rest[0]) {
  await capture(path.resolve(REPO_ROOT, rest[0]))
} else if (mode === 'diff' && rest[0] && rest[1]) {
  process.exit(await diff(path.resolve(REPO_ROOT, rest[0]), path.resolve(REPO_ROOT, rest[1])))
} else {
  process.stderr.write('usage: task8-frame-ab.mjs capture <outDir> | diff <dirA> <dirB>\n')
  process.exit(2)
}
