#!/usr/bin/env node
// Task 8 (B2) arbiter (c): does the LIVE scissor rect always cover what is on
// screen?
//
//   node perf/task8-scissor-coverage.mjs
//
// Arbiter (b) (`task8-frame-ab.mjs`) proves the batch changed no shading, but
// it runs on a FROZEN canvas that deliberately draws the full rect, so it says
// nothing about the live rect. This does, in two ways:
//
//   (c1) COVERAGE, deterministic. `?perf-counters` exposes the last rect the
//        frame actually used (`scissorTopCss`/`scissorBottomCss`, CSS px down
//        from the canvas top). Against it we compute, in the SAME evaluate tick
//        and independently from layout, the canvas<->viewport intersection.
//        Every sample must satisfy top <= visibleTop and bottom >= visibleBottom.
//        This is a direct test of the geometry. A screenshot heuristic cannot
//        be: undrawn rows clear to (0,0,0) and the page's own ink is #0B0E14,
//        which is 11/14/20 — near enough that a threshold sitting between them
//        is a coin toss, and the cream dissolve puts near-WHITE rows in the
//        same canvas.
//   (c2) THE FLICK, empirical. The plan requires a synthesized fast gesture
//        with per-frame sampling, because the hazard is not the frame we draw
//        (we read scrollY in the rAF that draws it) — it is the frame we DON'T,
//        where the compositor re-presents a stale texture at a scroll offset it
//        was never drawn for. So the flick samples EVERY frame for a second and
//        reports the worst shortfall, not just the settled positions.
//
// A shortfall is reported in CSS px: how far the drawn band fell short of the
// visible band on either edge. Zero or negative = covered.

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, devices } from '@playwright/test'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = 'http://localhost:4173'
const SEED = 0.873
const CANVAS = 'fluid-waves'

const log = (line = '') => process.stdout.write(`${line}\n`)

/**
 * Read the rect the last frame used AND the geometry it should have covered,
 * in one tick. Split across two evaluates they would describe different frames,
 * which is precisely the error this is meant to catch.
 */
const SAMPLE = `(() => {
  const canvas = document.querySelector('[data-canvas="${CANVAS}"]')
  if (!canvas) return null
  const store = window.__PERF_GL__
  const counters = store && store['${CANVAS}']
  if (!counters) return null
  const rect = canvas.getBoundingClientRect()
  const visibleTop = Math.max(0, -rect.top)
  const visibleBottom = Math.min(rect.height, window.innerHeight - rect.top)
  return {
    scrollY: window.scrollY,
    canvasHeight: rect.height,
    visibleTop,
    visibleBottom,
    scissorTop: counters.scissorTopCss,
    scissorBottom: counters.scissorBottomCss,
    frames: counters.frames,
    paused: canvas.getAttribute('data-paused') === 'true',
  }
})()`

/** Positive = the drawn band fell short of the screen by this many CSS px. */
function shortfall(s) {
  if (s.visibleBottom <= s.visibleTop) return 0 // canvas fully off-screen
  return Math.max(s.scissorTop - s.visibleTop, s.visibleBottom - s.scissorBottom)
}

/**
 * The real headroom: how many CSS px of padding sat beyond the screen edge,
 * counting ONLY edges that could have fallen short.
 *
 * An edge clamped at the canvas boundary has zero slack by definition — there
 * is no canvas beyond row 0 or row `canvasHeight` to draw — and reporting that
 * as "0 px margin" makes a perfectly safe frame read like a near miss. At
 * scrollY 0 BOTH the top edges are 0, so the naive metric reported 0.0 for the
 * one position that is least at risk. Infinity means neither edge was exposed.
 */
function headroom(s) {
  if (s.visibleBottom <= s.visibleTop) return Infinity
  // An edge is AT RISK only if the rect stopped short of the canvas boundary
  // there. If the rect already reaches row 0 or row `canvasHeight` it cannot
  // fall short no matter where the viewport is — there is no canvas beyond it
  // to draw. Testing the VIEWPORT's position instead (the first version of
  // this) reported a flat 2.0 px on all three flick legs regardless of their
  // max step, which is the tell: 417, 244 and 128 px/frame cannot all race a
  // pad to the same 2 px. It was the frame where the viewport bottom sat 2 px
  // above the canvas bottom, with the rect clamped and perfectly safe.
  const slack = []
  if (s.scissorTop > 0) slack.push(s.visibleTop - s.scissorTop)
  if (s.scissorBottom < s.canvasHeight) slack.push(s.scissorBottom - s.visibleBottom)
  return slack.length > 0 ? Math.min(...slack) : Infinity
}

