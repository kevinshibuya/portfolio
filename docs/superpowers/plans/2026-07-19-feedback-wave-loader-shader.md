# Feedback Wave — Smooth Shader · Ink-Bleed Loader · Shared Canvas · Float Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. After each step's command lands successfully, Edit the corresponding `- [ ]` to `- [x]` in THIS plan file BEFORE proceeding to the next step. Do not batch ticks at the end.

**Goal:** Make the hero/backdrop shader fully smooth, replace the horizontal-curtain loader with a translucent `ks.` ink-bleed loader that reveals the settled hero, share one WebGL canvas component between hero and contact/footer, and fix the WorkRow float first-hover fly-in.

**Architecture:** One shared raw-WebGL component `FluidWaves` (variant `hero` | `backdrop`) whose rAF loop runs from mount (no entrance gate) powers both canvases; the three.js `LiningWavesBackdrop` is deleted. The loader is an inline SVG in `index.html`: an ink rect masked by static `ks.` glyph outlines (transparent windows onto the shader) plus a stain group that GSAP grows to dissolve the ink; `main.tsx` orchestrates the bleed and resolves the curtain + entrance gates at completion. The Hero renders settled from first paint (GSAP rise cascade retired).

**Tech Stack:** React 19 + TypeScript (strict), Vite 6 + SWC, raw WebGL, GSAP 3 (+ CustomEase, AttrPlugin — core), Framer Motion v12 (MotionValue `.jump()`), Playwright + Vitest.

---

## Global Constraints

- **No `any`** (TS strict); explicit return types on hooks/utilities.
- **House style:** no spaced em-dashes (` — `) in reader-facing copy; separators use `·`.
- **i18n:** all new user-visible strings go through react-i18next EXCEPT the loader corner meta, which is hardcoded EN (pre-bundle brand surface; ratified, documented).
- **Canvas budget:** max 2 `<canvas>` on the page at any time (hero + backdrop). DPR cap `1.5`. Each canvas: IntersectionObserver pause (`data-paused="true"` off-screen), reduced-motion single static frame (`data-static="true"`, no loop), context-loss fallback.
- **Loader stays the pre-bundle first paint:** loader markup + inline CSS in `index.html`, mirrored in `src/index.css` (the bundled sheet is a no-op re-declaration).
- **Reduced motion:** loader = simple opacity fade (~150 ms), no bleed; shader = one static frame; hero = settled (no animation).
- **Standing AA rule:** any palette/token/background change ships with a recomputed AA contrast audit; verified, not hoped. The table in Task 7 is authoritative.
- **Verification discipline:** Lighthouse ONLY against `npx vite preview --port 4173` (NOT `npm run preview` = wrangler, NOT dev server). Restart preview after every rebuild (stale sirv snapshot 404s hashed assets). Baseline verify runs the FULL suite before Task 2.
- **Foundation caution:** `index.html` + `main.tsx` boot-path changes are runtime-critical and static-check-blind — Task 4 carries a real-browser mount smoke.

## Measured baseline (spec §6, measured 2026-07-19 on branch HEAD, same branch as this plan)

| Metric | Baseline | Budget (this wave) | Headroom |
|---|---|---|---|
| Lighthouse perf (`npx vite preview`) | 97 | ≥ 95 | +2 |
| LCP | 0.9 s | ≤ 1.5 s | +0.6 s |
| a11y / best-practices / seo | 100 / 100 / 100 | no regression | — |
| unit (vitest) | 60 / 60 | all green | — |
| e2e (playwright) | 38 pass / 2 skip | all green (updated) | — |

No budget is baseline-violated. Task 0 re-verifies these fresh; if the re-run deviates, it is flagged before Task 2 (do not proceed silently).

> **LCP watch-item (not a defect):** the new loader's `ks.` mark is SVG mask windows (not an LCP candidate), and the CSS-gradient stand-in + inline SVG rect are not LCP candidates either. LCP is expected to become the settled `h1.hero-name` at React mount (paints under the loader, opacity 1, occlusion does not disqualify). Task 9 measures it against ≤ 1.5 s.

## Task → Model + effort (proposal — the orchestrator re-judges each at dispatch)

| Task | Deliverable | Model + effort | Why |
|---|---|---|---|
| 0 | Baseline full-suite verify + record | verifier-sonnet-low | mechanical; runs commands, records numbers |
| 1 | Stale-test batch → new expected behavior (RED) | editor-sonnet-low | complete test code supplied below; pure transcription |
| 2 | Shared `FluidWaves` (smooth shader, rAF-from-mount, variants) | integrator-opus-high | multi-file, WebGL, visual-critical, replaces a component |
| 3 | Backdrop swap + delete `LiningWavesBackdrop` + drop `three` | implementer-sonnet-medium | well-specified once FluidWaves exists; local + deletions |
| 4 | Ink-bleed loader (`index.html` + `index.css`) + `main.tsx` bleed | integrator-opus-high | boot-path, GSAP+SVG mask, visual-critical, highest risk |
| 5 | Hero entrance retirement (settled from paint) | integrator-opus-high | animation-critical; entranceDone handshake judgment |
| 6 | WorkRow float first-hover fix | implementer-sonnet-medium | fully specified 4-line change + supplied test; animation nuance |
| 7 | AA recompute + 2 remedies (decorative exemption + alpha) + CLAUDE.md table | implementer-sonnet-medium | now touches Contact.tsx + index.css (codex P2-1); edits fully specified |
| 8 | CLAUDE.md Design Direction + memory doc updates | editor-sonnet-low | exact prose supplied |
| 9 | Final battery + Lighthouse/LCP gate + manual smoke | verifier-sonnet-low | mechanical gate; Kevin does the visual sign-off |

**Execution order (dependency-correct):** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Task 4 (loader/`main.tsx` resolves the entrance gate) MUST land before Task 5 (Hero stops resolving it) so the gate is always resolvable. The unit + e2e suites are partially RED between Task 1 and the task that satisfies each spec (noted per task); that is expected ATDD, not a regression.

---

### Shared constants (referenced by Tasks 1, 4)

