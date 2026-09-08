import { test, expect, type Page, type TestInfo } from '@playwright/test'

const HARNESS = process.env.PERF_HARNESS === '1'
const DORMANT =
  'stage-arrival needs a scene freeze hook and a stage golden, issue #11; run with PERF_HARNESS=1'

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL GATE — the sole arbiter of "zero visual change" for the hero perf
// campaign. NOTE: 6 of the 30 goldens (stage-arrival, 3 seeds x 2 projects)
// are DORMANT behind PERF_HARNESS=1 — their golden is of an August DOM stack
// that no longer exists, and the scene has no ?perf-freeze hook, so no stage
// golden can be baked yet (issue #11). A green default gate therefore does NOT
// cover the Selected Work stage: a perf campaign must not resume on it alone.
// campaign. `npx playwright test pixel-gate` green = the optimized build paints
// what the pre-campaign build painted, to AA-level tolerance. No flag needed —
// `playwright.config.ts` sets `workers: 1`, which this spec asserts.
//
// There is no human eyeball in this loop. A golden baked wrong is not a test
// bug, it is a permanently-wrong definition of "correct". Two rules keep that
// from happening:
//
//   1. GOLDENS REGENERATE ONLY ON A COMMIT DECLARING VISUAL INTENT. During the
//      optimization campaign (Tasks 7–12) that is NEVER. If a batch turns this
//      red, the batch is wrong — not the goldens.
//   2. THE VIEWPORT IS SET BEFORE `goto`. A `?perf-freeze` load draws EXACTLY
//      ONE frame, ever: resize repaints, IntersectionObserver re-entry repaints
//      and `resize()` itself are all suppressed once that frame exists. A
//      `setViewportSize()` AFTER navigation therefore leaves a frozen frame at
//      its ORIGINAL backing-store resolution, browser-scaled into the new CSS
//      box — correct paint, stale dimensions, subtly-wrong golden. See
//      `loadFrozen()`.
//
// Matrix: 5 moments × 3 seeds × 2 Playwright projects = 30 goldens.
// Every moment is a VIEWPORT screenshot, never a full-section one (execution
// ruling R1): the hero section is 130svh but only ~100svh is ever on screen,
// and Task 8's scissor optimization will legitimately leave the never-visible
// rows unshaded. Judging pixels a user cannot see would fail Task 8 on a false
// positive.
// ─────────────────────────────────────────────────────────────────────────────

const SEEDS = [0.137, 0.512, 0.873] as const

// Per-project viewport contract. Desktop is forced to 1440×900 (the design's
// max-width-1440 container plus side padding); mobile rides the existing
// Pixel 5 device — the spec asked for 390×844, and Pixel 5 is the closest thing
// the configured device offers. Note carried deliberately: do NOT add a new
// device definition to chase a few px.
//
// The 393×851 quoted in the plan is Pixel 5's SCREEN size; its VIEWPORT (what
// a screenshot actually captures, browser chrome excluded) is 393×727. The
// assertion below is what surfaced that — verified against
// `require('@playwright/test').devices['Pixel 5']`, not assumed.
const EXPECTED_VIEWPORT: Record<string, { width: number; height: number }> = {
  'desktop-chromium': { width: 1440, height: 900 },
  'mobile-chromium': { width: 393, height: 727 },
}

// Tolerance — calibrated empirically; full record in `perf/decisions.md`.
//
// MEASURED noise floor: runs at absolute strictness (threshold 0,
// maxDiffPixelRatio 0) are byte-identical on every hero and dissolve shot, on
// both projects, every time. The ONLY residual is `stage-arrival` on
// mobile-chromium, which rasterizes non-deterministically: every observed
// result was one of two images 6px apart, and the flip is per-shot and
// independent (three strict trio runs each failed a different subset), not a
// run-level condition. 6px on 393×727 = ratio 0.000021.
//
// The values below sit ~48× above that floor — enough to absorb the flip,
// nowhere near enough for a real shader or layout change to hide.
//
// `threshold` is the PER-PIXEL colour distance below which a pixel counts as
// unchanged; Playwright's default of 0.2 would let EVERY pixel on the page
// drift 20% and still pass, which is not a visual gate at all.
// `maxDiffPixelRatio` is the share of pixels allowed to exceed it: 0.001 of a
// 1440×900 shot ≈ 1296px — a stray antialiased glyph edge, not a regression.
const SHOT = {
  animations: 'disabled',
  caret: 'hide',
  maxDiffPixelRatio: 0.001,
  threshold: 0.05,
} as const

const seedTag = (seed: number): string => `seed-${String(seed).replace('.', 'p')}`

