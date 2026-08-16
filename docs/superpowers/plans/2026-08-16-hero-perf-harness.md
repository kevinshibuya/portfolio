# Hero Perf Harness + Optimization Campaign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic three-layer perf system (exact budgets / scenario medians / Lighthouse bench) plus the pixel gate, record baselines, then run the six-batch optimization campaign where every change is kept only on measured evidence with zero visual change.

**Architecture:** App-side determinism hooks (URL params in `FluidWaves`) make the shader reproducible; a committed Playwright+CDP scenario runner (`perf/`) measures the four observed symptoms against `perf/baseline.json`; Playwright e2e specs carry the exact budgets and the ~30-golden pixel gate. The campaign is six sequential keep-or-revert batches, each gated by `npm run perf` + the pixel gate.

**Tech Stack:** Playwright (existing), CDP tracing, Lighthouse (new devDep), raw WebGL1, node scripts (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md` — read it first; the determinism model, cadence/trajectory rule, and campaign rules live there and bind every task.

## Global Constraints

- **Zero visual change**: the pixel gate (near-zero tolerance) is the sole arbiter; animation cadence, sim rate, easing, and trajectory are visuals — no fps caps, no sim slowdowns (spec: "Pixel gate").
- Rig = this Mac. `perf/` runs are headed Chrome. Reports stamp rig state; mismatched-rig runs never update baselines.
- Determinism hooks must be prod-safe (Lighthouse + pixel gate run against the preview build) with zero cost when params are absent.
- One hypothesis per campaign batch; keep only if target metric improves beyond its band AND nothing regresses AND pixel gate holds; otherwise revert. No partial credit.
- Kept wins ratchet `baseline.json` in the same commit.
- Existing invariants stay green: tsc, lint, unit 99/99, serial e2e (54 specs pre-plan; this plan adds specs — new counts recorded as they land).
- Never touch `main`/`staging`; all work on `perf/hero-harness`.
- No spaced em-dashes in any reader-facing string (house rule; N/A to code/docs).
- Plan checkboxes: tick each `- [ ]` immediately after that step lands, before the next step.

## Measured baselines (recorded at authoring time, 2026-08-16)

Runtime/energy numbers are **defined by the harness being built** — they are deliberately recorded by Task 5 on the untouched tree, not invented here. This plan sets **no absolute runtime targets**; campaign success is relative (beyond-band improvement vs Task 5 baseline). What is measurable now, is:

- Built chunk bytes (uncompressed, `dist/assets`, tree @ `4ed990d`): index 109,140 · react-core 186,629 · framer-motion 123,914 · i18n 50,650 · router 37,081 · lenis 18,819 · Projects 6,599 · palette 185 · CSS 51,283; lazy: Archive 55,680 · projects-data 30,787 · WorkExperience 8,231 · ProjectDetail 10,070 · Contact 2,856 · Footer 932 · Skills 2,120 · Stats 2,245 · others < 3 KB.
- Test suite: unit 99/99, serial e2e 54/54, tsc clean (verified this session on `staging` = this tree minus the spec doc).
- `FluidWaves.tsx` facts: seed `Math.random()` at `~:250`; `getContext('webgl', { alpha: false })` at `:193`; per-frame work = `uniform1f(time)` + `drawArrays` (1 draw, 1 uniform upload); dissolve block guarded only by `dissolveStrength` uniform (`1.0` for hero → all hero pixels pay 2×fbm = 8 noise taps); DPR cap 1.5; static-frame path `drawFrame(seed * 10)` used by reduced-motion/resize/re-entry.

## Task → Rung proposal (orchestrator re-judges at dispatch)

| Task | Rung |
|---|---|
| 1 hooks | implementer-opus-medium |
| 2 pixel gate | implementer-opus-medium |
| 3 scenario runner | integrator-opus-high |
| 4 lighthouse | implementer-opus-medium |
| 5 baseline + sensitivity | implementer-opus-medium |
| 6 Layer-1 budgets | implementer-opus-medium |
| 7–12 campaign B1–B6 | integrator-opus-high (B3: implementer-opus-medium) |

---

### Task 1: Determinism hooks in FluidWaves (`?perf-seed`, `?perf-freeze`, `?perf-counters`)

**Files:**
- Modify: `src/components/canvas/FluidWaves.tsx`
- Test: `tests/e2e/perf-hooks.spec.ts` (create — acceptance, authored below, read-only to implementer)

**Interfaces (Produces — later tasks depend on these exactly):**
- URL param `perf-seed=<float>`: overrides `Math.random()` for BOTH canvas instances (same value; instances already differ via variant geometry — identical seed is fine and required for reproducibility).
- URL param `perf-freeze=<float seconds>`: the rAF loop never starts; exactly one frame is drawn at sim time `<float>` once the canvas would normally start (reuse the static-frame path used by reduced motion). Canvas gets attribute `data-perf-frozen="true"` after that frame. Loader/entrance (GSAP/Framer) run normally — only the shader clock is frozen.
- URL param `perf-counters` (presence flag): wraps the `gl` context calls so that `window.__PERF_GL__[<data-canvas value>] = { drawCalls, uniformUploads, frames }` accumulates live (`frames` increments per `drawFrame` call). Typed via a `declare global` in the component file.
- Precedence: `perf-freeze` wins over reduced-motion (same code path); IO pause logic untouched.

**Work:** Parse `location.search` once at module scope or mount (your choice). Zero behavior change when params absent — guard every hook behind the parsed value; no per-frame cost added to the normal path (the counters wrapper may exist only when the flag is present, e.g. wrap `drawFrame`/uniform setters conditionally at setup, not branch-per-call in the hot loop). No React API surface change; `variant` prop untouched.

- [ ] **Step 1:** Write `tests/e2e/perf-hooks.spec.ts` verbatim (below), run `npx playwright test perf-hooks --workers=1` — all RED (params don't exist yet).

```ts
import { test, expect } from '@playwright/test'

// Acceptance for the FluidWaves determinism hooks (spec: "App instrumentation").
// Authored upstream — implementers make these pass, never edit them.

const settle = async (page: import('@playwright/test').Page, query: string) => {
  await page.goto(`/?${query}`)
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.waitForSelector('[data-canvas="fluid-waves"]')
}

test('perf-freeze renders one deterministic frame; identical across reloads', async ({ page }) => {
  await settle(page, 'perf-seed=0.5&perf-freeze=2')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const canvas = page.locator('[data-canvas="fluid-waves"]')
  const a = await canvas.screenshot()
  await settle(page, 'perf-seed=0.5&perf-freeze=2')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const b = await canvas.screenshot()
  // Same GPU, same seed, same frozen time: byte-stable within trivial noise.
  expect(a.length).toBe(b.length)
  let diff = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
  expect(diff / a.length).toBeLessThan(0.001)
})

test('different perf-seed produces different paint', async ({ page }) => {
  await settle(page, 'perf-seed=0.1&perf-freeze=2')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const a = await page.locator('[data-canvas="fluid-waves"]').screenshot()
  await settle(page, 'perf-seed=0.9&perf-freeze=2')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const b = await page.locator('[data-canvas="fluid-waves"]').screenshot()
  let diff = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) diff++
  expect(diff / n).toBeGreaterThan(0.01)
})