**Extracted `ks.` glyph outlines — Plus Jakarta Sans 700, source `/.claude/design-system-handoff/fonts/PlusJakartaSans-VariableFont_wght.ttf` instanced at `wght=700`, Y-flipped to SVG space, `−0.03em` tracking, unitsPerEm 1000.** Composed viewBox `60.5 -12 1225.5 769` (aspect 1.594). Rendered and visually verified as `ks.` during plan authoring. Placed centered in a `0 0 100 100` box via `transform="translate(30.74 39.34) scale(0.02861)"` (maps the mark's bbox centre to 50,50 at ~22-unit height):

- **k:** `M60.5 745.0V-12.0H191.75V484.25L141.75 469.5L397.75 201.5H560.75L359.75 420.25L564.75 745.0H414.75L237.25 463.0L314.5 447.5L151.0 623.5L191.75 542.75V745.0Z`
- **s:** `M814.5 757.0Q727.75 757.0 663.375 715.375Q599.0 673.75 574.5 603.0L672.75 556.5Q694.25 601.75 731.625 627.75Q769.0 653.75 814.5 653.75Q850.5 653.75 871.5 638.125Q892.5 622.5 892.5 595.75Q892.5 579.75 884.0 569.25Q875.5 558.75 861.25 551.25Q847.0 543.75 829.5 539.0L740.5 514.0Q671.75 494.5 636.5 453.125Q601.25 411.75 601.25 355.75Q601.25 305.75 626.75 268.5Q652.25 231.25 697.75 210.375Q743.25 189.5 801.5 189.5Q878.5 189.5 937.75 226.5Q997.0 263.5 1021.5 330.25L922.25 376.75Q908.25 340.0 875.25 318.25Q842.25 296.5 800.75 296.5Q767.75 296.5 748.625 311.25Q729.5 326.0 729.5 350.5Q729.5 365.5 737.5 376.25Q745.5 387.0 760.25 394.25Q775.0 401.5 793.5 407.0L881.0 433.0Q948.25 452.75 984.375 493.125Q1020.5 533.5 1020.5 591.25Q1020.5 640.5 994.5 677.75Q968.5 715.0 922.5 736.0Q876.5 757.0 814.5 757.0Z`
- **dot (period):** `M1153.5 745.0V605.0H1286.0V745.0Z`

**Stain circles (mask coordinate space `0..100`, start `r=0`), verified to fully dissolve the `0..100` box (every corner inside a stain, ≥14-unit margin > filter displacement):**

| stain | cx | cy | end r | GSAP delay (s) |
|---|---|---|---|---|
| 1 | 28 | 30 | 55 | 0.00 |
| 2 | 72 | 26 | 55 | 0.08 |
| 3 | 24 | 72 | 55 | 0.16 |
| 4 | 76 | 74 | 55 | 0.10 |
| 5 | 50 | 50 | 50 | 0.20 |
| 6 | 52 | 36 | 48 | 0.26 |

Each grows `duration: 0.6, ease: 'house'`; total span ≈ 0.86 s. Because `xMidYMid slice` shows only a centered sub-rectangle of the `0..100` box, covering the whole box covers every aspect ratio.

---

## Task 0: Baseline full-suite verify

**Model:** verifier-sonnet-low. **Serves:** the baseline-verify rule (record measured numbers before implementation; batch any stale-test surprises).

**Files:** none (read-only verification).

- [x] **Step 1: Typecheck + lint + unit**

Run: `npm run build` then `npm run test:unit` then `npm run lint`
Record: build pass/fail, unit N/N, lint clean. Expected: build ok, unit 60/60, lint clean.

- [x] **Step 2: e2e full suite**

Run: `npm run test:e2e`
Record: pass/skip counts. Expected: 38 pass / 2 skip.

- [x] **Step 3: Lighthouse (preview, NOT wrangler/dev)**

Run: `npm run build`, then in a separate shell `npx vite preview --port 4173`, then Lighthouse against `http://localhost:4173`. Restart preview after the build.
Record: perf, a11y, bp, seo, LCP. Expected ≈ perf 97 / a11y 100 / bp 100 / seo 100 / LCP 0.9 s.

- [x] **Step 4: Reconcile against budgets**

Confirm perf ≥ 95 and LCP ≤ 1.5 s at baseline. If any measured number is worse than the table above, STOP and report — a baseline-violated budget is a plan defect to resolve before Task 2, not at final verification.

**Boundaries:** No source edits. If a test is already failing at baseline (unexpected), record it — Task 1 folds it into the one-batch stale-test update.

---

## Task 1: Stale-test batch → new expected behavior (RED)

**Model:** editor-sonnet-low. **Serves:** spec §6 "specs asserting the curtain/entrance/LiningWaves are updated as one batch BEFORE implementation." All code below is complete; transcribe verbatim.

**Files:**
- Delete: `tests/unit/FluidWavesHero.test.tsx`
- Create: `tests/unit/FluidWaves.test.tsx`
- Create: `tests/unit/WorkRow.float.test.tsx`
- Modify: `tests/e2e/hero-entrance.spec.ts` (full replace)
- Modify: `tests/e2e/contact-waves.spec.ts` (full replace)
- Create: `tests/e2e/loader.spec.ts`
- Leave unchanged (verified unaffected): `tests/e2e/hero-shader.spec.ts`, `perf-budget.spec.ts`, `reduced-motion.spec.ts`, `rows-hover.spec.ts`, `section-enters.spec.ts`, `dark-tokens.spec.ts`, `tests/unit/Hero.test.tsx`, `tests/unit/WorkRow.test.tsx`, `tests/unit/bundle-deps.test.ts`.

> After this task the unit + e2e suites are intentionally RED (FluidWaves/WorkRow.float/loader/hero-entrance/contact-waves reference behavior that lands in Tasks 2–6). This is the ATDD baseline. Do not "fix" the RED by editing these tests later — the implementation tasks turn them green.

- [x] **Step 1: Delete the old hero-canvas unit test**

Run: `git rm tests/unit/FluidWavesHero.test.tsx`

- [x] **Step 2: Create `tests/unit/FluidWaves.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { FluidWaves } from '../../src/components/canvas/FluidWaves'

describe('FluidWaves', () => {
  it('hero variant falls back to the layered gradient when WebGL is unavailable (jsdom)', () => {
    render(
      <MotionProvider>
        <FluidWaves variant="hero" />
      </MotionProvider>,
    )
    // jsdom has no WebGL context — never a dead black canvas.
    expect(screen.getByTestId('fluid-waves-fallback')).toBeInTheDocument()
  })

  it('backdrop variant renders nothing on WebGL failure (stage ink stands)', () => {
    const { container } = render(
      <MotionProvider>
        <FluidWaves variant="backdrop" />
      </MotionProvider>,
    )
    expect(container.querySelector('canvas')).toBeNull()
    expect(screen.queryByTestId('fluid-waves-fallback')).toBeNull()
  })
})
```

- [x] **Step 3: Create `tests/unit/WorkRow.float.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// jsdom can't observe Framer's rAF-driven spring frames deterministically, so
// we assert on the .jump() CONTRACT instead: the first-hover fix teleports the
// tracking values to the cursor via jump(). The buggy version calls .set()
// (spring-traverses from -400) and never jumps on enter → this test fails RED.
const jumpCalls: number[] = []
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  const wrap = <T extends { jump: (v: number) => void }>(mv: T): T => {
    const orig = mv.jump.bind(mv)
    mv.jump = (v: number) => {
      jumpCalls.push(v)
      orig(v)
    }
    return mv
  }
  return {
    ...actual,
    useMotionValue: (init: number) => wrap(actual.useMotionValue(init)),
    useSpring: (src: unknown, cfg: unknown) =>
      wrap(actual.useSpring(src as never, cfg as never)),
  }
})

beforeEach(() => {
  jumpCalls.length = 0
  // Force desktop hover + fine pointer so the float is enabled.
  window.matchMedia = ((q: string) => ({
    matches: /hover: hover/.test(q) && /pointer: fine/.test(q),
    media: q,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as unknown as typeof window.matchMedia
})

import { MotionProvider } from '../../src/context/MotionContext'
import { WorkRow } from '../../src/components/ui/WorkRow'

describe('WorkRow float first-hover', () => {
  it('teleports the float to the cursor on mouseEnter (jump, not spring-traversal)', () => {
    render(
      <MemoryRouter>
        <MotionProvider>
          <WorkRow
            index={0}
            title="radar"
            href="/projects/radar"
            preview={{ src: '/x.png', alt: 'x' }}
          />
        </MotionProvider>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /radar/i })
    const before = jumpCalls.length
    fireEvent.mouseEnter(link, { clientX: 640, clientY: 360 })
    const added = jumpCalls.slice(before)
    expect(added).toContain(640)
    expect(added).toContain(360)
  })
})
```

- [x] **Step 4: Replace `tests/e2e/hero-entrance.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('monumental name is real settled text with the canonical role', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1.hero-name')).toContainText('kevin', { timeout: 2000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  // Final-state assertion (passes pre- and post-Task-5 — NOT the discriminator).
  const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
  expect(op).toBeGreaterThan(0.99)
  await expect(page.locator('.hero-role')).toContainText('senior front-end engineer · react/typescript')
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

// DISCRIMINATOR for Task 5 (settled-from-first-paint). Computed opacity is 1
// throughout the retired cascade too, so opacity alone is a hollow gate. The
// real tell is the TRANSFORM: the retired GSAP entrance held .hero-line at
// yPercent:112 (a non-identity transform) while the loader was up, then rose it
// to 0. Settled-from-first-paint means .hero-line sits at identity transform
// even during 'loading'. This fails RED against pre-Task-5 code (non-identity
// translateY present) and passes only once the entrance timeline is deleted.
test('name is settled from first paint — identity transform while the loader is up', async ({ page }) => {
  await page.goto('/')
  // The min dwell (≥600ms) guarantees a ~1.5s 'loading' window; wait for the
  // stamp (waitForFunction throws if it is never observed) rather than a
  // race-prone immediate read. By the time 'loading' is observable, React has
  // committed and both the loader-lock effect and the (retired) Hero entrance
  // effect have run — so a lingering yPercent transform is already applied.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  const line = page.locator('.hero-line').first()
  const op = await line.evaluate((el) => parseFloat(getComputedStyle(el).opacity))
  expect(op).toBeGreaterThan(0.99)
  const transform = await line.evaluate((el) => getComputedStyle(el).transform)
  expect(transform === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(transform)).toBeTruthy()
})

test('body scroll is locked while the loader is up, released after the bleed', async ({ page }) => {
  await page.goto('/')
  // Robustly observe the 'loading' stamp (throws if never seen) instead of a
  // race-prone immediate read, then wait for release.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'loading', null, { timeout: 3000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflowAfter).not.toBe('hidden')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('reduced motion: hero settled fast, no bleed', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    expect(Date.now() - start).toBeLessThan(2500)
    const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    expect(op).toBeGreaterThan(0.99)
  })
})
```

> **Why the discriminator is needed (review fix):** the retired cascade animates the name via `yPercent` (transform), so computed `opacity` stays 1 the whole time — the old settled-opacity assertions were already green pre-Task-5 (a hollow gate). The transform-identity-during-loading assertion is the only one that fails against current code and passes only after the timeline is deleted.

- [x] **Step 5: Replace `tests/e2e/contact-waves.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

// Stage reached via scrollIntoViewIfNeeded (not scrollTo(scrollHeight)): the
// below-the-fold sections are one Suspense boundary with a 100vh fallback, so
// an absolute scrollTo clamps before the stage mounts. scrollIntoViewIfNeeded
// retries as layout grows.

test('backdrop mounts lazily on approach; canvas budget is exactly 2', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(0)
  await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveCount(1, { timeout: 10000 })
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeLessThanOrEqual(2)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('backdrop renders a static frame', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('.contact-footer-stage').scrollIntoViewIfNeeded()
    await expect(page.locator('[data-canvas="fluid-waves-backdrop"]')).toHaveAttribute('data-static', 'true', { timeout: 10000 })
  })
})
```

- [x] **Step 6: Create `tests/e2e/loader.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('loader shows the ks. window mark + corner meta, bleeds away, zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  // Loader present at first with the SVG ink mask and 3 glyph-window paths.
  await expect(page.locator('#loader svg.loader-ink')).toHaveCount(1)
  expect(await page.locator('#loader mask#loader-mask path').count()).toBe(3)
  await expect(page.locator('#loader .loader-meta')).toHaveCount(4)
  await expect(page.locator('#loader')).toContainText('kevin shibuya')
  // Bleed completes → loader removed, gate resolved.
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 5000 })
  await expect(page.locator('#loader')).toHaveCount(0)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('reduced motion: loader fades (no bleed) and is removed', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('#loader')).toHaveCount(0)
  })
})
```

- [x] **Step 7: Verify the tests are RED for the right reasons**

Run: `npm run test:unit` — expect `FluidWaves.test.tsx` (module missing) and `WorkRow.float.test.tsx` (no jump on enter) to FAIL; all others green.
Run: `npm run test:e2e` — expect:
- `loader.spec.ts` — genuinely RED (new loader markup absent).
- `contact-waves.spec.ts` — genuinely RED (`data-canvas="fluid-waves-backdrop"` absent).
- `hero-entrance.spec.ts` — RED ONLY via the new discriminator test ("identity transform while the loader is up"); the other three assertions in that file already pass pre-Task-5 (the retired cascade keeps opacity at 1). Confirm the discriminator specifically fails with a non-identity `matrix(...)` transform on `.hero-line`.
- `hero-shader`, `perf-budget`, `reduced-motion`, `rows-hover`, `section-enters`, `dark-tokens` — still green.

- [x] **Step 8: Commit**

```bash
git add tests/
git commit -m "test(wave): RED batch — FluidWaves, ink-bleed loader, backdrop id, settled hero, workrow float"
```

**Boundaries:** Do NOT edit source files. Do NOT touch `hero-shader.spec.ts` (the `data-canvas="fluid-waves"` hero id survives) or `bundle-deps.test.ts` (Task 3 owns the `three` allowlist edit).

---

## Task 2: Shared `FluidWaves` component (smooth shader, rAF-from-mount, variants)

**Model:** integrator-opus-high. **Serves:** spec §1 (smooth shader), §2 (shared component + rAF-from-mount). Contract + exact constants below; internal structure is yours to judge, but the shader source, class/test-id strings, and behavior list are load-bearing — match them exactly.

**Files:**
- Create: `src/components/canvas/FluidWaves.tsx`
- Delete: `src/components/canvas/FluidWavesHero.tsx`
- Modify: `src/components/sections/Hero.tsx` (swap `<FluidWavesHero />` → `<FluidWaves variant="hero" />`; import path)
- Modify: `src/index.css` (add `.fluid-waves-canvas--backdrop` rules; keep existing `.fluid-waves-canvas`/`.fluid-waves-fallback`)

**Interfaces:**
- **Produces:** `export function FluidWaves({ variant }: { variant: 'hero' | 'backdrop' }): ReactElement` (named export). Consumed by Hero (Task 2) and Home (Task 3).

**Behavioral contract (derive `FluidWaves` from the current `FluidWavesHero`, generalized):**

1. **Smooth shader (spec §1):** copy the fragment shader from `FluidWavesHero.tsx` but DELETE the quantization. Remove `const PIXEL_FILTER`, the `uniform float pixel_filter;` line, the `pixelFilterLoc` lookup, and the `gl.uniform1f(pixelFilterLoc, …)` call. Replace the UV block:
   ```glsl
   // DELETE:
   float pixel_size = length(screenSize.xy) / pixel_filter;
   vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size
              - 0.5 * screenSize.xy) / length(screenSize.xy);
   // REPLACE WITH:
   vec2 uv = (screen_coords.xy - 0.5 * screenSize.xy) / length(screenSize.xy);
   ```
   Everything else in the shader (seeded scatter warp, 5-iteration fold, tricolor paint math, `contrast_mod`, colours) is byte-identical. `CONTRAST = 2.0`, `FLOW_SPEED = 0.35`, `DPR_CAP = 1.5`, the three `COLOR_*` vec3s — unchanged.
2. **One canvas element, variant-driven attributes:**
   - hero: `<canvas className="fluid-waves-canvas" data-canvas="fluid-waves" aria-hidden="true">`; WebGL-failure fallback `<div className="fluid-waves-fallback" data-testid="fluid-waves-fallback" aria-hidden="true" />`.
   - backdrop: `<canvas className="fluid-waves-canvas fluid-waves-canvas--backdrop" data-canvas="fluid-waves-backdrop" aria-hidden="true">`; WebGL-failure fallback renders `<></>` (the stage ink `#0B0E14` stands — mirrors the old `LiningWavesBackdrop` failure path).
3. **rAF loop starts at mount (spec §2, the key change):** DELETE the `entranceDone` gate and the `allowLoop` flag entirely. The loop starts on mount, subject only to IO visibility and reduced motion. Do NOT import `entranceDone` from MotionContext (only `prefersReducedMotion` is still needed). Effect deps become `[prefersReducedMotion, variant]`.
4. **Preserve from the current hero** (with the IO correction in item 4a — do NOT copy the old reduced-motion IO branch verbatim): `gl.getContext('webgl', { alpha: false })` for BOTH variants (opaque canvas; backdrop dims via CSS — see §backdrop dimming); per-mount `const seed = Math.random()`; `resize()` reads `canvas.clientWidth/clientHeight` × `min(dpr, 1.5)`; `window` resize listener; reduced-motion path draws ONE frame (`drawFrame(seed * 10)`), sets `data-static="true"`, never loops, repaints one frame on IO re-entry; `webglcontextlost` → `preventDefault()` + stop + fallback; full cleanup (cancel rAF, disconnect IO, remove listeners, delete program/shaders/buffer).
   **4a. IO observer — `data-paused` for EVERY canvas (codex P2-3 fix):** the current `FluidWavesHero` observer early-returns inside `if (prefersReducedMotion)` WITHOUT touching `data-paused` — that contradicts the per-canvas contract ("`data-paused="true"` off-screen for every canvas, reduced motion included"). The observer MUST set/clear `data-paused` FIRST, before the reduced-motion branch. Use exactly:
   ```ts
   const io = new IntersectionObserver(([entry]) => {
     inView = entry.isIntersecting
     // Every canvas reflects visibility via data-paused — reduced motion too.
     if (inView) canvas.removeAttribute('data-paused')
     else canvas.dataset.paused = 'true'
     if (prefersReducedMotion) {
       if (inView) drawFrame(seed * 10) // one-frame repaint on re-entry
       return
     }
     if (inView) start()
     else stop()
   })
   io.observe(canvas)
   ```
   (Under reduced motion there is no loop, but `data-paused="true"` off-screen is still semantically correct and satisfies the contract; no e2e asserts its ABSENCE.)
5. **Backdrop dimming is CSS only (spec §2):** the backdrop canvas is opaque paint; `.fluid-waves-canvas--backdrop { opacity: 0.22; filter: saturate(0.7); }` composites it toward the stage ink. **Note the value is 0.22, not the spec's ~0.32** — see Task 7 and Spec Concerns for the AA rationale; this is the AA-verified murmur strength. An opaque canvas with CSS `opacity` over the `#0B0E14` stage bg is the correct, shader-change-free dimming.

- [x] **Step 1: Create `src/components/canvas/FluidWaves.tsx`** per the contract above (smooth shader, both variants, rAF-from-mount, `alpha:false`, IO/reduced-motion/context-loss preserved). No `entranceDone` import.

- [x] **Step 2: Point Hero at the shared component**

In `src/components/sections/Hero.tsx`: change the import `import { FluidWavesHero } from '../canvas/FluidWavesHero'` → `import { FluidWaves } from '../canvas/FluidWaves'`, and the JSX inside `.hero-canvas` from `<FluidWavesHero />` → `<FluidWaves variant="hero" />`. (Hero's entrance timeline is untouched here — Task 5 removes it.)

- [x] **Step 3: Delete the old component**

Run: `git rm src/components/canvas/FluidWavesHero.tsx`

- [x] **Step 4: Add backdrop CSS**

In `src/index.css`, in the `/* FLUID WAVES (canvas #1) */` block (~line 1745), append:
```css
/* Backdrop variant (canvas #2, contact/footer stage). Opaque paint dimmed to
   an AA-verified murmur via CSS over the stage ink. 0.22 (not ~0.32): keeps
   contact/footer accent + faded text ≥ 4.5:1 over worst-case dimmed yellow
   (Task 7 contrast table). */
.fluid-waves-canvas--backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.22;
  filter: saturate(0.7);
}
```

- [x] **Step 5: Typecheck + lint + unit**

Run: `npm run build && npm run test:unit -- FluidWaves && npm run lint`
Expected: build clean; `tests/unit/FluidWaves.test.tsx` GREEN (both variants); lint clean.

- [x] **Step 6: e2e hero shader**

Run: `npm run test:e2e -- hero-shader`
Expected: GREEN (hero canvas `data-canvas="fluid-waves"` mounts, pauses off-screen, reduced-motion static). Manually confirm at `npx vite preview` that the hero paint is smooth (no quantization blocks) and animates immediately (no frozen-shader delay).

- [x] **Step 7: Commit**

```bash
git add src/components/canvas/FluidWaves.tsx src/components/sections/Hero.tsx src/index.css
git commit -m "feat(canvas): shared FluidWaves — smooth shader, rAF from mount, hero+backdrop variants"
```

**Acceptance check (read-only, authored in Task 1):** `tests/unit/FluidWaves.test.tsx` + `tests/e2e/hero-shader.spec.ts`. You make them pass; never edit them.

**Boundaries:** Do NOT touch `Home.tsx`, `LiningWavesBackdrop.tsx`, `MotionContext.tsx`, or the Hero entrance timeline (Tasks 3/5). Do NOT change the shader's paint math — only the UV/quantization lines. `blocked:` if the smooth UV change visibly alters the tricolor character beyond de-blocking (return for opus re-judgement).

---

## Task 3: Backdrop swap + delete `LiningWavesBackdrop` + drop `three`

**Model:** implementer-sonnet-medium. **Serves:** spec §2 (contact/footer backdrop = `FluidWaves variant="backdrop"`; `LiningWavesBackdrop` fully deleted).

**Files:**
- Modify: `src/pages/Home.tsx` (lazy import + stage render)
- Delete: `src/components/canvas/LiningWavesBackdrop.tsx`
- Modify: `src/index.css` (delete `.lining-waves-backdrop` rules, ~lines 782–783)
- Modify: `package.json` (remove `three`; `@types/three` if present)
- Modify: `tests/unit/bundle-deps.test.ts` (remove `'three'` from the allowlist Set)

- [x] **Step 1: Swap the lazy import in `Home.tsx`**

Replace (line ~35):
```tsx
const LiningWavesBackdrop = lazy(() => import('../components/canvas/LiningWavesBackdrop'))
```
with:
```tsx
// Canvas #2. Named export → unwrap. Deliberately NOT idle-warmed: the WebGL
// backdrop must not mount until the user scrolls near the stage.
const FluidWavesBackdrop = lazy(() =>
  import('../components/canvas/FluidWaves').then((m) => ({ default: m.FluidWaves }))
)
```

- [x] **Step 2: Swap the stage render in `Home.tsx`**

In the `.contact-footer-stage` block, replace:
```tsx
{stageApproached && <LiningWavesBackdrop />}
```
with:
```tsx
{stageApproached && <FluidWavesBackdrop variant="backdrop" />}
```

- [x] **Step 3: Delete the component**

Run: `git rm src/components/canvas/LiningWavesBackdrop.tsx`

- [x] **Step 4: Delete its CSS**

In `src/index.css` remove the two lines:
```css
.lining-waves-backdrop { position: absolute; inset: 0; z-index: 0; }
.lining-waves-backdrop canvas { display: block; width: 100%; height: 100%; }
```
(Keep `.contact-footer-stage` and the `> .section--contact / > .footer` rules.)

- [x] **Step 5: Drop the `three` dependency**

Confirm no remaining importers: `grep -rn "from 'three'\|@react-three\|@types/three" src` (expect zero after the deletion). Then:
Run: `npm uninstall three` (and `npm uninstall @types/three` only if it appears in `package.json` devDependencies).

- [x] **Step 6: Remove `three` from the dependency allowlist**

In `tests/unit/bundle-deps.test.ts`, delete `'three',` from the `allowed` Set literal (line 9).

- [x] **Step 7: Typecheck + lint + unit**

Run: `npm run build && npm run test:unit -- bundle-deps && npm run lint`
Expected: build clean (no `three` resolution errors), `bundle-deps` GREEN, lint clean.

- [x] **Step 8: e2e backdrop**

Run: `npm run test:e2e -- contact-waves`
Expected: GREEN (`data-canvas="fluid-waves-backdrop"` mounts on approach; ≤2 canvases; reduced-motion `data-static`).

- [x] **Step 9: Commit**

```bash
git add src/pages/Home.tsx src/index.css package.json package-lock.json tests/unit/bundle-deps.test.ts
git commit -m "feat(stage): contact/footer backdrop = FluidWaves backdrop; delete LiningWavesBackdrop + three"
```

**Acceptance check (read-only):** `tests/e2e/contact-waves.spec.ts` + `tests/unit/bundle-deps.test.ts`.

**Boundaries:** Do NOT change the `stageApproached` IO gate logic or `rootMargin: '120%'`. Do NOT touch the loader/entrance. `blocked:` if `grep` finds any other `three` importer.

---

## Task 4: Ink-bleed loader (`index.html` + `index.css`) + `main.tsx` bleed orchestration

**Model:** integrator-opus-high. **Serves:** spec §3 (translucent `ks.` + ink-bleed exit). Highest-risk task (boot path + GSAP + SVG mask). Carries the real-browser mount smoke. Full markup/CSS/logic below is load-bearing; the glyph paths, stain table, meta text, and timings are exact — transcribe them, shape the rest to fit.

**Files:**
- Modify: `index.html` (replace the loader `<style>` block AND the `<div id="loader">` body markup)
- Modify: `src/index.css` (replace the mirrored LOADER + CURTAIN block, ~lines 363–468)
- Modify: `src/main.tsx` (replace the curtain-controller section with the bleed orchestration)

**Design (ratified spec §3):** full-viewport `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">` — ink `<rect>` masked by `#loader-mask` = white rect (ink visible) + black `ks.` glyph paths (transparent windows) + a `.loader-stains` group (black circles, start `r=0`, grown by GSAP to dissolve the ink). Behind the SVG, a `.loader-standin` div paints the dim tricolor gradient so windows read as paint pre-React; on mount it fades to reveal the live hero canvas behind `#loader`. Four corner cream-on-ink HTML meta blocks. `xMidYMid slice` guarantees the ink always covers the viewport and the mark stays centered + undistorted (square viewBox scales uniformly); covering the whole `0..100` box covers any aspect-ratio crop.

- [x] **Step 1: Replace the loader `<style>` block in `index.html`**

Replace the entire `<style>…</style>` block currently at lines ~342–402 (the `html[data-loading]`, `#loader`, `.loader-half*`, `.loader-mark*`, exit, reduced-motion rules — keep the `@font-face` rule) with:

```html
    <style>
      html[data-loading='true'] { overflow: hidden; }
      @font-face {
        font-family: 'Plus Jakarta Sans';
        src: url('/fonts/PlusJakartaSans-VariableFont_wght.woff2') format('woff2-variations'),
             url('/fonts/PlusJakartaSans-VariableFont_wght.woff2') format('woff2');
        font-weight: 200 800;
        font-style: normal;
        font-display: swap;
      }
      #loader {
        position: fixed; inset: 0; z-index: 9999;
        pointer-events: none; overflow: hidden;
      }
      /* Dim tricolor stand-in behind the windows: reads as paint before React
         mounts the live shader (mirrors the hero fallback gradient). Subtly
         animated (spec §3) via a compositor-cheap transform drift so the paint
         breathes pre-React; the mount fade uses opacity (separate channel). */
      .loader-standin {
        position: absolute; inset: 0; z-index: 0;
        background:
          radial-gradient(60% 80% at 20% 30%, rgba(230, 77, 102, 0.50), transparent 70%),
          radial-gradient(50% 70% at 80% 25%, rgba(77, 128, 230, 0.50), transparent 70%),
          radial-gradient(70% 60% at 55% 80%, rgba(230, 204, 77, 0.35), transparent 70%),
          #0B0E14;
        opacity: 1;
        transition: opacity 300ms ease-out;
        animation: loaderStandinDrift 7s ease-in-out infinite alternate;
        will-change: transform;
      }
      @keyframes loaderStandinDrift {
        from { transform: scale(1) translate3d(0, 0, 0); }
        to   { transform: scale(1.05) translate3d(-1.5%, 1.5%, 0); }
      }
      /* On React mount main.tsx adds .loader--mounted → fade the stand-in so the
         windows reveal the live (already-looping) hero canvas behind #loader. */
      #loader.loader--mounted .loader-standin { opacity: 0; }
      .loader-ink { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; }
      .loader-meta {
        position: absolute; z-index: 2;
        display: flex; flex-direction: column; gap: 2px;
        font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        font-size: 12px; line-height: 1.4; letter-spacing: 0.01em;
        text-transform: lowercase; color: #F5F2EC;
      }
      .loader-meta--tl { top: 28px; left: 28px; text-align: left; }
      .loader-meta--tr { top: 28px; right: 28px; text-align: right; }
      .loader-meta--bl { bottom: 28px; left: 28px; text-align: left; }
      .loader-meta--br { bottom: 28px; right: 28px; text-align: right; }
      @media (max-width: 640px) {
        .loader-meta { font-size: 10px; }
        .loader-meta--tl, .loader-meta--bl { left: 18px; }
        .loader-meta--tr, .loader-meta--br { right: 18px; }
      }
      /* Reduced motion: no bleed — fade the whole loader out; no stand-in drift. */
      @media (prefers-reduced-motion: reduce) {
        #loader { transition: opacity 150ms ease-out; }
        #loader.loader--exit { opacity: 0; }
        .loader-standin { transition: none; animation: none; }
      }
    </style>
```

- [x] **Step 2: Replace the `<div id="loader">` markup in `index.html`**

Replace the whole `<div id="loader" aria-hidden="true">…</div>` block (the two `.loader-half` panels + three `.loader-mark` spans) with:

```html
    <!-- LOADER. Ink SVG rect masked by static ks. glyph windows (paths extracted
         from Plus Jakarta Sans 700 — no font dependency, no FOUT). The stains
         group is grown by GSAP (main.tsx) to dissolve the ink and reveal the
         settled hero. Corner meta is crisp cream HTML on the ink. -->
    <div id="loader" aria-hidden="true">
      <div class="loader-standin"></div>
      <svg class="loader-ink" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="loader-stain-rough" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <mask id="loader-mask">
            <rect x="-20" y="-20" width="140" height="140" fill="#fff" />
            <g transform="translate(30.74 39.34) scale(0.02861)" fill="#000">
              <path d="M60.5 745.0V-12.0H191.75V484.25L141.75 469.5L397.75 201.5H560.75L359.75 420.25L564.75 745.0H414.75L237.25 463.0L314.5 447.5L151.0 623.5L191.75 542.75V745.0Z" />
              <path d="M814.5 757.0Q727.75 757.0 663.375 715.375Q599.0 673.75 574.5 603.0L672.75 556.5Q694.25 601.75 731.625 627.75Q769.0 653.75 814.5 653.75Q850.5 653.75 871.5 638.125Q892.5 622.5 892.5 595.75Q892.5 579.75 884.0 569.25Q875.5 558.75 861.25 551.25Q847.0 543.75 829.5 539.0L740.5 514.0Q671.75 494.5 636.5 453.125Q601.25 411.75 601.25 355.75Q601.25 305.75 626.75 268.5Q652.25 231.25 697.75 210.375Q743.25 189.5 801.5 189.5Q878.5 189.5 937.75 226.5Q997.0 263.5 1021.5 330.25L922.25 376.75Q908.25 340.0 875.25 318.25Q842.25 296.5 800.75 296.5Q767.75 296.5 748.625 311.25Q729.5 326.0 729.5 350.5Q729.5 365.5 737.5 376.25Q745.5 387.0 760.25 394.25Q775.0 401.5 793.5 407.0L881.0 433.0Q948.25 452.75 984.375 493.125Q1020.5 533.5 1020.5 591.25Q1020.5 640.5 994.5 677.75Q968.5 715.0 922.5 736.0Q876.5 757.0 814.5 757.0Z" />
              <path d="M1153.5 745.0V605.0H1286.0V745.0Z" />
            </g>
            <g class="loader-stains" filter="url(#loader-stain-rough)" fill="#000">
              <circle cx="28" cy="30" r="0" />
              <circle cx="72" cy="26" r="0" />
              <circle cx="24" cy="72" r="0" />
              <circle cx="76" cy="74" r="0" />
              <circle cx="50" cy="50" r="0" />
              <circle cx="52" cy="36" r="0" />
            </g>
          </mask>
        </defs>
        <rect x="-20" y="-20" width="140" height="140" fill="#0B0E14" mask="url(#loader-mask)" />
      </svg>
      <div class="loader-meta loader-meta--tl"><span>kevin shibuya</span><span>senior front-end engineer</span></div>
      <div class="loader-meta loader-meta--tr"><span>porto alegre, br</span><span>−30.03, −51.23</span></div>
      <div class="loader-meta loader-meta--bl"><span>portfolio · 2026</span></div>
      <div class="loader-meta loader-meta--br"><span>react · typescript · webgl</span></div>
    </div>
```

(Note: minus signs in the TR coords are the U+2212 MINUS `−`, matching the hero anatomy convention; separators are `·`.)

- [x] **Step 3: Mirror the loader CSS in `src/index.css`**

Replace the entire `/* LOADER + CURTAIN … */` block (~lines 363–468, from `html[data-loading='true']` through the reduced-motion `@media` closing brace) with the SAME rules as Step 1 (minus the `@font-face`, which lives elsewhere in the sheet). Keep the block comment header describing the new structure. The rules must be identical to the inline ones so the bundled sheet is a no-op re-declaration — this INCLUDES the animated `.loader-standin` (`animation: loaderStandinDrift …`), the `@keyframes loaderStandinDrift`, and the reduced-motion `.loader-standin { animation: none; }` override. Do not drop the keyframes when mirroring.

- [x] **Step 4: Rewrite the curtain controller in `src/main.tsx`**

Replace everything from the `const reduceMotion = …` line to end-of-file with the bleed orchestration. Add the GSAP imports at the top of the file (after the existing imports):

```ts
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
```

Controller (replaces the old `liftCurtain`/timeout block):

```ts
// Loader controller. The ink SVG loader in index.html paints at first byte;
// the ks. glyph windows show the stand-in gradient, then (post-mount) the live
// hero shader. We dissolve the ink with a GSAP stain bleed once React has
// painted + a min dwell has elapsed, then resolve the curtain + entrance gates.
gsap.registerPlugin(CustomEase)
CustomEase.create('house', '0.22,1,0.36,1') // idempotent; Hero also registers it

const reduceMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return false }
})()
const MIN_DWELL_MS = reduceMotion ? 200 : 600
const MAX_WAIT_MS = 3000

const loaderEl = document.getElementById('loader')
const startedAt = performance.now()
let lifted = false

const finishLoader = (): void => {
  loaderEl?.remove()
  document.documentElement.removeAttribute('data-loading')
  resolveCurtain()
  resolveEntrance()
}

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (!loaderEl) {
    // Defensive: no loader element (misconfigured deploy). Still release the
    // scroll lock so the page isn't frozen, and resolve both gates.
    document.documentElement.removeAttribute('data-loading')
    resolveCurtain()
    resolveEntrance()
    return
  }
  if (reduceMotion) {
    // No bleed: fade the whole loader (CSS opacity 150ms), then remove.
    loaderEl.classList.add('loader--exit')
    window.setTimeout(finishLoader, 200)
    return
  }
  // Ink bleed: grow the stains in the SVG mask to fully dissolve the ink.
  const stains = loaderEl.querySelectorAll<SVGCircleElement>('.loader-stains circle')
  const ENDS = [55, 55, 55, 55, 50, 48]
  const DELAYS = [0, 0.08, 0.16, 0.1, 0.2, 0.26]
  if (stains.length === 0) {
    finishLoader()
    return
  }
  const tl = gsap.timeline({ onComplete: finishLoader })
  stains.forEach((c, i) => {
    tl.to(c, { attr: { r: ENDS[i] ?? 55 }, duration: 0.6, ease: 'house' }, DELAYS[i] ?? 0)
  })
}

// Hard fallback — always start the lift within MAX_WAIT.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

// After React has painted at least once (double rAF): reveal the live shader
// through the windows (fade the stand-in), then start the bleed after dwell.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    loaderEl?.classList.add('loader--mounted')
    const elapsed = performance.now() - startedAt
    window.setTimeout(liftCurtain, Math.max(0, MIN_DWELL_MS - elapsed))
  })
})
```

Keep the existing top-of-file `resolveCurtain` import and add `resolveEntrance` to it:
```ts
import { MotionProvider, resolveCurtain, resolveEntrance } from './context/MotionContext'
```
(`resolveEntrance` is already exported from MotionContext — see its `export { resolveCurtain, resolveEntrance }`.)

- [x] **Step 5: Typecheck + lint**

Run: `npm run build && npm run lint`
Expected: clean. (AttrPlugin for `attr:{r}` is in gsap core — no extra registration.)

- [x] **Step 6: e2e loader**

Run: `npm run test:e2e -- loader`
Expected: GREEN (SVG mask + 3 glyph paths + 4 meta blocks present; `kevin shibuya` visible; loader removed after bleed; zero console errors; reduced-motion fade path removes the loader).

- [x] **Step 7: Real-browser mount smoke (boot-path, per Global Constraints) — scoped to what Task 4 can show**

> **Important (review fix):** at THIS task the hero is not yet settled — `.hero-canvas` is still CSS `opacity: 0` and the Hero GSAP timeline holds it at `autoAlpha 0` until `curtainGone` (both removed in Task 5). So once the stand-in fades on mount, the glyph windows reveal an opacity-0 hero canvas = ink-on-ink → the `ks.` mark reads as invisible/ink here, BY DESIGN, until Task 5. Do NOT try to confirm "windows show live shader paint" or "bleed reveals the settled hero" in Task 4 — those move to Task 5's smoke.

Run: `npm run test:e2e -- loader` at `npx vite preview` (Playwright's webServer builds+serves). Confirm the ACHIEVABLE-at-Task-4 set: page loads, `#root` renders, the loader SVG + 3 glyph-window paths + 4 corner meta are present, the ink visibly dissolves via organic staggered stains (no hard-edged wipe, no residual ink at any corner) on both a wide and a narrow window, `#loader` is removed, the gates resolve (`loaderState` reaches `done`), and there are ZERO console errors.

- [x] **Step 8: Commit**

```bash
git add index.html src/index.css src/main.tsx
git commit -m "feat(loader): ks. window mark + ink-bleed exit; main.tsx orchestrates the bleed"
```

**Acceptance check (read-only):** `tests/e2e/loader.spec.ts`. `hero-entrance.spec.ts` stays RED until Task 5 (the hero still rises after the bleed here) — that is expected.

**Boundaries:** Do NOT change `MotionContext` (resolvers already exist). Do NOT delete the Hero entrance timeline yet (Task 5). Keep `data-loading` held until `finishLoader`. If `feTurbulence`/`feDisplacementMap` causes visible artifacts or jank in the smoke, dropping the `filter="url(#loader-stain-rough)"` attribute is the ratified graceful fallback (smooth-edged stains) — note it in the commit if applied. `blocked:` if the bleed leaves any residual ink at any tested aspect ratio (return for opus re-tuning of stain radii).

---

## Task 5: Hero entrance retirement (settled from first paint)

**Model:** integrator-opus-high. **Serves:** spec §4 (entrance cascade deleted; hero settled from first React paint; role cycling + back-nav unchanged; `MotionContext` public shape preserved).

**Files:**
- Modify: `src/components/sections/Hero.tsx` (delete the GSAP entrance effect + imports; simplify mask markup)
- Modify: `src/index.css` (hero settled state: `.hero-canvas`/`.hero-meta` opacity 1; drop entrance-only mask machinery)

**Consumer audit (spec §4 — completed at plan time, all `entranceDone` consumers accounted for):**

| Consumer | Uses `entranceDone` to… | After this wave |
|---|---|---|
| `MotionContext.tsx` | owns the promise + resolvers | unchanged (public shape preserved) |
| `main.tsx` (Task 4) | — | now CALLS `resolveEntrance()` at bleed completion (the new normal-path resolver) |
| `components/layout/Header.tsx` | `setVisible(true)` (nav fade-in) | unchanged — resolves at bleed completion instead of timeline end |
| `components/layout/SmoothScroll.tsx` | `instance.start()` (Lenis) | unchanged — starts at bleed completion |
| `hooks/useScrollLockDuringEntrance.ts` | flip `data-loader-state` → `done` (release scroll lock) | unchanged — releases at bleed completion |
| `components/canvas/FluidWavesHero.tsx` | gate the rAF loop | REMOVED in Task 2 (loop now runs from mount) |

Net: `entranceDone` stays in the public shape and is resolved by `main.tsx` (fresh load, motion + reduced) and `bypassEntrance()` (SPA back-nav). Hero no longer resolves it. No consumer churns.

- [x] **Step 1: Delete the entrance effect + unused imports in `Hero.tsx`**

Remove the entire entrance `useEffect` (the `heroRef`-driven timeline: `gsap.utils.selector`, the reduced-motion/bypass `gsap.set` branch, the `gsap.context` timeline, `curtainGone.then(run)`, cleanup). Remove the now-unused imports: `gsap`, `CustomEase`, `curtainGone`, and the module-scope `gsap.registerPlugin(CustomEase)` + `CustomEase.create('house', …)` lines. Drop `resolveEntrance`, `entranceBypassed` from the `useMotion()` destructure (keep `prefersReducedMotion`). Keep `heroRef` only if still referenced; otherwise remove it and the `ref={heroRef}` on `<section>`.

- [x] **Step 2: Simplify the hero markup (masks retired)**

The role + name no longer need clip-rise wrappers. Replace the `.hero-bottom` inner markup:
```tsx
<div className="hero-bottom">
  <div className="hero-role-line">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${lang}-${roleIdx}`}
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -12, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.94 }}
        className="hero-role"
        onClick={cycleRole}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            cycleRole()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`cycle role — currently ${activeRole}`}
      >
        {activeRole}
      </motion.span>
    </AnimatePresence>
  </div>

  <h1 className="hero-name" aria-label={`${t('hero.name1')} ${t('hero.name2')}`}>
    <span className="hero-line">{t('hero.name1')}</span>
    <span className="hero-line">{t('hero.name2')}</span>
  </h1>