/**
 * Scroll progress into the Selected Work stage for the `stage-arrival` shot.
 * This value MUST land on the stack's settle plateau, and the plateau is
 * narrower than it looks. Derivation (4 featured projects):
 *
 *   useScroll({ offset: ['start start', 'end end'] })  →  scrollYProgress = p
 *   segmentFor(p, 4):  transitions = 3, raw = 3p  →  index 0, frac = 3p
 *   settleFrac(frac) = smoothstep(clamp((frac - 0.15) / 0.7, 0, 1))
 *
 * settleFrac is 0 only while frac ≤ 0.15, i.e. **p ≤ 0.05**. At the original
 * p = 0.1: frac = 0.3 → settleFrac = smoothstep(0.2143) ≈ 0.118 — 11.8% INTO
 * the morph, where span 0 sits at blur ≈ 1.07px / opacity 0.951 and span 1 at
 * blur ≈ 59.8px / opacity 0.425, and that composite is then pushed through
 * GooeyTitle's `feColorMatrix` alpha row `255a − 170` — a hard binary threshold
 * at α ≈ 0.667. Every glyph edge pixel would sit within one ULP of a flip, so a
 * perceptually-null layerization change in Tasks 7–12 could flip a run of them
 * and turn this gate red on a non-regression. That is the exact false-positive
 * class ruling R1 exists to prevent.
 *
 * At 0.04: frac = 0.12 → settleFrac = 0 → segCont = 0. Span 0 renders at
 * blur 0 / opacity 1, span 1 is parked at opacity 0, and the threshold filter
 * is a no-op on solid glyphs. Still strictly inside the first card segment.
 *
 * Do not raise this above 0.05.
 *
 * NOTE the silent coupling to n: `frac = (n − 1) × p`, so the plateau ceiling
 * is `p ≤ 0.15 / (n − 1)`. At n = 4 that is 0.05 and 0.04 fits. At n = 5 it
 * drops to 0.0375 and this same 0.04 would slide back onto the cliff with no
 * signal whatsoever. `EXPECTED_FEATURED_CARDS` below is asserted per shot so
 * a fifth featured project fails loudly instead of silently re-aiming the shot.
 */
const STAGE_ARRIVAL_PROGRESS = 0.04

/**
 * The stack's card count, which `STAGE_ARRIVAL_PROGRESS` is derived from and
 * silently depends on. Sourced from `Projects.tsx` (`highlightOrder ≤ 4`).
 * If this assertion fires, do not just bump the number — recompute
 * STAGE_ARRIVAL_PROGRESS against `0.15 / (n − 1)` and re-bake the 6
 * stage-arrival goldens on a commit that declares the visual intent.
 */
const EXPECTED_FEATURED_CARDS = 4

// The tolerance above is calibrated for, and only proven at, --workers=1.
// `playwright.config.ts` now sets `workers: 1` so a bare `npx playwright test`
// is correct by default; this guard stays as the backstop against a `--workers`
// flag or a future config edit. Concurrent WebGL pages add GPU contention this
// gate is not characterised under. With no human eyeball in the loop, a
// contention-induced red gets an
// innocent optimization batch reverted — so fail fast and loudly instead.
// NOTE: `test.describe.configure({ mode: 'serial' })` is NOT a substitute — it
// serializes within the describe while the two projects still run concurrently.
test.beforeAll(() => {
  expect(
    test.info().config.workers,
    'pixel-gate is only calibrated at --workers=1; drop any --workers flag, and check that playwright.config.ts still sets workers: 1',
  ).toBe(1)
})

/**
 * Load a deterministic, frozen page state.
 *
 * Order is load-bearing: viewport FIRST (a frozen canvas cannot be re-rendered
 * at a new size), then navigate, then wait on the four readiness signals that
 * actually exist:
 *   - `body[data-loader-state="done"]`  loader removed
 *   - `[data-entrance="settled"]`       hero rise finished + clip released
 *   - `[data-perf-frozen="true"]`       the single frozen frame has been drawn
 *   - `document.getAnimations()` idle   no WAAPI/CSS animation still running
 *
 * NOT waited on: `data-static="true"`. Freeze takes its own branch and wins
 * over reduced motion, so a frozen canvas never carries that attribute.
 */