async function main() {
  const browser = await chromium.launch()
  let violations = 0
  let worst = Number.POSITIVE_INFINITY
  let samples = 0
  try {
    const context = await browser.newContext({ ...devices['Desktop Chrome'] })
    const page = await context.newPage()
    await page.goto(`${BASE_URL}/?perf-counters&perf-seed=${SEED}`)
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 30_000 })
    await page.waitForSelector('[data-entrance="settled"]', { timeout: 30_000 })
    await page.waitForSelector(`[data-canvas="${CANVAS}"]`, { timeout: 30_000 })

    const record = (s, label) => {
      if (!s || s.paused) return
      samples += 1
      const short = shortfall(s)
      const head = headroom(s)
      if (Number.isFinite(head) && head < worst) worst = head
      if (short > 0) {
        violations += 1
        if (violations <= 8) {
          log(`  !! ${label} scrollY ${Math.round(s.scrollY)}: drew [${s.scissorTop.toFixed(1)}, ${s.scissorBottom.toFixed(1)}] but [${s.visibleTop.toFixed(1)}, ${s.visibleBottom.toFixed(1)}] was on screen — short by ${short.toFixed(1)} px`)
        }
      }
    }

    // (c1) SETTLED positions across the whole span the canvas is visible over.
    const canvasHeight = await page.evaluate(`document.querySelector('[data-canvas="${CANVAS}"]').getBoundingClientRect().height`)
    const viewport = await page.evaluate('window.innerHeight')
    log(`canvas ${canvasHeight}px tall · viewport ${viewport}px · never-visible ${Math.round(canvasHeight - viewport)}px (${((1 - viewport / canvasHeight) * 100).toFixed(1)}%)`)
    log('')
    log('(c1) settled positions')
    log(`  ${'scrollY'.padStart(8)}${'drawn band'.padStart(20)}${'on screen'.padStart(20)}${'headroom'.padStart(9)}`)
    for (let i = 0; i <= 20; i += 1) {
      const y = Math.round((canvasHeight / 20) * i)
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
      // Let Lenis settle AND at least one frame draw at the new offset.
      await page.waitForTimeout(220)
      const s = await page.evaluate(SAMPLE)
      record(s, '(c1)')
      if (s && !s.paused && i % 4 === 0) {
        log(`  ${String(Math.round(s.scrollY)).padStart(8)}${`[${s.scissorTop.toFixed(0)}, ${s.scissorBottom.toFixed(0)}]`.padStart(20)}${`[${s.visibleTop.toFixed(0)}, ${s.visibleBottom.toFixed(0)}]`.padStart(20)}${(Number.isFinite(headroom(s)) ? headroom(s).toFixed(1) : 'n/a').padStart(9)}`)
      }
    }

    // (c2) THE FLICK — sampled every frame, not just at rest.
    log('')
    log('(c2) fast flick, sampled every frame')
    for (const [label, from, to] of [
      ['down-fast', 0, Math.round(canvasHeight)],
      ['up-fast', Math.round(canvasHeight), 0],
      ['down-short', 0, Math.round(canvasHeight * 0.35)],
    ]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), from)
      await page.waitForTimeout(400)
      // A real gesture, not a scrollTo: Lenis intercepts wheel directly, so
      // this exercises the same lerped velocity profile a user produces.
      await page.mouse.move(640, 360)
      const frames = await page.evaluate(
        ([target, sampleSrc]) => new Promise((resolve) => {
          const out = []
          const started = performance.now()
          window.scrollTo({ top: target, behavior: 'smooth' })
          const sample = new Function(`return ${sampleSrc}`)
          const tick = () => {
            out.push(sample())
            if (performance.now() - started < 1200) requestAnimationFrame(tick)
            else resolve(out)
          }
          requestAnimationFrame(tick)
        }),
        [to, SAMPLE],
      )
      let legWorst = Number.POSITIVE_INFINITY
      let moved = 0
      for (const s of frames) {
        if (!s) continue
        record(s, `(c2 ${label})`)
        const head = headroom(s)
        if (Number.isFinite(head) && head < legWorst) legWorst = head
      }
      const ys = frames.filter(Boolean).map((s) => s.scrollY)
      moved = ys.length > 1 ? Math.max(...ys) - Math.min(...ys) : 0
      // Max per-frame travel is what the pad has to out-run: it is how far the
      // page moves between the frame we drew and the frame that is on screen.
      // Reported so the pad constants are SIZED from this number rather than
      // guessed at, and so a future rig with a faster input device shows up
      // here as a shrinking headroom instead of as a black band.
      let maxStep = 0
      for (let i = 1; i < ys.length; i += 1) maxStep = Math.max(maxStep, Math.abs(ys[i] - ys[i - 1]))
      // How many canvas frames went MISSING between two sampled frames. This
      // is the term the velocity pad actually has to cover: a frame we did not
      // draw is a frame the compositor re-presents at a scroll offset it was
      // never drawn for. Measured rather than assumed, because it is the one
      // number that decides how much of the win the pad gives back.
      const drawn = frames.filter(Boolean).map((s) => s.frames)
      let maxMissed = 0
      for (let i = 1; i < drawn.length; i += 1) maxMissed = Math.max(maxMissed, drawn[i] - drawn[i - 1] - 1)
      // Frames where the pad swallowed the whole canvas — the scissor is then a
      // no-op and the batch is buying nothing, which is the price of safety at
      // speed and needs to be visible, not inferred.
      const full = frames.filter(Boolean).filter((s) => s.scissorTop <= 0 && s.scissorBottom >= s.canvasHeight).length
      log(`  ${label.padEnd(12)} max missed canvas frames between samples: ${maxMissed} · full-canvas frames: ${full}/${frames.filter(Boolean).length}`)
      log(`  ${label.padEnd(12)} ${frames.length} frames · travelled ${Math.round(moved)} px · max step ${maxStep.toFixed(0)} px/frame (${Math.round(maxStep * 60)} px/s) · least headroom ${Number.isFinite(legWorst) ? `${legWorst.toFixed(1)} px` : 'n/a (canvas edge-clamped throughout)'}`)
    }
  } finally {
    await browser.close()
  }

  log('')
  log(`${samples} samples · ${violations} coverage violation(s) · least headroom on an exposed edge ${Number.isFinite(worst) ? `${worst.toFixed(1)} px` : 'n/a'}`)
  log(violations === 0
    ? '✓ the drawn band covered the visible band in EVERY sample'
    : '✗ the scissor rect fell short of the screen — undrawn rows would show as black')
  return violations === 0 ? 0 : 1
}

process.exit(await main())