</div>
```
Keep the `.hero-line` class on the two name spans (still styled `display:block`; the e2e no longer asserts a transform on it, but the class is harmless and keeps CSS stable). The Framer `AnimatePresence` role cycle is untouched (that is hover/state animation, not the retired entrance).

- [x] **Step 3: Hero settled CSS**

In `src/index.css`:
- `.hero-canvas { … opacity: 0; }` → `opacity: 1;` (settled from first paint).
- `.hero-meta { … opacity: 0; }` → `opacity: 1;`.
- Delete the now-unreferenced `.hero-role-mask`, `.hero-role-rise` rules and the `overflow: hidden` `.hero-mask` rule IF `.hero-mask`/`.hero-role-rise`/`.hero-role-mask` no longer appear in any TSX (grep to confirm — Step 4). Add a minimal `.hero-role-line { align-self: flex-start; padding-bottom: 2px; }` to replace `.hero-role-mask`'s layout role.
- Delete the reduced-motion `@media` block that force-set `.hero-canvas`/`.hero-meta` opacity to 1 (now the default) — or leave it as a harmless no-op; prefer deleting for cleanliness.

- [x] **Step 4: Grep for orphaned classes**

Run: `grep -rn "hero-mask\|hero-role-rise\|hero-role-mask\|curtainGone\|entranceBypassed" src`
Confirm the only remaining hits are in `MotionContext.tsx` (`curtainGone`/`entranceBypassed` public API) and `Home.tsx`/`useScrollLockDuringEntrance.ts` (`bypassEntrance`/`entranceBypassed` consumers) — NOT in `Hero.tsx` or hero CSS. Record findings in the task notes. Remove any Hero-local orphans found.

- [x] **Step 5: Typecheck + lint + unit**

Run: `npm run build && npm run test:unit -- Hero && npm run lint`
Expected: build clean (no unused `gsap`/`curtainGone`), `tests/unit/Hero.test.tsx` GREEN, lint clean.

- [x] **Step 6: e2e entrance + shader + shell smokes**

Run: `npm run test:e2e -- hero-entrance hero-shader section-enters reduced-motion`
Expected: ALL GREEN — including the Task-5 discriminator (`.hero-line` at identity transform WHILE the loader is up), hero name settled (opacity 1, canonical role), nav `is-visible`, scroll released after bleed, reduced-motion fast+settled, sections still enter, shader unaffected.

- [x] **Step 7: Real-browser visual smoke (the confirmation deferred from Task 4)**

Now that the hero is settled (canvas opacity 1, no timeline holding it), the full loader story is visible. At `npx vite preview --port 4173`, watch a fresh load on BOTH a wide and a narrow window and confirm by eye:
- the `ks.` glyph windows show LIVE tricolor shader paint through the ink (stand-in → live-shader swap is seamless);
- deliberately eyeball the glyph shapes and centering — the mark reads as a correct lowercase `ks.` (k, s, period), centered, undistorted at both aspect ratios (guards the extracted-glyph-path watch-item);
- the ink bleeds away via organic staggered stains and reveals the SETTLED hero (name + role in final position, no rise);
- smooth shader on the hero; zero console errors.

- [x] **Step 8: Commit**

```bash
git add src/components/sections/Hero.tsx src/index.css
git commit -m "feat(hero): retire GSAP entrance cascade — settled from first paint; bleed is the entrance"
```

**Acceptance check (read-only):** `tests/e2e/hero-entrance.spec.ts` + `tests/unit/Hero.test.tsx`.

**Boundaries:** Do NOT alter `MotionContext`'s public shape, `Header`, `SmoothScroll`, or `useScrollLockDuringEntrance`. Do NOT touch the role-cycle Framer logic or the scrim. `blocked:` if removing the timeline leaves the entrance gate unresolved on any path (should not — `main.tsx` owns it now; verify Header goes `is-visible`).

---

## Task 6: WorkRow float first-hover fix

**Model:** implementer-sonnet-medium. **Serves:** spec §5 (float materializes at the cursor; no fly-in from top-left). Complete change below; API verified via context7 (Framer Motion v12 `MotionValue.jump()` sets the value instantly, ending active animations and bypassing the spring).

**Files:**
- Modify: `src/components/ui/WorkRow.tsx` (the `onMouseEnter` handler)

- [x] **Step 1: Teleport the tracking values on enter**

In `WorkRow.tsx`, replace the `hoverHandlers` block:
```tsx
  const hoverHandlers = showFloat
    ? {
        onMouseMove: handleMove,
        onMouseEnter: () => floatVisible.set(1),
        onMouseLeave: () => floatVisible.set(0),
      }
    : {}
