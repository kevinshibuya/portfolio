import { test, expect, type Page, type TestInfo } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL GATE — the sole arbiter of "zero visual change" for the hero perf
// campaign. `npx playwright test pixel-gate --workers=1` green = the optimized
// build paints what the pre-campaign build painted, to AA-level tolerance.
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
// MEASURED noise floor: a run at absolute strictness (threshold 0,
// maxDiffPixelRatio 0) against these goldens came back byte-identical on 29 of
// 30 shots; the single outlier drifted 28px on a 393×727 image = ratio
// 0.000098. The values below sit ~10× above that floor — high enough to absorb
// the resampling jitter, low enough that a real shader change cannot hide.
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

  await page.goto(`/?perf-seed=${seed}&perf-freeze=${freezeSeconds}&perf-role=0`)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-entrance="settled"]')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')

  // Context-loss guard. On WebGL context loss the hero swaps the canvas for a
  // flat gradient `div` — which screenshots cleanly and would diff against
  // every golden at once, reading as "the optimization broke everything". Fail
  // here instead, with a message that names the real cause, so a future batch
  // is never blamed for a GPU hiccup.
  await expect(
    page.locator('[data-testid="fluid-waves-fallback"]'),
    'hero WebGL context was lost — the gradient fallback is showing; this is an environment failure, not a visual regression',
  ).toHaveCount(0)

  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState === 'finished' || animation.playState === 'idle'),
  )

  // The shot is only meaningful at the size the golden was baked at. Assert
  // rather than trust: a device-preset change or a stray resize would
  // otherwise silently rebase every golden on the next `--update-snapshots`.
  expect(page.viewportSize()).toEqual(expected)
}

/** Let scroll-derived state (Framer scroll-scrub, nav state) reach its resting value. */
async function settleFrame(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
  await page.waitForTimeout(400)
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
  expect(scrolled, 'hero section (#top) not found — cannot derive the dissolve scroll position').not.toBeNull()
  expect(scrolled as number).toBeGreaterThan(0)
  await settleFrame(page)
}

/**
 * Scroll to the Projects stack wrapper's top + 10% of its scrollable length —
 * inside the first card segment, title on its static plateau. ABSOLUTE document
 * Y via getBoundingClientRect().top + scrollY; `offsetTop` would be relative to
 * the positioned `#projects` and land the scroll back in the hero.
 */
async function scrollToStageArrival(page: Page): Promise<void> {
  const scrolled = await page.evaluate(() => {
    const wrap = document.querySelector('#projects .stack-scroll')
    if (!(wrap instanceof HTMLElement)) return null
    const start = wrap.getBoundingClientRect().top + window.scrollY
    const range = wrap.offsetHeight - window.innerHeight
    const top = start + range * 0.1
    window.scrollTo({ top, behavior: 'instant' as ScrollBehavior })
    return top
  })
  expect(scrolled, '#projects .stack-scroll not found — cannot derive the stage-arrival scroll position').not.toBeNull()
  expect(scrolled as number).toBeGreaterThan(0)
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
      await expect(page).toHaveScreenshot(`hero-top-t2-${tag}.png`, SHOT)
    })

    test(`hero-top-t8 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 8)
      await expect(page).toHaveScreenshot(`hero-top-t8-${tag}.png`, SHOT)
    })

    // Moments 3/4 — the cream-dissolve band, the exact surface Tasks 7/8 touch,
    // framed where a user actually sees it.
    test(`mid-dissolve-t2 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 2)
      await scrollToDissolve(page)
      await expect(page).toHaveScreenshot(`mid-dissolve-t2-${tag}.png`, SHOT)
    })

    test(`mid-dissolve-t8 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 8)
      await scrollToDissolve(page)
      await expect(page).toHaveScreenshot(`mid-dissolve-t8-${tag}.png`, SHOT)
    })

    // Moment 5 — the Selected Work stage, first card segment. Guards the
    // downstream page against hero work that leaks into shared layout/paint.
    test(`stage-arrival-t2 · ${tag}`, async ({ page }, testInfo) => {
      await loadFrozen(page, testInfo, seed, 2)
      await scrollToStageArrival(page)
      await expect(page).toHaveScreenshot(`stage-arrival-t2-${tag}.png`, SHOT)
    })
  }
})
