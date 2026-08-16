# Hero Perf Harness + Optimization Campaign — Design

**Date:** 2026-08-16
**Status:** Approved design (brainstormed with Kevin, section-by-section)
**Branch:** `perf/hero-harness` (off `staging` @ `e66becd`)
**Precedes:** Plan B (Archive→Skills cream restyle) — explicitly blocked on this work.

## Motivation

Kevin observed, on this Mac (the reference rig): heat/fan spin-up while parked on the
hero, jank during the loader explosion + hero text rise, jank during the scroll from
the hero through the dissolve into the pinned Selected Work stage, and sustained
battery drain with the tab open. The hero lifecycle is hot end-to-end.

Measurement today is ad-hoc (~40 untracked probe scripts in `tmp/`, nothing
repeatable, nothing gated). This design ships a **deterministic, committed perf
system** that (1) reproduces each symptom as a fixed scenario, (2) tracks every
resource dimension against baselines, and (3) drives an optimization campaign where
changes are kept **only** on measured evidence — with a pixel gate guaranteeing zero
visual compromise.

## Goals

- Deterministic, repeatable measurement of the hero section + the transition into
  Selected Work: GPU, CPU/main-thread, frame timing, memory, bundle bytes, load
  metrics, energy proxy.
- A standing regression net: exact budgets in the e2e suite (QA-gated) + baselined
  scenario metrics + Lighthouse bench numbers.
- An optimization campaign that measurably reduces resource usage with **zero visual
  change**, enforced automatically (pixel gate — Kevin chose "pixel gate only", no
  per-batch eyeball reviews).

## Non-goals

- No visual redesign, no reduced-visual "performance mode", no changes to animation
  cadence, trajectory, or easing (these count as visual compromises; see Pixel gate).
- No real-device mobile measurement rig (mobile-risk changes are flagged in review
  instead; the rig is this Mac).
- No CI/cloud perf runs — the rig is local by design (numbers are rig-relative).
- Plan B work of any kind.

## The determinism model

"Deterministic" splits into two classes, treated differently:

- **Exact metrics** — properties of the code, zero variance: bytes, pixel counts,
  call counts, behavioral invariants. Hard-asserted in Playwright (Layer 1).
- **Controlled-scenario metrics** — timing/energy numbers that are noisy per-frame
  but stable as a **median over a fixed scenario on a fixed rig**: tracked in
  `perf/baseline.json` with tolerance bands (Layers 2–3). Regression = median
  outside band. 5 runs per scenario, median + IQR recorded.

Environment pinning: fixed seed, fixed viewport, fixed DPR, headed Chrome (real
GPU), fixed scenario scripts. The runner records rig state (AC power via
`pmset -g ps`, display scale, Chrome version, macOS version) into every report and
warns loudly on mismatch with the baseline's recorded rig state; mismatched-rig runs
never update baselines.

## Architecture

```
perf/
  run.mjs                 # CLI: node perf/run.mjs [scenario|all] [--update-baseline]
  scenarios/              # idle-hero.mjs, load-entrance.mjs, scroll-transition.mjs, battery-proxy.mjs
  lighthouse.mjs          # Layer 3 — against `npx vite preview` (4173), median of 5
  baseline.json           # committed medians + tolerance bands + rig metadata
  reports/                # gitignored per-run JSON + trace dumps
tests/e2e/perf-budget.spec.ts    # Layer 1 exact budgets — joins the QA gate (extends the existing file)
tests/e2e/pixel-gate.spec.ts     # golden matrix; goldens committed
```

- `npm run perf` → all scenarios, table vs baseline: improvement / within-band /
  **REGRESSION**.
- `npm run perf -- --update-baseline` → ratchets baselines after a kept win.
- Runner: Playwright headed Chrome + CDP session (tracing for GPU/main-thread frame
  costs; `Input.synthesizeScrollGesture` for the scroll scenario; init-script rAF
  timestamp ring buffer for frame times — no app code needed for frame capture).
- Lighthouse: production build via `npx vite preview` on 4173 (NEVER the dev
  server), fixed flags/throttling config, median of 5.

## App instrumentation (tiny, prod-safe, zero visual effect)