```
with:
```tsx
  // First hover: teleport BOTH the source (cursorX/Y) and the bound spring
  // (springX/Y) to the pointer BEFORE showing the float, so it materializes at
  // the cursor instead of spring-flying in from the (-400,-400) origin.
  // jump() sets the value instantly and ends the active spring animation
  // (Framer Motion v12). Subsequent onMouseMove keeps the tracking spring feel.
  function handleEnter(e: React.MouseEvent) {
    cursorX.jump(e.clientX)
    cursorY.jump(e.clientY)
    springX.jump(e.clientX)
    springY.jump(e.clientY)
    floatVisible.set(1)
  }

  const hoverHandlers = showFloat
    ? {
        onMouseMove: handleMove,
        onMouseEnter: handleEnter,
        onMouseLeave: () => floatVisible.set(0),
      }
    : {}
```
(`handleMove` is unchanged — it still `.set()`s cursorX/Y for the smooth in-row tracking.)

- [x] **Step 2: Typecheck + lint + unit**

Run: `npm run build && npm run test:unit -- WorkRow && npm run lint`
Expected: build clean; `tests/unit/WorkRow.test.tsx` (existing) GREEN; `tests/unit/WorkRow.float.test.tsx` GREEN (`jump` called with 640 and 360 on enter); lint clean.

- [x] **Step 3: e2e rows hover (regression)**

Run: `npm run test:e2e -- rows-hover`
Expected: GREEN (rows tint on hover; stagger finishes). Manually confirm at `npx vite preview` that the Projects/Archive float appears AT the cursor on first hover (no diagonal fly-in from the top-left).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/WorkRow.tsx
git commit -m "fix(workrow): float materializes at the cursor on first hover (jump, no fly-in)"
```

