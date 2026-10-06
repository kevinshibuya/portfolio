// Act two and the stream, on the rig.
//
// WHAT IT MEASURES, AND WHY EACH MARK IS WHERE IT IS
//
// `warmMs` is THE SCENE'S OWN WARM-UP, not the loader's. The window opens
// where `SelectedWorkScene.tsx` opens it — `entranceDone.then(...)`, then
// `HERO_SETTLE_MS` (1500 ms), then `onIdle(warm, 2000)` — and closes where the
// scene closes it, `gl.domElement.dataset.warm = 'true'` in that effect's
// `finally`. So the marks are `[data-entrance="settled"]`, the DOM proxy for
// `entranceDone` the existing harness already waits on, and
// `canvas[data-canvas="selected-work-scene"][data-warm="true"]`.
//
// It deliberately does NOT start from `body[data-loader-state="done"]`. That
// attribute has two converging writers (`perf/decisions.md:395`), fires before
// the hero rise, and the 1500 ms settle plus an idle callback sit between it
// and the scene — a loader-anchored figure measures the ENTRANCE and reports it
// as the scene's cost.
//
// `data-frieze` is read alongside and recorded per run, so a run where the
// rasteriser refused the layout (`"failed"`) is never averaged in with the
// ready ones.
//
// STANDING PROHIBITION, inherited from `perf/dissolve-guard-search.mjs`: never
// fit a bound to this file's output. It reports what it measured, in the domain
// it printed; it does not decide anything.
//
// USAGE
//
//   node perf/act-two-probe.mjs [--runs 5] [--root <dir>] [--serve-off] [--phone]
//
// `--root` serves ANOTHER worktree's `dist/`, which is how the base and the
// after are measured on one rig without rebuilding either: the base is a
// separate worktree with its own `npm ci`, because chunk bytes and compile
// time both move with the lockfile.
//
// Prints one JSON line: the median over runs of `warmMs`, `maxLongTaskMs`,
// `frameP50Ms`, `frameP95Ms` and `domNodes`.

import { chromium } from 'playwright'
import {
  assertPageHealthy,
  launchRun,
  scenarioUrl,
  sleep,
  waitForSettledHero,
  VIEWPORT,
} from './lib/browser.mjs'
import { collect, framesIn, longTasksIn, now } from './lib/instrument.mjs'
import { INIT_SCRIPT } from './lib/instrument.mjs'
import { frameStats, median, round } from './lib/stats.mjs'
import { startPreview, distFingerprint } from './lib/server.mjs'
import { collectRig, rigMismatches } from './lib/rig.mjs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}
const RUNS = Number(flag('--runs', 5))
const SERVE_OFF = args.includes('--serve-off')
const TARGET_ROOT = resolve(flag('--root', ROOT))
const PHONE = args.includes('--phone')
const FORCE = args.includes('--force')

/** Fixed gesture speed in px/s, as `scroll-transition` pins it. */
const SCROLL_SPEED = 1200
const SETTLE_STABLE_MS = 500

const log = (...m) => console.error('[act-two-probe]', ...m)