test('perf-freeze halts the loop; perf-counters exposes exact per-frame GL work', async ({ page }) => {
  await settle(page, 'perf-seed=0.5&perf-counters')
  await page.waitForTimeout(1000)
  type Counters = Record<string, { drawCalls: number; uniformUploads: number; frames: number }>
  const s1 = await page.evaluate(() => (window as unknown as { __PERF_GL__: Counters }).__PERF_GL__)
  await page.waitForTimeout(1000)
  const s2 = await page.evaluate(() => (window as unknown as { __PERF_GL__: Counters }).__PERF_GL__)
  const hero1 = s1['fluid-waves']; const hero2 = s2['fluid-waves']
  expect(hero1).toBeDefined()
  const frames = hero2.frames - hero1.frames
  expect(frames).toBeGreaterThan(10) // loop is running
  // Exact per-frame contract: 1 draw call and 1 uniform upload per frame.
  expect(hero2.drawCalls - hero1.drawCalls).toBe(frames)
  expect(hero2.uniformUploads - hero1.uniformUploads).toBe(frames)

  // Frozen: no further frames ever.
  await settle(page, 'perf-seed=0.5&perf-freeze=2&perf-counters')
  await page.waitForSelector('[data-canvas="fluid-waves"][data-perf-frozen="true"]')
  const f1 = await page.evaluate(() => (window as unknown as { __PERF_GL__: Counters }).__PERF_GL__)
  await page.waitForTimeout(800)
  const f2 = await page.evaluate(() => (window as unknown as { __PERF_GL__: Counters }).__PERF_GL__)
  expect(f2['fluid-waves'].frames).toBe(f1['fluid-waves'].frames)
  expect(f2['fluid-waves'].frames).toBe(1)
})