**Acceptance check (read-only):** `tests/unit/WorkRow.float.test.tsx` + `tests/unit/WorkRow.test.tsx`.

**Boundaries:** Only the enter handler changes. Do NOT alter the `WorkRowFloat` leaf, the spring config, `handleMove`, or the `showFloat` gate. `blocked:` if `.jump` is not a function on the spring value at this Framer version (it is at `^12.12.1`; if not, return for API re-check).

---

## Task 7: AA recompute + remedies for the two failing pairs + CLAUDE.md contrast table

**Model:** implementer-sonnet-medium (was editor-sonnet-low — the codex review's P2-1 fix makes this touch source: a decorative-exemption attribute + an alpha bump, both fully specified below). **Serves:** spec §6 (recompute contact/footer contrast over worst-case dimmed paint; **all affected pairs pass**). All numbers computed at plan time (WCAG relative luminance; worst case = brightest tricolor `#E6CC4D` under `saturate(0.7)` composited at `0.22` over `#0B0E14` = bg `rgb(57,56,41)`).

> **Why source changes (codex P2-1):** the spec TODO requires "all affected pairs pass." Two pairs sit sub-4.5 over the NEW backdrop and "pre-existing debt" does not satisfy a ratified criterion, so each gets an explicit, computed remedy — one via the WCAG decorative exemption (with code citation), one via a computed alpha that clears 4.5:1.

**Files:**
- Modify: `src/components/sections/Contact.tsx` (add `aria-hidden="true"` to `.contact-num` — decorative exemption)
- Modify: `src/index.css` (`.contact-meta` color alpha `0.5` → `0.62`)
- Modify: `CLAUDE.md` (record the recomputed table + the two remedies)

**Contrast at backdrop opacity `0.22` (worst-case dimmed-yellow bg `rgb(57,56,41)`) — post-remedy:**

| Contact/Footer text | color | size | ratio | AA needed | verdict |
|---|---|---|---|---|---|
| `.contact-title` | `--text` cream | huge | 8.9:1 | 3.0 (large) | ✅ |
| `.contact-title em` | `--blue-300` #7AA0ED | huge | 4.58:1 | 3.0 (large) | ✅ |
| `.contact-lede` | rgba(246,249,252,.6) | 18px | 5.19:1 | 4.5 | ✅ |
| `.section-index` (contact) | `--blue-200` #7AA0ED | small | 4.58:1 | 4.5 | ✅ |
| `.contact-label` | `--text` cream | 20–32px | 8.9:1 | 4.5 | ✅ |
| `.contact-icon` | `--blue-200` | 16px | 4.58:1 | 4.5 | ✅ |
| `.footer-name` | `--text` cream | huge | 8.9:1 | 3.0 | ✅ |
| `.footer-*` meta / `.footer-lang` | `--text-faded` #A8A49C | 11px | 4.79:1 | 4.5 | ✅ |
| `.contact-num` | rgba(246,249,252,.4) | 10px | 3.19:1 | — | ✅ **decorative exemption** (`aria-hidden`, WCAG 1.4.3 note 1) |
| `.contact-meta` | **rgba(245,242,236,.62)** | 13px, hover-revealed | **5.17:1** | 4.5 | ✅ (remedy: alpha .5→.62) |

Every affected pair now passes AA or is a documented decorative exemption. Rationale for each remedy:
- **`.contact-num`** renders `{num}` (`'01'..'04'`, purely ordinal enumeration) and — unlike the rest — carries NO semantic role; the row's accessible name comes from `.contact-label`/`href`. The codebase's own precedent is `.workrow-index`, which is `aria-hidden="true"` (`WorkRow.tsx:107`). Marking `.contact-num` `aria-hidden="true"` makes it a decoration exempt from WCAG 1.4.3 (contrast applies to text that conveys information; decorative text is exempt). This is the correct + codebase-consistent fix — no recolor needed.
- **`.contact-meta`** renders `{meta}` (the email address, `@handle`, cv filename) — REAL informational text, hover-revealed. Computed: `#F5F2EC` at alpha `0.60` → 4.95:1, `0.62` → 5.17:1 over `rgb(57,56,41)`. Ship `0.62` for margin. The `opacity: 0 → 1` hover-reveal mechanism is untouched (that is `opacity`, separate from the color's alpha channel).

- [ ] **Step 1: Decorative exemption for `.contact-num`**

In `src/components/sections/Contact.tsx`, change line ~100:
```tsx
<span className="contact-num">{num}</span>
```
to:
```tsx
<span className="contact-num" aria-hidden="true">{num}</span>
```

- [ ] **Step 2: Alpha remedy for `.contact-meta`**

In `src/index.css`, in the `.contact-meta` rule, change:
```css
  /* --text #F5F2EC, not the retired light-era cream #F6F9FC */
  color: rgba(245, 242, 236, 0.5);
```
to:
```css
  /* --text #F5F2EC. Alpha .5→.62: AA over the 0.22-dimmed backdrop worst case
     (rgb(57,56,41)) = 5.17:1. Hover-reveal opacity 0→1 is separate + untouched. */
  color: rgba(245, 242, 236, 0.62);
```

- [ ] **Step 3: Record the recomputed table in `CLAUDE.md`**

In the Design Direction "Standing rule" / contrast area, add the table above (contact/footer text over the `0.22`-dimmed `FluidWaves` backdrop), stating: worst case `#E6CC4D` × `saturate(0.7)` @ 0.22 over `#0B0E14`; ALL affected pairs pass; `.contact-num` is a decorative exemption (`aria-hidden`, matching `.workrow-index`); `.contact-meta` alpha raised to `0.62` (5.17:1); backdrop opacity is `0.22` for AA (ratified, not the spec's ~0.32).

- [ ] **Step 4: Verify + lint**

Run: `npm run build && npm run lint && npm run test:e2e -- dark-tokens`
Expected: clean; `dark-tokens` still green (page renders on the dark system, zero console errors). Manually confirm at `npx vite preview` that the contact meta (email/handle) is legible over the brightest backdrop region on hover.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Contact.tsx src/index.css CLAUDE.md
git commit -m "fix(aa): contact-num decorative exemption + contact-meta alpha .62; recompute contrast table"
```

**Boundaries:** Only the two remedies above + the doc table. Do NOT change the backdrop opacity (`0.22` is ratified), do NOT recolor the blue accents or footer meta (they already pass), do NOT alter the hover-reveal `opacity` transitions. `blocked:` if `.contact-num`'s `{num}` turns out to carry a semantic role the accessible name depends on (it does not in the current markup — verified at plan time).

---

## Task 8: CLAUDE.md Design Direction + memory doc updates

**Model:** editor-sonnet-low. **Serves:** spec §7. Exact replacement prose below.

**Files:**
- Modify: `CLAUDE.md` (Design Direction: Canvases, Entrance/Loader, NO-list)
- Modify: `.claude/projects/.../memory/reference_ink_draw_hero.md` context note is not required; update the two memory files named in spec §7 via their reference docs.

- [ ] **Step 1: Rewrite the Canvases bullet**

Replace the "Canvases (max 2 on the page)" bullet's two sub-bullets with:
```
  - `FluidWaves` (`src/components/canvas/FluidWaves.tsx`) — ONE shared raw-WebGL component, `variant: 'hero' | 'backdrop'`. Hero = full-strength background (seeded scattered wave motion, tricolor paint, smooth — no pixel quantization). Backdrop = the SAME shader dimmed via CSS (`opacity: 0.22; filter: saturate(0.7)`) behind Contact/Footer, lazy-mounted as the stage nears viewport. Each instance seeds independently.
  - Both: `devicePixelRatio` capped at 1.5, `IntersectionObserver` sets `data-paused="true"` off-screen for every canvas (reduced motion included) and halts the rAF loop, `prefers-reduced-motion` also renders one static frame (`data-static="true"`) and never starts the loop, context-loss fallback (hero → gradient div `data-testid="fluid-waves-fallback"`; backdrop → stage ink stands). The rAF loop runs FROM MOUNT (no entrance gate) so paint animates during the loader bleed. Hero canvas `data-canvas="fluid-waves"`; backdrop `data-canvas="fluid-waves-backdrop"`.
```

- [ ] **Step 2: Replace the Entrance bullet with the Loader/settled-hero prose**

Replace the "Entrance (GSAP, one-shot …)" bullet with:
```
- **Loader + entrance (the bleed IS the entrance)**: the loader is an inline SVG in `index.html` (pre-bundle first paint) — an ink `#0B0E14` rect masked by static `ks.` glyph-outline windows (paths extracted from Plus Jakarta Sans 700; no font dependency) that reveal the shader, plus a stain `<g>` grown by GSAP. Behind it, a dim tricolor CSS-gradient stand-in reads as paint pre-React; on mount the stand-in fades to reveal the live (already-looping) hero canvas through the windows. Four-corner cream-on-ink HTML meta (hardcoded EN). `main.tsx` orchestrates the exit: after React paints + ~600 ms dwell (reduced-motion 200 ms, 3 s hard fallback), it grows 5–6 stains over ~900 ms to dissolve the ink, then removes the loader and calls `resolveCurtain()` + `resolveEntrance()`. Reduced motion: 150 ms opacity fade, static shader frame, no bleed. The Hero renders SETTLED from first React paint — no GSAP rise cascade (retired); role cycling, scrim, and anatomy unchanged. `MotionContext` keeps `curtainGone`/`entranceDone`/resolvers; `entranceDone` now resolves at bleed completion.
```

- [ ] **Step 3: Update the NO-list**

In the "**NO**" bullet, add: `the horizontal curtain-split loader (two tear-half panels + LCP tear-halves), the GSAP hero rise cascade (paint bloom / role rise / name-line masked rises / meta fade), `LiningWavesBackdrop` (three.js — deleted; the three dependency removed), the shader pixel-quantization pass (`pixel_filter`/`PIXEL_FILTER`).` Keep all existing NO entries.

- [ ] **Step 4: Update the two memory reference docs (spec §7)**

- `feedback_hero_entrance_inviolable`: append a dated note that the rise-cascade inviolability is SUPERSEDED by Kevin's ratified "reveal-finished-hero" call (2026-07-19 feedback wave) — the ink bleed is now the entrance; the hero renders settled. The LCP-protection lesson still stands (do not sacrifice perceived-load feel for a metric).
- `feedback_entrancedone_test_pollution`: mark STALE — `HeroNameDrawing` is long deleted and the Hero entrance effect is now gone entirely (no un-resolved timeline to pollute jsdom); the `vi.mock` guidance no longer applies.

Edit these via their files under `~/.claude/projects/-Users-luizarazzera-keki-dev-personal-projects-portfolio/memory/` (the `reference_*`/`feedback_*` markdown the MEMORY.md index links). Only edit existing files; do not invent new memory entries.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(design): rewrite Canvases/Loader/Entrance/NO-list for the shared-canvas ink-bleed system"
```

**Boundaries:** Docs only. Do NOT edit the spec file. Do NOT touch source.

---

## Task 9: Final battery + Lighthouse/LCP gate + manual smoke

**Model:** verifier-sonnet-low. **Serves:** spec §6 (full battery green; perf ≥ 95, LCP ≤ 1.5 s).

**Files:** none (verification + tick spec TODOs).

- [ ] **Step 1: Full unit + typecheck + lint**

Run: `npm run build && npm run test:unit && npm run lint`
Expected: build clean, unit ALL green (was 60; now 60 − 1 deleted FluidWavesHero + 1 FluidWaves(×2 cases) + 1 WorkRow.float ≈ 61–62), lint clean.

- [ ] **Step 2: Full e2e**

Run: `npm run test:e2e`
Expected: all green (loader, hero-entrance, hero-shader, contact-waves, rows-hover, section-enters, reduced-motion, perf-budget, dark-tokens across desktop + mobile projects); prior skips preserved.

- [ ] **Step 3: Lighthouse + LCP (preview, restart after build) — with a pre-agreed remediation ladder**

Run: `npm run build`, then `npx vite preview --port 4173`, then Lighthouse on `http://localhost:4173`. Record perf, and the LCP time AND element.

> **Context (review fix):** the 0.9 s baseline LCP was produced by the loader-mark LCP lock that Task 4 DELETES; post-change LCP shifts to `h1.hero-name` at React mount and is unmeasured until here — the headroom is illusory, so remediation is pre-agreed rather than discovered at a dead-end.

Gate + ladder (execute in order; do not skip to a later rung):
- **(a) Font not blocking the hero-name paint:** confirm `index.html` preloads the Plus Jakarta Sans woff2 (`<link rel="preload" as="font" type="font/woff2" crossorigin>` — present today at the `/fonts/PlusJakartaSans-VariableFont_wght.woff2` line). If it is missing or was removed, ADDING the preload is an authorized in-plan fix (do it, rebuild, re-measure).
- **(b) Hero in the initial chunk:** confirm `Home`/`Hero` are NOT accidentally code-split out of the main chunk (Home imports Hero eagerly; only below-the-fold sections are `lazy`). If a split crept in, un-split Hero (authorized in-plan fix), rebuild, re-measure.
- **(c) LCP in (1.5 s, 2.0 s] with perf ≥ 95:** do NOT stall and do NOT renegotiate silently — record the measured number and PRESENT it to Kevin as a decision (accept the exception vs redesign an early legitimate LCP candidate). Await his call.
- **(d) LCP > 2.0 s, OR perf < 95:** STOP and report as a defect.
- **Not permitted (any rung):** reintroducing an early loader LCP-lock element (e.g. a visible loader text mark) to game the metric — that conflicts with the ratified ink-bleed/window design and is not a silent fix.
- If LCP ≤ 1.5 s and perf ≥ 95 with the element being `h1.hero-name`: gate passes, proceed.

- [ ] **Step 4: Manual smoke (Kevin)**

Kevin confirms at `npx vite preview`: loader windows show paint → ink bleeds away with organic stains → settled hero; smooth shader on both hero and contact/footer backdrop; WorkRow float at cursor; both wide and narrow viewports; zero console errors.

- [ ] **Step 5: Tick the spec TODOs**

For each `- [ ]` in the spec's `## TODO` whose acceptance test is green AND reviewed, edit it to `- [x]` (controller only, per checkbox discipline). Do NOT invent boxes.

- [ ] **Step 6: Code review**

Invoke `superpowers:requesting-code-review` (fresh-context opus) over the branch diff, plus one `codex-review` cross-vendor pass. Fold findings before finishing the branch.

**Boundaries:** No source edits in this task except fixes the review mandates (route those back through the owning task's model). Verification + doc ticks only.

---

## Spec concerns (do NOT edit the spec — recorded here per guardrail)

1. **Backdrop opacity `0.22` — RATIFIED (2026-07-19, interactive) as the AA-verified murmur strength, superseding the spec's `~0.32`.** Spec §2 / decision 4 wrote the backdrop dimming as `opacity ~0.32`. The spec §6 AA recompute (a co-ratified, standing "verified not hoped" rule) shows that at `0.32`, over the worst-case dimmed-yellow region (`#E6CC4D` × `saturate(0.7)` @ 0.32 over `#0B0E14` ≈ `rgb(78,74,50)`), several ALWAYS-VISIBLE small contact/footer texts fail normal-size AA: `.section-index`/`.contact-icon` `--blue-200` = 3.42:1, footer meta `--text-faded` = 3.58:1, `.contact-lede` = 4.22:1 (all were ≥ 7:1 over pure ink pre-wave — genuine regressions). Kevin reviewed the numbers and ratified `0.22` (2026-07-19, interactive); the plan ships it, no longer pending. For the record, the two levers considered were:
   - **(A) Lower the backdrop opacity to `0.22`** (this plan's default): every accent + faded pair returns ≥ 4.5:1 (blue-200 4.58, faded 4.79, lede 5.19) with ZERO recolors — the tricolor accents and text colors are preserved. The two remaining faint pairs are cleared in Task 7 per the ratified "all pairs pass" criterion: `.contact-num` via the WCAG decorative exemption (`aria-hidden`, matching `.workrow-index`) and `.contact-meta` via an alpha bump `.5→.62` (5.17:1). Cost: the murmur is ~22% not ~30% (both read as "dimmed murmur").
   - **(B) Keep `0.32` and recolor** the regressing tokens per the standing token-change rule: footer meta `--text-faded`→`--text-muted`, contact `.section-index`+`.contact-icon` `--blue-200`→`--text-muted`, `.contact-lede`→`--text-muted` (all → 5.11:1). Cost: removes the blue eyebrow/icon accent and homogenizes the palette toward muted cream.
   **(A) is the ratified choice** — it preserves the visual design (accents intact) at a small dimming reduction and satisfies the co-ratified "verified not hoped" gate. (B) is recorded only as the fallback shape if the `0.22` murmur is ever judged too faint; it is not this plan's path.

2. **LCP element shift is assumed, not yet measured.** Spec §6 asserts LCP moves from the loader mark to the hero name and stays ≤ 1.5 s. The new loader has NO LCP candidate (SVG mask windows, CSS-gradient stand-in, and inline SVG rect are all non-candidates; corner meta text is tiny), so LCP should become `h1.hero-name` painting at React mount (occluded by the loader but opacity 1 — occlusion does not disqualify). This is sound but unverified until Task 9. Flagged as a watch-item; Task 9 gates it. If LCP unexpectedly lands on a corner-meta text block and exceeds budget, the fix is to ensure the hero name commits in the initial main chunk (it already does) — not a spec defect.

3. **Bleed cost of the `feTurbulence`+`feDisplacementMap` filter on an animating full-viewport mask.** Re-rasterizing the filtered mask each frame for ~0.9 s could jank low-end GPUs. No automated test covers the bleed window (perf-budget's long-task check runs during SCROLL only; CLS is zero because the loader is `position:fixed` — mask changes are paint, not layout). Task 4 keeps the filter with modest params (`baseFrequency 0.06`, `scale 5`) and ratifies dropping it (smooth-edged stains) as the graceful fallback if the manual smoke shows jank. Acceptable per spec §3.

## Self-review

- **Spec coverage:** §1 smooth shader → Task 2; §2 shared component + backdrop + rAF-from-mount → Tasks 2, 3; §3 loader → Task 4; §4 entrance retirement → Task 5; §5 WorkRow float → Task 6; §6 verification/AA/budgets → Tasks 0, 7, 9; §7 docs/memory → Task 8. All TODO checkboxes map to a task's acceptance test.
- **Placeholder scan:** none — every code step ships complete code or (for opus tasks) an exact behavioral contract with load-bearing constants supplied.
- **Type/name consistency:** `FluidWaves`/`variant`/`data-canvas="fluid-waves"|"fluid-waves-backdrop"`/`fluid-waves-fallback`/`.fluid-waves-canvas--backdrop`/`resolveEntrance`/`resolveCurtain`/`.loader-stains circle` are used identically across tasks and tests.