async function waitForScrollSettle(page) {
  return page.evaluate(
    (stableMs) =>
      new Promise((done) => {
        let last = window.scrollY
        let since = performance.now()
        const tick = () => {
          if (window.scrollY !== last) {
            last = window.scrollY
            since = performance.now()
          }
          if (performance.now() - since >= stableMs) done(window.scrollY)
          else requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }),
    SETTLE_STABLE_MS,
  )
}

/** The wrapper's scrub geometry, from `data-svh` — never a 550 svh literal. */
async function wrapperGeometry(page) {
  return page.evaluate(() => {
    const w = document.querySelector('#projects .scene-scroll')
    if (!w) return null
    const top = w.getBoundingClientRect().top + window.scrollY
    const svh = Number(w.dataset.svh)
    const unit = w.offsetHeight / (svh / 100)
    return { top, svh, unit, height: w.offsetHeight, innerHeight: window.innerHeight }
  })
}

async function oneRun(url, viewport, deviceScaleFactor) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor,
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  await page.addInitScript(INIT_SCRIPT)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  const client = await context.newCDPSession(page)

  try {
    // ── warm: the SCENE's window, entrance-settled → canvas warm ──────────
    await page.goto(url, { waitUntil: 'commit' })
    await page.waitForSelector('[data-entrance="settled"]', { timeout: 60_000 })
    const warmStart = await now(page)
    const canvas = await page.waitForSelector(
      'canvas[data-canvas="selected-work-scene"][data-warm="true"]',
      { timeout: 60_000 },
    )
    const warmMs = (await now(page)) - warmStart
    const frieze = await page.evaluate(
      () => document.querySelector('canvas[data-canvas="selected-work-scene"]')?.dataset.frieze ?? null,
    )
    void canvas

    const geo = await wrapperGeometry(page)
    if (!geo) throw new Error('no .scene-scroll — is this a build with act two?')

    // ── the scrub: wrapper top to wrapper bottom at a fixed speed ─────────
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), geo.top)
    await sleep(600)
    const scrubStart = await now(page)
    await client.send('Input.synthesizeScrollGesture', {
      x: Math.round(viewport.width / 2),
      y: Math.round(viewport.height / 2),
      xDistance: 0,
      // CDP: positive yDistance scrolls UP. Down the page is negative.
      yDistance: -(geo.height - geo.innerHeight),
      speed: SCROLL_SPEED,
      gestureSourceType: 'mouse',
      repeatCount: 0,
    })
    await waitForScrollSettle(page)
    const scrubEnd = await now(page)

    // ── the dolly only: u from the approach's end to 1 ────────────────────
    const beats = await page.evaluate(() => {
      const w = document.querySelector('#projects .scene-scroll')
      const svh = Number(w.dataset.svh)
      const columns = (svh - 700) / 25
      const span = 100 + 50 + 25 * columns
      return { approach: (100 + 50) / span, columns }
    })
    const uToTop = (u) => geo.top + 4.5 * geo.unit + u * (geo.height - geo.unit - 4.5 * geo.unit)
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), uToTop(beats.approach))
    await sleep(900)
    const dollyStart = await now(page)
    await client.send('Input.synthesizeScrollGesture', {
      x: Math.round(viewport.width / 2),
      y: Math.round(viewport.height / 2),
      xDistance: 0,
      yDistance: -(uToTop(1) - uToTop(beats.approach)),
      speed: SCROLL_SPEED,
      gestureSourceType: 'mouse',
      repeatCount: 0,
    })
    await waitForScrollSettle(page)
    const dollyEnd = await now(page)

    const domNodes = await page.evaluate(
      () => document.querySelector('#archive')?.querySelectorAll('*').length ?? null,
    )

    const data = await collect(page)
    const scrubTasks = longTasksIn(data.longTasks, scrubStart, scrubEnd)
    const dollyFrames = framesIn(data.frames, dollyStart, dollyEnd)
    const stats = frameStats(dollyFrames, 1000 / 60)

    if (errors.length) throw new Error(`page errors: ${errors.map((e) => e).join(' | ')}`)

    return {
      warmMs,
      maxLongTaskMs: scrubTasks.length ? Math.max(...scrubTasks.map((t) => t.duration)) : 0,
      frameP50Ms: stats.p50,
      frameP95Ms: stats.p95,
      domNodes,
      frieze,
      columns: beats.columns,
      svh: geo.svh,
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

async function main() {
  const rig = await collectRig()
  let stored = null
  try {
    stored = JSON.parse(readFileSync(resolve(ROOT, 'perf/baseline.json'), 'utf8')).rig ?? null
  } catch {
    /* no baseline yet */
  }
  const mismatches = rigMismatches(rig, stored)
  if (mismatches.length && !FORCE) {
    log('RIG MISMATCH — refusing. A measurement taken here is not comparable:')
    for (const m of mismatches) log(`  ${m.key}: baseline ${m.baseline} vs current ${m.current}`)
    log('Fix the rig rather than passing --force.')
    process.exit(1)
  }

  let stop = () => {}
  let fingerprint = null
  if (!SERVE_OFF) {
    fingerprint = await distFingerprint(TARGET_ROOT)
    const server = await startPreview(TARGET_ROOT, log)
    stop = server.stop ?? (() => {})
    log(`serving ${TARGET_ROOT} (${fingerprint.distIndexHash.slice(0, 19)}…)`)
  }

  const viewport = PHONE ? { width: 390, height: 844 } : VIEWPORT
  const scale = PHONE ? 3 : 2
  const url = scenarioUrl('/')

  const runs = []
  try {
    for (let i = 0; i < RUNS; i++) {
      const r = await oneRun(url, viewport, scale)
      log(`run ${i + 1}/${RUNS}`, JSON.stringify(r))
      runs.push(r)
    }
  } finally {
    await stop()
  }

  // A run whose wall never rasterised is a different measurement; never averaged in.
  const ready = runs.filter((r) => r.frieze === 'ready')
  if (ready.length === 0) {
    log('no run reached data-frieze="ready"')
    process.exit(1)
  }

  const out = {
    probe: 'act-two',
    viewport: `${viewport.width}x${viewport.height}@${scale}x`,
    runs: ready.length,
    discarded: runs.length - ready.length,
    columns: ready[0].columns,
    svh: ready[0].svh,
    root: TARGET_ROOT,
    dist: fingerprint?.distIndexHash ?? null,
    warmMs: round(median(ready.map((r) => r.warmMs))),
    maxLongTaskMs: round(median(ready.map((r) => r.maxLongTaskMs))),
    frameP50Ms: round(median(ready.map((r) => r.frameP50Ms))),
    frameP95Ms: round(median(ready.map((r) => r.frameP95Ms))),
    domNodes: ready[0].domNodes === null ? null : round(median(ready.map((r) => r.domNodes))),
    rig,
  }
  console.log(JSON.stringify(out))
}

main().catch((e) => {
  log('FAILED', e?.stack ?? String(e))
  process.exit(1)
})