test('no params: hooks dormant, normal loop untouched', async ({ page }) => {
  await settle(page, '')
  const hasCounters = await page.evaluate(() => '__PERF_GL__' in window)
  expect(hasCounters).toBe(false)
  await expect(page.locator('[data-canvas="fluid-waves"]')).not.toHaveAttribute('data-perf-frozen', 'true')
})
```

- [ ] **Step 2:** Implement the hooks per the Work section. `npx playwright test perf-hooks --workers=1` — green.
- [ ] **Step 3:** Regression gates: `npx tsc -b` clean, `npx vitest run` 99/99, `npx playwright test hero-shader hero-entrance hero-dissolve reduced-motion --workers=1` green (the touched surface).
- [ ] **Step 4:** Commit `feat(perf): FluidWaves determinism hooks (seed/freeze/counters)`.

**Boundaries:** No shader math changes, no context-attribute changes (that's B3), no touching the IO/pause logic beyond reading it.

---

### Task 2: Pixel gate (`tests/e2e/pixel-gate.spec.ts` + committed goldens)

**Files:**
- Create: `tests/e2e/pixel-gate.spec.ts`
- Create (generated): `tests/e2e/pixel-gate.spec.ts-snapshots/` (committed goldens)

**Interfaces:** Consumes Task 1 params. Produces the campaign's visual gate: `npx playwright test pixel-gate --workers=1` green = no visual change.

**Work:** Matrix (spec: "Pixel gate"): seeds `[0.137, 0.512, 0.873]` × both existing Playwright projects (desktop-chromium with `test.use({ viewport: { width: 1440, height: 900 } })`, mobile-chromium as-is — Pixel 5 393×851; the spec's 390×844 is approximated by the existing device, note carried) × five moments:

1. `hero-band-t2` — `perf-freeze=2`, entrance settled, screenshot of the hero **section** element.
2. `hero-band-t8` — `perf-freeze=8`, same framing (t-pair catches trajectory drift).
3. `settled-viewport-t2` — `perf-freeze=2`, full-viewport screenshot (nav + name + role over paint).
4. `mid-dissolve` — `perf-freeze=2`, instant `scrollTo` to a position derived from live geometry (hero section bottom minus viewport height → dissolve band fills the lower viewport), viewport screenshot.
5. `stage-arrival` — `perf-freeze=2`, instant scroll to Projects wrapper top + 10% of its scroll length (first card segment, title static), viewport screenshot.

Mechanics: for every shot await `body[data-loader-state="done"]`, `[data-perf-frozen="true"]`, and `document.getAnimations()` all finished; use `toHaveScreenshot` with `{ animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 }`. Scroll positions computed in-page from `getBoundingClientRect`/`scrollHeight` — never hardcoded px. 30 goldens total. Goldens regenerate ONLY on a commit declaring visual intent (spec rule) — during this campaign, never.

- [ ] **Step 1:** Write the spec; run once — RED (missing snapshots is the expected failure mode).
- [ ] **Step 2:** `npx playwright test pixel-gate --workers=1 --update-snapshots` to record goldens; re-run WITHOUT the flag twice consecutively — green both times (determinism proof of the gate itself).
- [ ] **Step 3:** Commit spec + goldens `feat(perf): pixel gate — 30-golden matrix, AA-level tolerance`.

**Boundaries:** No app-code changes. If a moment cannot be made deterministic (two consecutive clean runs disagree), return `blocked:` with the offending moment — do not loosen tolerance beyond 0.001 on your own.

---

### Task 3: Scenario runner (`perf/run.mjs` + four scenarios)

**Files:**
- Create: `perf/run.mjs`, `perf/scenarios/idle-hero.mjs`, `perf/scenarios/load-entrance.mjs`, `perf/scenarios/scroll-transition.mjs`, `perf/scenarios/battery-proxy.mjs`, `perf/lib/` (internal structure your choice)
- Modify: `package.json` (add `"perf": "node perf/run.mjs all"`), `.gitignore` (add `perf/reports/`)

**Interfaces:**
- Consumes: Task 1 params (`perf-seed=0.5` on every scenario load; no freeze — scenarios measure live animation).
- Produces: CLI `node perf/run.mjs [idle-hero|load-entrance|scroll-transition|battery-proxy|all] [--runs N=5] [--update-baseline]`; writes `perf/reports/<timestamp>-<scenario>.json`; compares vs `perf/baseline.json` (schema below) printing improvement / within-band / **REGRESSION** per metric; exit code 1 on any regression. `--update-baseline` rewrites the compared metrics' medians+bands.
- `perf/baseline.json` schema (load-bearing — Tasks 5/6 and the campaign depend on it):

```json
{
  "rig": { "chrome": "…", "macos": "…", "displayScale": 2, "acPower": true, "recordedAt": "…" },
  "scenarios": {
    "<name>": { "<metric>": { "median": 0, "iqr": 0, "band": 0 } }
  },
  "lighthouse": { "<preset>": { "<metric>": { "median": 0, "band": 0 } } },
  "exact": { "chunkBytesCeiling": { "<chunk-prefix>": 0 }, "uniformUploadsPerFrame": 1 }
}
```

**Work (intent + constraints; measurement plumbing is yours):**
- Launch headed Chromium via the installed Playwright library, fixed 1440×900 window, fresh profile, CDP session per run.
- Frame times: injected init-script rAF ring buffer (no app code). Long tasks: PerformanceObserver injected the same way. Main-thread ms: CDP `Performance.getMetrics` deltas over the measurement window. GPU ms/frame: CDP tracing (GPU-process event durations); if trace GPU events prove unstable on this rig, fall back to GPU-process CPU time sampled via `ps` and REPORT the source in the JSON — never silently skip a metric (spec: "Error handling").
- Scenarios reproduce the spec's table exactly: idle-hero (park 30 s, measure middle 20 s), load-entrance (navigation → `data-loader-state=done` → entrance settled; dropped frames + p95 frame time during the explosion/rise window, time-to-first-shader-frame, entrance-settled wall time), scroll-transition (settled hero → `Input.synthesizeScrollGesture` fixed speed/distance derived from live geometry down into the stage's first card segment → settle; p50/p95/max frame time, dropped frames, long tasks, GPU ms/frame), battery-proxy (60 s park; `sudo -n powermetrics` if grantable, else cumulative renderer+GPU process CPU time; report which).
- 5 runs → median + IQR per metric; a run whose spread exceeds a sanity threshold is discarded and rerun, never averaged in. Default band: max(10% of median, 1×IQR) — recorded per metric in the baseline, overridable there.
- Rig stamping: `pmset -g ps` (AC), Chrome version, macOS version, display scale; WARN loudly + refuse `--update-baseline` on mismatch with the stored rig block.

**Acceptance check (authored here; the verifier runs it):**
- `node perf/run.mjs idle-hero --runs 2` twice consecutively: both produce report JSONs whose shared metrics agree within their own declared bands, and the process exits 0 when no baseline exists yet (nothing to regress against — prints "no baseline" per metric).
- `node perf/run.mjs bogus` exits non-zero with a usage message.

- [ ] **Step 1:** Build runner + `idle-hero`; pass the acceptance check above.
- [ ] **Step 2:** Add the other three scenarios; each runs green standalone (`--runs 2`).
- [ ] **Step 3:** `npm run perf` runs all four and prints the comparison table ("no baseline" state).
- [ ] **Step 4:** Commit `feat(perf): deterministic scenario runner (4 symptom scenarios, CDP capture)`.

**Boundaries:** No app-code edits. Node stdlib + Playwright + CDP only — no new runtime deps without surfacing it.

---

### Task 4: Lighthouse bench (`perf/lighthouse.mjs`)

**Files:**
- Create: `perf/lighthouse.mjs`
- Modify: `package.json` (devDep `lighthouse`, script `"perf:lh": "node perf/lighthouse.mjs"`)

**Work:** Median of 5 runs per preset (`desktop` and default mobile), fixed flags/throttling, against the production build served the same way e2e does (`npm run preview -- --port 4173`; reuse a running 4173 server, else spawn and kill it — mirror Playwright's `reuseExistingServer`). Metrics: Performance score, LCP, TBT, CLS, total transfer bytes. Output report JSON to `perf/reports/`; compare vs `baseline.json.lighthouse` with the same band semantics as Task 3; `--update-baseline` supported; audit the PREVIEW server only, never dev (house rule — dev scores are 20–30 points low).

**Acceptance check:** two consecutive `node perf/lighthouse.mjs --runs 3` invocations agree within bands on both presets; report names the preset + flags used.

- [ ] **Step 1:** `npm i -D lighthouse`; build the script; acceptance check green.
- [ ] **Step 2:** Commit `feat(perf): lighthouse bench (median-of-N, preview-only)`.

**Boundaries:** No app changes; no Lighthouse CI/server infra.

---

### Task 5: Baseline recording + harness sensitivity proof

**Files:**
- Create: `perf/baseline.json` (committed), `perf/decisions.md` (campaign log, seeded with a header)

**Work:** On the untouched tree (post Tasks 1–4, which added no visual/behavioral changes — the pixel gate from Task 2 proves it):
1. `npm run perf -- --update-baseline` + `node perf/lighthouse.mjs --update-baseline` → full baseline recorded, rig block stamped. `battery-proxy` power source (powermetrics vs fallback) decided here — ask Kevin ONCE for the sudo grant; either answer is fine, record which.
2. Fill `exact.chunkBytesCeiling`: every current `dist/assets` chunk prefix at measured bytes × 1.05 (the authoring-time table above is the cross-check — flag any drift > 2%).
3. **Sensitivity proof** (spec: "Verification"): in a scratch commit, double the fbm octave count in `FluidWaves` (4→8); `npm run perf` MUST flag an idle-hero regression and exit 1; pixel gate MUST fail (paint changes). Revert the scratch commit. A net that catches nothing proves nothing.
4. **Determinism proof:** second full `npm run perf` — every metric within band vs the baseline just recorded.

**Acceptance check:** `perf/baseline.json` exists, schema-valid, rig-stamped; the sensitivity + determinism runs' outputs pasted into `perf/decisions.md`.

- [ ] **Step 1:** Record baselines (both layers) — commit `perf: baseline recorded on untouched tree`.
- [ ] **Step 2:** Sensitivity proof (scratch regression detected by BOTH nets, then reverted) — evidence into `perf/decisions.md`.
- [ ] **Step 3:** Determinism proof (second run within bands) — evidence into `perf/decisions.md`; commit.

---

### Task 6: Layer-1 exact budgets (extend `tests/e2e/perf-budget.spec.ts`)

**Files:**
- Modify: `tests/e2e/perf-budget.spec.ts` (existing CLS + longtask budgets stay untouched)

**Work:** Add exact assertions (spec: "Layer 1"), all using Task 1 counters where GL state is involved (`?perf-seed=0.5&perf-counters`):
- Backing store: for each mounted canvas, `canvas.width === Math.max(1, Math.round(clientWidth * Math.min(devicePixelRatio, 1.5)))` (and height) — meaningful on both projects (desktop dpr 1, Pixel 5 dpr 2.75→capped).
- Per-frame GL work: over a 1 s counter delta, `drawCalls === frames` and `uniformUploads === frames` exactly (matches `exact.uniformUploadsPerFrame` × frames from `perf/baseline.json`; a kept optimization lowering it updates baseline + this assertion in the same commit).
- Pause: scroll to bottom, `waitForSelector('[data-canvas="fluid-waves"][data-paused="true"]')` (attribute wait, generous timeout — must NOT inherit the timing-race wait pattern of the known `hero-shader.spec.ts` flake; if the attribute genuinely never appears, that is the flake's root cause surfacing — stop and report, per spec "Error handling"), then hero `frames` delta === 0 over 500 ms.
- Reduced motion (`emulateMedia({ reducedMotion: 'reduce' })`): hero `frames === 1` after settle + 1 s.
- Chunk bytes: read `perf/baseline.json` `exact.chunkBytesCeiling`; list `dist/assets`, map chunks by name prefix; every chunk ≤ its ceiling; a chunk with NO ceiling entry fails the test (forces a conscious budget addition).

**Acceptance = the spec file itself running green:** `npx playwright test perf-budget --workers=1`. RED-first is satisfied per-assertion by writing each against the live values and confirming it fails when the tested invariant is deliberately broken locally (e.g., temporarily assert `frames === 2`); this is a budget net, not a feature — document the RED evidence in the commit message.

- [ ] **Step 1:** Add assertions; suite green serially; evidence of one deliberate-break RED per assertion group in the commit message.
- [ ] **Step 2:** Full serial e2e green (all specs, new count recorded). Commit `feat(perf): layer-1 exact budgets join the QA gate`.

**Boundaries:** Do not modify `hero-shader.spec.ts` (the flake is separate); do not touch app code.

---

## The campaign (Tasks 7–12)

**Shared batch procedure — applies verbatim to every batch:**
1. Implement the batch's single hypothesis on the working tree.
2. Gates, in order: `npx playwright test pixel-gate --workers=1` (green or the batch DIES), `npm run perf` (target metric improved beyond band; NOTHING regressed), full serial e2e green, tsc + lint clean.
3. **Keep:** commit code + ratcheted `baseline.json` (via `--update-baseline`) together; one line in `perf/decisions.md`: hypothesis, metric before → after, verdict.
4. **Revert:** `git checkout -- .` (plus delete any new files); one line in `perf/decisions.md`: hypothesis, measured result, why rejected. Reverted batches still tick their plan checkbox — the deliverable is the decision, not the diff.
5. Batches run sequentially in plan order; never combine two hypotheses in one measurement.

### Task 7 (B1): Dissolve band guard — stop paying dissolve fbm on every hero pixel

**Files:** Modify: `src/components/canvas/FluidWaves.tsx` (fragment shader only)

**Work:** The dissolve block runs for all hero pixels (`dissolveStrength = 1.0` canvas-wide) but its contribution above the band is mathematically zero: band progress `p > 1` there → `amp = DISSOLVE_NOISE_AMP * (1.0 - smoothstep(0.55, 1.0, p)) = 0`, and the sweep term sits INSIDE the amp product. Add a spatial guard so pixels above the band skip both fbm calls (8 noise taps) entirely — e.g. extend the existing `dissolveStrength` branch with a `vUv.y` bound derived from `dissolveStart` (exact bound is yours to derive from the shader's own math; it must be provably ≥ the highest pixel the dissolve can visibly touch across all seeds — the pixel gate's 3 seeds × mid-dissolve moment arbitrates). Expected: idle-hero GPU ms/frame down (the hero's upper ~77% of pixels drop 8 taps); battery-proxy down.

- [ ] **Step 1:** Implement → run the shared batch procedure → keep or revert.
- [ ] **Step 2:** Record decision + evidence in `perf/decisions.md`; commit (kept) or log-only commit (reverted).

### Task 8 (B2): Scissor the shading to the visible intersection

**Files:** Modify: `src/components/canvas/FluidWaves.tsx`

**Work:** The hero canvas spans 130svh but at most 100svh is ever on screen. Each animated frame, set `gl.scissor` (+ `SCISSOR_TEST`) to the canvas↔viewport intersection so hidden rows aren't shaded. Constraints: intersection computed from `scrollY` + geometry cached at resize — NO per-frame `getBoundingClientRect`/layout reads; the static-frame paths (reduced-motion, resize repaint, IO re-entry repaint) draw the FULL canvas (they may be the only frame ever drawn); backdrop variant may reuse the mechanism if free, but the hero is the target. Expected: idle-hero GPU ms/frame down ~23% at rest, more mid-scroll; scroll-transition GPU down. Pixel gate arbitrates (hidden rows are by definition not in any golden — but the mid-dissolve and stage-arrival moments verify no seam/stale-row artifact ever scrolls into view).

- [ ] **Step 1:** Implement → shared batch procedure → keep or revert.
- [ ] **Step 2:** Decision + evidence in `perf/decisions.md`.

### Task 9 (B3): WebGL context attributes — three independent toggles

**Files:** Modify: `src/components/canvas/FluidWaves.tsx:193`

**Work:** Three separately-measured sub-hypotheses on `getContext('webgl', …)` (current: `{ alpha: false }` only): (a) `antialias: false` — MSAA off; a fullscreen quad has no geometry edges, expect pixel-identical interior + measurable raster savings; (b) `powerPreference: 'low-power'`; (c) `desynchronized: true` — flagged: this one can alter presentation timing; if the pixel gate OR any frame-time distribution shifts, it dies. Each toggle runs the full batch procedure alone (three measurements, three decisions — they share one plan task because they share one line of code).

- [ ] **Step 1:** Measure (a), decide; measure (b), decide; measure (c), decide — each via the shared procedure.
- [ ] **Step 2:** Decisions + evidence in `perf/decisions.md`.

### Task 10 (B4): Loader/entrance compositing audit

**Files:** Modify (only if the trace convicts): `index.html` (loader SVG/CSS), `src/main.tsx`

**Work:** Forensic first, fix second. From the `load-entrance` trace: is the 45× GSAP scale of `<g class="loader-ks">` compositor-only, or does it rasterize the SVG per frame? Are there long tasks/dropped frames attributable to the loader↔canvas overlap window? If convicted: layerization hints (`will-change: transform` on the scaling group, or promoting the loader SVG to its own layer) — smallest change that flips the trace to compositor-only. If the trace shows the explosion already composites cleanly, the batch's deliverable is that MEASURED no-op verdict in `perf/decisions.md`. Loader visuals are sacrosanct (hero-entrance-inviolable): the pixel gate doesn't cover mid-explosion frames, so any change here must be provably non-visual by mechanism (compositing hints only — no timing, easing, geometry, or opacity changes).

- [ ] **Step 1:** Trace analysis → verdict → (maybe) fix → shared batch procedure.
- [ ] **Step 2:** Decision + evidence in `perf/decisions.md`.

### Task 11 (B5): Scroll-transition JS audit

**Files:** Modify (only what measures hot): `src/components/sections/Projects.tsx`, `src/components/ui/GooeyTitle.tsx`, `src/components/ui/ProjectCardStack.tsx`, `src/components/canvas/FluidWaves.tsx` (velocity read), `src/hooks/*`

**Work:** Instrument, don't assume: (a) React commit count during a scripted scrub of the stage — the design claims zero renders per frame outside `frontIndex` midpoint flips; verify with React Profiler API counts, fix any violation found; (b) GooeyTitle's SVG filter cost during morphs in the scroll-transition trace (raster/GPU spikes attributable to feColorMatrix/blur) — if hot, optimization must keep identical glyph output (pixel gate moments 4–5 + a mid-morph check you add to your OWN evidence, not to the gate); (c) listener audit: every scroll/wheel/touch listener on the transition path passive unless it must preventDefault; (d) the per-frame `window.scrollY` read in the shader loop — cheap, but confirm it isn't forcing layout in the trace. Fix only what the trace convicts; each independent fix is its own measurement through the shared procedure.

- [ ] **Step 1:** Instrument → ranked findings → fix/measure each via the shared procedure.
- [ ] **Step 2:** Decisions + evidence in `perf/decisions.md`.

### Task 12 (B6): Load path (Lighthouse-driven)

**Files:** Modify (as convicted): `index.html`, `vite.config.ts`, `src/main.tsx`, `src/index.css`

**Work:** Driven by the Task 5 Lighthouse baseline's own audit output, not guesses. Candidate territory: font loading (local Plus Jakarta TTF — preload the exact weight files the loader/hero need, `font-display` audit), modulepreload graph (is anything in the initial waterfall lazy-loadable — e.g. does `lenis`/`router` block first paint?), LCP element + timing (the loader is the first paint by design and inviolable — LCP work happens AROUND it, never by trimming it), chunk ceilings from Task 6 must still hold. Each independent fix measured via the shared procedure with Lighthouse presets as the target metrics (frame scenarios must not regress).

- [ ] **Step 1:** Read the LH audits → ranked fixes → each via the shared procedure.
- [ ] **Step 2:** Decisions + evidence in `perf/decisions.md`.

---

### Task 13: Closing report + handoff

**Files:** Create: `perf/REPORT.md`; Modify: `HANDOFF.md`, spec TODO checkboxes

**Work:** Before/after table for every metric across all layers (baseline @ Task 5 vs final), per-batch verdict summary from `perf/decisions.md`, all gates green (tsc, lint, unit, FULL serial e2e including pixel gate + budgets — final counts recorded), spec TODO boxes ticked per checkbox discipline. Then the house PR flow: push `perf/hero-harness`, open the PR against `staging`, deliver Kevin the manual-test rundown, and STOP — the consolidated review is Kevin's to trigger.

- [ ] **Step 1:** `perf/REPORT.md` written from `perf/decisions.md` + baseline diffs.
- [ ] **Step 2:** All gates green (evidence captured); spec TODOs ticked.
- [ ] **Step 3:** Push branch, open PR → staging, manual-test rundown to Kevin. STOP (no self-triggered review).

---

## Verification summary

| Gate | Command | Baseline (authoring time) |
|---|---|---|
| Typecheck | `npx tsc -b` | clean |
| Lint | `npx eslint .` | clean |
| Unit | `npx vitest run` | 99/99 |
| E2E (serial) | `npx playwright test --workers=1` | 54/54 pre-plan; grows with Tasks 1/2/6 |
| Pixel gate | `npx playwright test pixel-gate --workers=1` | created Task 2; green thereafter |
| Perf scenarios | `npm run perf` | baseline @ Task 5; within-band thereafter, ratcheting down |
| Lighthouse | `node perf/lighthouse.mjs` | baseline @ Task 5 |

Runtime numeric baselines are recorded by Task 5 by design (the harness defines the metrics); the campaign's success criterion is relative improvement beyond declared bands, never absolute targets invented at authoring time.