async function loadFrozen(
  page: Page,
  testInfo: TestInfo,
  seed: number,
  freezeSeconds: number,
): Promise<void> {
  const expected = EXPECTED_VIEWPORT[testInfo.project.name]
  expect(expected, `no expected viewport registered for project ${testInfo.project.name}`).toBeDefined()

  if (testInfo.project.name === 'desktop-chromium') {
    // Before the goto. See rule 2 in the header block.
    await page.setViewportSize(expected)
  }

  // Pin the layout width so the gate is immune to the HOST's scrollbar mode.
  //
  // `src/index.css` sets `html { scrollbar-gutter: stable }`, which reserves
  // ~11px only where scrollbars are CLASSIC (space-taking). macOS flips between
  // classic and overlay on `AppleShowScrollBars: Automatic` according to whether
  // A MOUSE IS ATTACHED — so without this, plugging in a mouse re-lays-out the
  // page at 1429, shifts every centred element 5.5px and reds all 15 desktop
  // goldens. That happened twice on 2026-08-22/23.
  //
  // Injected as an INIT SCRIPT, not `addStyleTag`, and the distinction is
  // load-bearing: adding it after load would reflow the page 11px wider AFTER
  // the canvas had sized itself, and a frozen canvas cannot be re-rendered at a
  // new size (rule 2 in the header block). This applies from first paint.
  //
  // The gutter is not what this gate judges — it judges shader paint and the
  // design's own layout — and the goldens are recorded in this pinned state, so
  // they are now valid on any host: trackpad, mouse, or a Linux CI box.
  await page.addInitScript(() => {
    const css = 'html { scrollbar-gutter: auto !important; }'
    const apply = (): void => {
      const style = document.createElement('style')
      style.textContent = css
      ;(document.head ?? document.documentElement).appendChild(style)
    }
    if (document.documentElement) apply()
    else document.addEventListener('DOMContentLoaded', apply, { once: true })
  })

  await page.goto(`/?perf-seed=${seed}&perf-freeze=${freezeSeconds}&perf-role=0`)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-entrance="settled"]')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')

  await assertContextAlive(page)
  await waitForAnimationsIdle(page)

  // The shot is only meaningful at the size the golden was baked at. Assert
  // rather than trust: a device-preset change or a stray resize would
  // otherwise silently rebase every golden on the next `--update-snapshots`.
  expect(page.viewportSize()).toEqual(expected)

  // …and matching `viewportSize()` is NOT sufficient to prove the page actually
  // laid out at that width. This asserts the scrollbar-gutter pin above really
  // took effect, because if it ever stops working the failure is a 5.5px shift
  // on every centred element — which reads as shader drift and costs a full
  // debugging cycle to attribute correctly. Ask directly instead.
  //
  // MEASURE THE ROOT'S LAID-OUT BOX, NOT `clientWidth`. Under headless Chrome's
  // `--hide-scrollbars` the scrollbar is zero-width as far as `clientWidth` is
  // concerned, so `documentElement.clientWidth` reports 1440 even while the
  // gutter is reserved — it is blind to exactly the condition being guarded,
  // and an earlier version of this assertion used it and caught nothing.
  // Measured on a mouse-attached host: innerWidth 1440, clientWidth 1440, but
  // `documentElement.getBoundingClientRect().width` 1429, `body.clientWidth`
  // 1429, and a `width:100%` child 1429. The root's border box is what every
  // centred element ultimately derives from, so that is the sensor.
  const rootWidth = await page.evaluate(
    () => document.documentElement.getBoundingClientRect().width,
  )
  expect(
    rootWidth,
    `the page laid out at ${rootWidth}px but the golden was recorded at ${expected.width}px — a ${expected.width - rootWidth}px scrollbar gutter survived the pin set in loadFrozen(). This is an ENVIRONMENT mismatch, not a visual regression: fix the pin, and do NOT --update-snapshots to "fix" it.`,
  ).toBe(expected.width)
}

/**
 * Context-loss guard. On WebGL context loss the hero unmounts the canvas and
 * swaps in a flat gradient `div` — which screenshots cleanly and would diff
 * against every golden at once, reading as "the optimization broke everything".
 * Fail here instead, with a message naming the real cause, so a future batch is
 * never blamed for a GPU hiccup.
 *
 * Deliberately an ASSERTION, never a skip: it can only turn green into red.
 * Re-checked immediately before every screenshot (`shoot()`) as well as at
 * load, because the context can die during the seconds of scrolling and
 * settling in between.
 */
async function assertContextAlive(page: Page): Promise<void> {
  await expect(
    page.locator('[data-testid="fluid-waves-fallback"]'),
    'hero WebGL context was lost — the gradient fallback is showing; this is an environment failure, not a visual regression',
  ).toHaveCount(0)
}

/**
 * Every WAAPI/CSS animation settled. `animations: 'disabled'` in the shot
 * options does NOT cover this on its own, and scrolling can start new ones, so
 * this runs after the scroll as well as after the load.
 */
async function waitForAnimationsIdle(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState === 'finished' || animation.playState === 'idle'),
  )
}