1. **Determinism hooks in `FluidWaves.tsx`** (URL-param driven, work in the prod
   build because Lighthouse + pixel gate run against preview; normal visitors never
   pass them):
   - `?perf-seed=<n>` — overrides the `Math.random()` mount seed for BOTH canvas
     instances.
   - `?perf-freeze=<t>` — renders exactly one frame at sim time `t`, rAF loop never
     starts (same code path as the reduced-motion static frame).
2. **GL call counters** — behind `?perf-counters`, wrap the `gl` context in a
   counting proxy exposing `window.__PERF_GL__` (draw calls, uniform uploads, frames
   drawn). No cost when the param is absent.
3. Nothing else touches app code. Frame timing, tracing, heap, process CPU all come
   from the runner side.

## Scenarios (Layer 2)

Fixed seed, 1440×900 viewport, headed Chrome, 5 runs → median + spread. Each
scenario exists to reproduce one observed symptom.

| Scenario | Symptom | Replays | Key metrics |
|---|---|---|---|
| `idle-hero` | heat/fans at idle | load → entrance settles → park 30 s (measure middle 20 s) | GPU ms/frame, main-thread ms/s, long tasks, fps stability |
| `load-entrance` | load/entrance jank | navigation → loader explosion → text rise settled | dropped frames + p95 frame time during explosion/rise, time-to-first-shader-frame, entrance-settled wall time |
| `scroll-transition` | scroll-down jank | settled hero → CDP scroll at fixed velocity through the dissolve into the stage's first card segment → settle | frame-time p50/p95/max, dropped frames, long tasks, GPU ms/frame |
| `battery-proxy` | battery drain | 60 s idle park | `powermetrics` package + GPU watts (needs one-time sudo grant); fallback: cumulative Chrome renderer+GPU process CPU time |

## Layer 1 — exact budgets (`perf-budget.spec.ts`, QA-gated forever)

- Hero-path JS bytes per chunk (initial bundle + shader-bearing chunk), asserted
  with a small headroom margin over the post-campaign values.
- Canvas backing-store pixels == the DPR-cap formula (`min(devicePixelRatio, 1.5)`).
- Draw calls per frame == 1 per canvas; uniform uploads per frame == the
  baseline-measured count exactly (via `__PERF_GL__`; exact metric, no headroom —
  a kept optimization that lowers it updates the assertion in the same commit).
- Exactly one rAF loop per canvas instance.
- `data-paused` halts the loop off-screen (both variants).
- Reduced motion: static frame present (`data-static`), frame count stable after settle (no loop; the current lifecycle draws up to 3 startup frames — the invariant is stability, not "exactly one").

## Layer 3 — Lighthouse bench

Performance score, LCP, TBT, CLS, total transfer bytes. Median of 5 fixed-flag runs
against preview; tracked in `baseline.json` with tolerance bands like Layer 2.

## Pixel gate (`pixel-gate.spec.ts`)