/**
 * Let scroll-derived state reach its resting value: two rAFs so Framer's
 * scroll-scrub has published the new `scrollYProgress` and re-rendered, a short
 * dwell for the nav's own state transition, then the same animations-idle
 * predicate used at load — scrolling can START animations (nav bar, whileInView
 * section staggers) that `animations: 'disabled'` does not cover.
 */
async function settleFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await page.waitForTimeout(400)
  await waitForAnimationsIdle(page)
}

/**
 * Take the golden shot. Re-asserts the WebGL context is alive immediately
 * beforehand — by this point several seconds of scrolling and settling have
 * passed since the load-time check.
 */
async function shoot(page: Page, name: string): Promise<void> {
  await assertContextAlive(page)
  await expect(page).toHaveScreenshot(name, SHOT)
}

/**
 * Scroll so the hero's cream-dissolve band fills the lower viewport: hero
 * section bottom minus one viewport height. Derived in-page from live
 * geometry — a hardcoded px offset would silently drift with any layout change
 * and re-aim the golden at a different band.
 */
async function scrollToDissolve(page: Page): Promise<void> {
  const scrolled = await page.evaluate(() => {
    const hero = document.querySelector('#top')
    if (!hero) return null
    const bottom = hero.getBoundingClientRect().bottom + window.scrollY
    const top = Math.max(0, bottom - window.innerHeight)
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    return top
  })
  if (scrolled === null) throw new Error('hero section (#top) not found — cannot derive the dissolve scroll position')
  expect(scrolled).toBeGreaterThan(0)
  await settleFrame(page)
}

/**
 * Scroll to the Projects stack wrapper's top + `STAGE_ARRIVAL_PROGRESS` of its
 * scrollable length — inside the first card segment, title on its SETTLE
 * PLATEAU. ABSOLUTE document Y via getBoundingClientRect().top + scrollY;
 * `offsetTop` would be relative to the positioned `#projects` and land the
 * scroll back in the hero.
 */
async function scrollToStageArrival(page: Page): Promise<void> {
  const scrolled = await page.evaluate((progress) => {
    const wrap = document.querySelector('#projects .stack-scroll')
    if (!(wrap instanceof HTMLElement)) return null
    const start = wrap.getBoundingClientRect().top + window.scrollY
    const range = wrap.offsetHeight - window.innerHeight
    const top = start + range * progress
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    return top
  }, STAGE_ARRIVAL_PROGRESS)
  if (scrolled === null) {
    throw new Error('#projects .stack-scroll not found — cannot derive the stage-arrival scroll position')
  }
  expect(scrolled).toBeGreaterThan(0)

  // Close the silent n-coupling: STAGE_ARRIVAL_PROGRESS only lands on the
  // settle plateau while frac = (n-1) x p <= 0.15. A fifth featured project
  // would push this shot back onto the alpha-threshold cliff with no other
  // symptom than goldens that quietly start capturing a mid-morph title.
  const cards = await page.locator('#projects .stack-card').count()
  expect(
    cards,
    `stage-arrival is calibrated for ${EXPECTED_FEATURED_CARDS} featured cards; found ${cards}. ` +
      `Recompute STAGE_ARRIVAL_PROGRESS against 0.15 / (n - 1) before re-baking.`,
  ).toBe(EXPECTED_FEATURED_CARDS)

  await settleFrame(page)
}

test.describe('pixel gate', () => {
  for (const seed of SEEDS) {
    const tag = seedTag(seed)

    // Moments 1/2 — the hero at rest, sampled at two points on the shader's
    // time axis. The t-pair is what catches TRAJECTORY drift: an optimization
    // that happens to reproduce t=2 while bending the motion curve elsewhere
    // fails at t=8.
    test(`hero-top-t2 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 2)
      await shoot(page, `hero-top-t2-${tag}.png`)
    })

    test(`hero-top-t8 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 8)
      await shoot(page, `hero-top-t8-${tag}.png`)
    })

    // Moments 3/4 — the cream-dissolve band, the exact surface Tasks 7/8 touch,
    // framed where a user actually sees it.
    test(`mid-dissolve-t2 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 2)
      await scrollToDissolve(page)
      await shoot(page, `mid-dissolve-t2-${tag}.png`)
    })

    test(`mid-dissolve-t8 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 8)
      await scrollToDissolve(page)
      await shoot(page, `mid-dissolve-t8-${tag}.png`)
    })

    // Moment 5 — the Selected Work stage, first card segment. Guards the
    // downstream page against hero work that leaks into shared layout/paint.
    test(`stage-arrival-t2 · ${tag}`, async ({ page }, testInfo) => {
      test.skip(!HARNESS, DORMANT)
      await loadFrozen(page, testInfo, seed, 2)
      await scrollToStageArrival(page)
      await shoot(page, `stage-arrival-t2-${tag}.png`)
    })
  }
})