The sole visual arbiter (Kevin's explicit choice — no per-batch human review):

- Matrix: 3 fixed seeds × 2 viewports (1440×900, 390×844) × moments {hero idle
  frozen at t=2 s, t=8 s, entrance end-state, mid-dissolve scroll position,
  stage-arrival frame} ≈ 30 goldens, committed.
- Tolerance: antialiasing-level only (tiny `maxDiffPixelRatio`). A pixel shift
  beyond AA noise **auto-rejects the optimization** — no judgment calls.
- **Cadence/trajectory rule** (written because static goldens can't see it):
  animation frame rate, sim rate, easing, and motion trajectory are visuals. No
  fps caps, no sim slowdowns. The frozen t=2 s / t=8 s pair catches trajectory
  drift; `idle-hero`'s frame-time distribution catches cadence changes.
- Goldens regenerate ONLY on a commit that declares visual intent (e.g., Plan B) —
  never during this campaign.
- Known limit: the gate sees this Mac's GPU. Optimizations whose output could
  differ on other GPUs (e.g., precision downgrades) are flagged as mobile-risk in
  review, not silently trusted.

## Optimization campaign

1. **Baseline first**: full harness run + all goldens recorded on the untouched
   tree, committed. Every numeric target thereafter carries this measured baseline
   (standing plan rule).
2. **One hypothesis per batch**: implement → `npm run perf` → keep only if
   (a) the targeted metric improves beyond its noise band, (b) nothing else
   regresses, (c) the pixel gate holds. Otherwise **revert** — no partial credit,
   no unmeasured "should help elsewhere" arguments.
3. Kept wins ratchet `baseline.json` down so later batches can't give them back.
4. Campaign ends when the backlog is exhausted or remaining items measure as
   no-ops. The harness, budgets, and pixel gate remain as the standing regression
   net — Plan B inherits them for free.

### Seeded hypothesis backlog (ranked by expected win; hypotheses until measured)

1. **Dissolve band guard: verify/tighten only** (CORRECTED post plan-review: the
   spatial guard `if (p > -0.6)` ALREADY ships — landed in `1b25b0b`, PR #3 fix
   wave — so the original "biggest win" is banked). Remaining question: is `-0.6`
   the tightest provably-safe bound (in-tree comment claims activation needs
   `p > -0.39`)? Derive it; tighten only if the math proves it; expected win small
   or none. Item 2 (scissor) is now the top expected win.
2. **Shading pixels the viewport can't see** — the canvas spans the 130svh band;
   `gl.scissor` to the visible intersection per frame shades ~23% fewer pixels
   parked at top, more mid-scroll. Pixel-identical by construction.
3. **WebGL context attributes** — `alpha:false`, `antialias:false`,
   `powerPreference:'low-power'`, `desynchronized`: blending/compositor savings +
   integrated-GPU hinting.
4. **Loader/entrance overlap** — confirm the 45× GSAP SVG scale is compositor-only
   (no per-frame rasterization) while the shader runs; layerize if not.
5. **Scroll-transition JS** — prove zero React renders per scrubbed frame with
   profiler counts (not code reading); GooeyTitle SVG filter cost during morphs;
   passive listeners; the per-frame scroll-velocity read.
6. **Load path** — hero-chunk bytes, font preload vs the entrance, whatever
   Lighthouse flags on LCP/TBT.

## Error handling & edge cases

- Rig mismatch (battery power, different display scale, Chrome update): report is
  stamped, comparison warns, baseline updates are refused.
- `powermetrics` unavailable (no sudo): `battery-proxy` degrades to process-CPU-time
  and says so in the report; the harness never silently skips a metric.
- Flaky scenario run (e.g., OS interference outlier): IQR is recorded; a run whose
  spread exceeds a sanity threshold is discarded and rerun, never averaged in.
- Pre-existing e2e flake (`hero-shader.spec.ts` "pauses off-screen") is adjacent to
  the Layer 1 pause budget — the budget spec must not inherit its unstable wait
  pattern; if the flake's root cause surfaces during harness work, fix it there.

## Verification (of the harness itself)

- Determinism check: two consecutive `?perf-seed`+`?perf-freeze` screenshots are
  byte-comparable within AA tolerance; two consecutive scenario runs agree within
  their declared bands.
- Sensitivity check: the harness must DETECT a deliberately planted regression
  (e.g., double the domain-warp loop iterations in a scratch commit — a plant
  that hits every pixel) — a net that catches nothing
  proves nothing.
- Standard gates: tsc, lint, unit, full e2e (including the new specs) stay green.

## Execution

Per house rules: this spec + the implementation plan are the fable session's
deliverables; the campaign itself runs in a fresh opus session. Implementer
self-judgment on visuals stays banned — the pixel gate is the arbiter.

## TODO

- [ ] `FluidWaves` determinism hooks: `?perf-seed`, `?perf-freeze`, `?perf-counters` (prod-safe, zero default cost)
- [ ] `perf/run.mjs` scenario runner: 4 scenarios, CDP capture, 5-run median + IQR, rig-state stamping
- [ ] `perf/lighthouse.mjs`: median-of-5 fixed-flag runs against preview
- [ ] `perf/baseline.json` recorded on the untouched tree (all layers) + committed
- [ ] `tests/e2e/pixel-gate.spec.ts`: ~30-golden matrix committed, near-zero tolerance
- [ ] `tests/e2e/perf-budgets.spec.ts`: Layer 1 exact budgets green in the QA gate
- [ ] Harness sensitivity proven: planted regression detected; determinism check passes
- [ ] Campaign: backlog items 1–6 each measured → kept (with ratcheted baseline) or reverted, decision recorded per item
- [ ] Closing report: before/after table for every metric, all gates green
