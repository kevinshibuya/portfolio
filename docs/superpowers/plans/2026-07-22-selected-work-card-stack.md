# Selected Work: Scroll-Scrubbed Card Stack + Gooey Title — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Checkbox discipline (MANDATORY, from project CLAUDE.md):** after each step's command/action lands successfully, edit that step's `- [ ]` to `- [x]` in THIS file BEFORE proceeding to the next step. Do not batch ticks. Before announcing a task complete, grep its section for remaining `- [ ]` and tick or justify each. Tick the matching spec TODO in `docs/superpowers/specs/2026-07-22-selected-work-card-stack-design.md` only when its acceptance test passes AND code review approves.

**Goal:** Replace the WorkRow list in `src/components/sections/Projects.tsx` with a pinned, scroll-scrubbed stage where the top-4 featured projects cycle through an animated card stack under a gooey-morphing title — scroll position is the playhead, fully reversible.

**Architecture:** A `400svh` scroll wrapper drives a `position: sticky; height: 100svh` stage. Framer Motion `useScroll` → `scrollYProgress` feeds pure helpers in `src/utils/stackMotion.ts` (`segmentFor`, `settleFrac`, `depthTransform`, `morphValues`). Every per-frame visual is a `useTransform` MotionValue on a leaf component (zero React state per frame). Two discrete states (`baseIndex` = active segment, `frontIndex` = resting project) flip only at segment boundaries / settle-midpoints via `useMotionValueEvent`, never per frame. Reduced motion keeps the pin but removes all animation (static slots, instant content swaps, no SVG filter).

**Tech Stack:** React 19 + TypeScript (strict), Framer Motion v12 (`useScroll`/`useTransform`/`useMotionValueEvent`/`useMotionValue`), TailwindCSS v4 via `@theme` (CSS in `src/index.css`), react-i18next, Vitest, Playwright.

## Global Constraints

- **Branch:** `feat/selected-work-stack` (off `staging`; merges back into `staging`, **never** `main`). This plan commits only implementation for that branch.
- **Framer Motion only** for the scrub; GSAP stays one-shot-entrance-only. Never mix libraries on one animation.
- **Zero React state per frame.** Entrance variants (`whileInView`, `once`) live on container elements ONLY; scrub transforms live on leaf components via `useTransform`. Never both on one element. (Re-render-kills-entrance lesson: a setState above an in-flight `whileInView(once)` stagger freezes children at opacity 0.)
- **Canonical tokens only** for new CSS: `--text` `#F5F2EC`, `--text-muted` `#C9C4BA`, `--text-faded` `#A8A49C`, `--bg` `#0B0E14`, `--bg-tonal` `#131722`, hairline `rgba(245,242,236,0.13)` (aliased `--hairline`). Tricolor via `accentFor(index)` → `--row-tint` (never a static per-component color). No new tokens (spec: no re-audit needed).
- **Hero-scrim rule:** the `view project` bar text sits on an ink gradient ≥ **0.88 alpha** at text level over worst-case artwork. No cream text on raw artwork.
- **Reduced motion everywhere:** pin stays, ALL animation removed, content swaps instantly at segment midpoints, **no SVG filter at all** (plain text title).
- **TypeScript:** strict, no `any`, explicit return types on hooks and utilities. Functional components, props interface above the component.
- **Prose rule:** no spaced em-dashes (` — `) in reader-facing copy; use `·`.
- **Playwright traps (encode in every e2e task):** run `--workers=1` for signal; import from `@playwright/test` (never `playwright`); inside `page.evaluate` use an explicit `{ return … }` body — never implicitly return a Framer/GSAP object (serialization hang); pass an explicit `timeout:` to any `page.screenshot()` (the hero shader animates forever).
- **Measured baselines (recorded in Task 0, 2026-07-22, this machine):** `tsc -b` clean; unit **66 passed**; Lighthouse desktop performance **89** (fresh `npx vite preview`, two runs 89/92 — record **89** as the floor); serial e2e **43 passed / 1 failed / 2 skipped** (the 1 failure is pre-existing and is Task 1's target). The spec's perf criterion "≥ measured baseline" resolves to **Lighthouse performance ≥ 89**.

---

## Task → Model + effort (proposal; the orchestrator re-judges per task at dispatch)

| Task | Deliverable | Model | Effort | Why |
|---|---|---|---|---|
| 0 | Baseline verify + record | verifier-sonnet-low | — | Mechanical: run suite, capture evidence. Already measured below; re-confirm. |
| 1 | Baseline repair: `perf-budget` long-task | integrator-opus-high | high | Judgment: fix the long task vs re-budget with headroom for the incoming scrub section. Escalate to deep-reasoner-opus-xhigh if the long task is a gnarly compositor/GC issue. |
| 2 | `stackMotion.ts` + RED unit tests | implementer-sonnet-medium | medium | Pure math; RED tests + reference impl fully authored below → near-transcription (may drop to editor-sonnet-low). |
| 3 | `GooeyTitle.tsx` | implementer-sonnet-medium | medium | Complete code below; Framer MotionValue + SVG filter + WebKit degrade + RM branch. Escalate to integrator-opus-high on ATDD fail. |
| 4 | `ProjectCardStack.tsx` | implementer-sonnet-medium | medium | Complete code below; depth grammar via helper, a11y inert, RM branch. |
| 5 | `Projects.tsx` rebuild + wiring + skip-links + stale-spec update | integrator-opus-high | high | The state machine + re-render-trap avoidance + a11y wiring concentrate the judgment. |
| 6 | `index.css` stack styles | implementer-sonnet-medium | medium | Complete CSS below; centerpiece visual. Invoke `frontend-design` before editing; escalate to integrator-opus-high if visual QA fails. |
| 7 | i18n EN+PT strings | editor-sonnet-low | — | Exact strings authored below; transcription. |
| 8 | Reduced-motion e2e spec | implementer-sonnet-medium | medium | Full spec authored below; may need selector/timing tuning against the real build. |
| 9 | Scrub e2e spec | implementer-sonnet-medium | medium | Full spec authored below; scroll-to-progress + reverse. |
| 10 | CLAUDE.md design-direction amendment | editor-sonnet-low | — | Exact replacement text authored below; transcription. |
| 11 | Final verification | verifier-sonnet-low + manual + reviewer-opus-high | — | Mechanical suite + Lighthouse ≥ 89 + manual Safari + fresh-context review handoff. |

UI/taste rule: sonnet-5 (taste 7) clears the ≥7 bar for the UI slices; opus reserved for the two integration/judgment slices (1, 5) and review (11).

---

## Task 0: Baseline verify + record

**Files:** none (read-only verification).

**Purpose:** Confirm the tree matches the recorded baseline before any change. Values already measured by the plan author on 2026-07-22 (recorded under Global Constraints). Re-run to confirm on the executor's machine.

- [x] **Step 1: Kill any stale preview on 4173**

Run: `lsof -ti:4173 | xargs kill 2>/dev/null; echo cleared`

- [x] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0, no output.

- [x] **Step 3: Unit tests**

Run: `npm run test:unit`
Expected: `Test Files  12 passed (12)`, `Tests  66 passed (66)`.

- [x] **Step 4: Build, then start a FRESH vite preview (never reuse a pre-build preview — stale sirv 404s hashed assets)**

Run:
```bash
npm run build
lsof -ti:4173 | xargs kill 2>/dev/null
nohup npx vite preview --port 4173 >/tmp/vite-preview.log 2>&1 &
sleep 6 && curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:4173/
```
Expected: build succeeds; probe prints `200`.

- [x] **Step 5: Lighthouse desktop performance baseline**

Run:
```bash
npx --yes lighthouse http://localhost:4173/ --only-categories=performance --preset=desktop \
  --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=/tmp/lh.json --quiet
node -e "const r=require('/tmp/lh.json');console.log('PERF',Math.round(r.categories.performance.score*100))"
```
Expected: `PERF` ≈ **89–92**. Record the run's value. The gate floor for Task 11 is **≥ 89**.

- [x] **Step 6: Kill the preview**

Run: `lsof -ti:4173 | xargs kill 2>/dev/null; echo killed`

- [x] **Step 7: Serial e2e baseline**

Run: `npx playwright test --workers=1`
Expected (recorded baseline): **43 passed, 1 failed, 2 skipped**. The single failure is `tests/e2e/perf-budget.spec.ts:30 › no long task > 200ms during scroll` (deterministic ~211–234 ms on desktop-chromium, pre-existing). If ANY OTHER test is red or the counts differ, STOP and reconcile before Task 1 — do not start feature work on an unknown baseline.

**Acceptance check (read-only):** the recorded numbers above reproduce. No code is written in this task.

**Boundaries:** Out of scope: fixing anything. This task only measures and confirms.

**Task 0 OUTCOME (2026-07-22, executor run — controller-adjudicated):** tsc clean; unit 66/66 (12 files); Lighthouse desktop perf **94** (above the 89–92 window; the ≥89 gate floor stands); serial e2e **44 passed / 0 failed / 2 skipped** — `perf-budget.spec.ts:30` PASSED this run. Reconciled with the plan author's 3× isolated failures (211–234 ms under plan-authoring load): the long task is **load-marginal, not deterministic** — the 200 ms budget sits inside the task's own noise band, so it flips red under machine load. Task 1 therefore skips the trace step (nothing reproduces idle) and applies branch (b) directly, with the comment documenting both observations. Evidence: qa-runs `20260722-1618*-task0-*` (5 logs), report `.superpowers/sdd/2026-07-22-selected-work-card-stack-task-0-report.md`.

---

## Task 1: Baseline repair — `perf-budget` long-task (pre-Task-1 batch fix)

**Files:**
- Investigate: `tests/e2e/perf-budget.spec.ts:30-52`, `src/components/canvas/FluidWaves.tsx`, section reveal wiring.
- Modify (one of, per the decision below): `tests/e2e/perf-budget.spec.ts` (budget threshold) OR the source causing the long task.

**Context:** `no long task > 200ms during scroll` fails deterministically today at **211–234 ms** (measured 3× isolated). This is the ONLY red in the suite and the sole mandated pre-feature fix. It matters doubly because the incoming `400svh` scrub section adds scroll-time work — the guard must be both green today AND survive the feature.

**Interfaces produced:** a green `perf-budget.spec.ts` with a documented, defensible long-task ceiling that Task 11 re-verifies unchanged.

- [x] **Step 1: Trace the offending long task** *(skipped — not reproducible idle; controller-adjudicated per Task 0 OUTCOME)*

Run: `npx playwright test tests/e2e/perf-budget.spec.ts:30 --workers=1 --project=desktop-chromium --trace on` then `npx playwright show-trace test-results/*long-task*/trace.zip` (or inspect the captured `longTasks` durations). Identify whether the >200 ms task is (a) newly-fixable synchronous work in a scroll path (e.g., a forced reflow, a synchronous shader/layout in a `whileInView` handler), or (b) inherent first-scroll compositor/hydration cost of the already-shipped page.

- [x] **Step 2: Decide and apply (judgment)**

- If (a): fix the source (e.g., defer/throttle the synchronous work, move layout reads out of the scroll frame). Prefer this — keep the 200 ms budget.
- If (b): raise the threshold to a measured ceiling with a documenting comment. Set it to **300 ms** (headroom above the 234 ms observed max AND above the feature's expected added cost), with a code comment recording: "measured pre-change baseline 211–234 ms on desktop-chromium (2026-07-22); 300 ms catches genuine regressions while tolerating first-scroll compositor cost." Do NOT set it so high it stops catching regressions.

Example (branch (b)):
```ts
  for (const d of longTasks) expect(d).toBeLessThan(300)
```

- [x] **Step 3: Confirm green 3×**

Run: `for i in 1 2 3; do npx playwright test tests/e2e/perf-budget.spec.ts --workers=1 --project=desktop-chromium 2>&1 | grep -E "passed|failed"; done`
Expected: all three runs `2 passed`.

- [x] **Step 4: Full suite still green**

Run: `npx playwright test --workers=1`
Expected: **44 passed / 2 skipped** (baseline restored).

- [x] **Step 5: Commit**

```bash
git add tests/e2e/perf-budget.spec.ts src/  # only the files actually touched
git commit -m "fix(perf): restore green long-task budget baseline before card-stack work"
```

**Acceptance check (read-only):** `npx playwright test --workers=1` ⇒ 44 passed / 2 skipped. Do not edit the assertion after Step 3 to force green.

**Boundaries:** Out of scope: any Projects/stack code, broad perf refactors beyond the identified long task. If the long task is an irreducible compositor/GC heisenbug, return `blocked: long-task source needs deep-reasoner/debugger` — the orchestrator escalates.

---

## Task 2: `stackMotion.ts` pure helpers (TDD — tests first)

**Spec TODO:** `src/utils/stackMotion.ts` pure helpers with explicit return types; unit tests cover segment boundaries, plateau clamps, morph formula caps (TDD — tests first).

**Files:**
- Create: `src/utils/stackMotion.ts`
- Test: `tests/unit/stackMotion.test.ts` (RED — authored below, read-only to the implementer)

**Interfaces produced (later tasks depend on these EXACT signatures):**
```ts
export function clamp(value: number, lo: number, hi: number): number
export function smoothstep(t: number): number
export function settleFrac(frac: number): number
export interface Segment { index: number; frac: number }
export function segmentFor(progress: number, n: number): Segment
export interface DepthStyle { y: number; scale: number; opacity: number; shadow: number }
export function depthTransform(depth: number, frac: number): DepthStyle
export interface MorphStyle { blur: number; opacity: number }
export function morphValues(frac: number): { incoming: MorphStyle; outgoing: MorphStyle }
```

- [x] **Step 1: Write the failing test file (verbatim)**

Create `tests/unit/stackMotion.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  clamp,
  smoothstep,
  segmentFor,
  settleFrac,
  depthTransform,
  morphValues,
} from '../../src/utils/stackMotion'

describe('clamp', () => {
  it('bounds below / within / above', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
    expect(clamp(2, 0, 1)).toBe(1)
  })
})

describe('smoothstep', () => {
  it('pins endpoints and midpoint', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
  })
  it('eases in-out (slower than linear near the ends)', () => {
    expect(smoothstep(0.25)).toBeLessThan(0.25)
    expect(smoothstep(0.75)).toBeGreaterThan(0.75)
  })
})

describe('segmentFor (n=4 → 3 equal segments)', () => {
  it('start of scroll → first segment, frac 0', () => {
    expect(segmentFor(0, 4)).toEqual({ index: 0, frac: 0 })
  })
  it('end of scroll → last segment (n-2), frac 1', () => {
    expect(segmentFor(1, 4)).toEqual({ index: 2, frac: 1 })
  })
  it('maps progress across (n-1) equal segments', () => {
    const s = segmentFor(0.5, 4) // raw = 1.5
    expect(s.index).toBe(1)
    expect(s.frac).toBeCloseTo(0.5, 6)
  })
  it('just past a boundary lands in the next segment near frac 0', () => {
    const s = segmentFor(0.34, 4) // raw = 1.02
    expect(s.index).toBe(1)
    expect(s.frac).toBeCloseTo(0.02, 6)
  })
  it('clamps out-of-range progress', () => {
    expect(segmentFor(-0.2, 4)).toEqual({ index: 0, frac: 0 })
    expect(segmentFor(1.5, 4)).toEqual({ index: 2, frac: 1 })
  })
  it('degenerate n<=1 never divides by zero', () => {
    expect(segmentFor(0.7, 1)).toEqual({ index: 0, frac: 0 })
  })
})

describe('settleFrac (plateau remap, window 0.15–0.85)', () => {
  it('clamps to a settled plateau before / after the window', () => {
    expect(settleFrac(0)).toBe(0)
    expect(settleFrac(0.15)).toBe(0)
    expect(settleFrac(0.1)).toBe(0)
    expect(settleFrac(0.85)).toBe(1)
    expect(settleFrac(0.9)).toBe(1)
    expect(settleFrac(1)).toBe(1)
  })
  it('window centre maps to 0.5', () => {
    expect(settleFrac(0.5)).toBeCloseTo(0.5, 6)
  })
  it('is monotonic across the transition window', () => {
    expect(settleFrac(0.3)).toBeLessThan(settleFrac(0.6))
  })
})

describe('depthTransform (slots 12/-16/-44, scales 1/.95/.9, exit y 340)', () => {
  it('front card (depth 0) sits at slot 0 when settled', () => {
    expect(depthTransform(0, 0)).toMatchObject({ y: 12, scale: 1, opacity: 1 })
  })
  it('front card exits to y 340 and fades to .85 across the window', () => {
    expect(depthTransform(0, 1)).toMatchObject({ y: 340, opacity: 0.85 })
  })
  it('front-card exit accelerates (ease-in lags the linear midpoint 176)', () => {
    expect(depthTransform(0, 0.5).y).toBeLessThan(176)
  })
  it('depth 1 promotes into the front slot', () => {
    expect(depthTransform(1, 0)).toMatchObject({ y: -16, scale: 0.95, opacity: 1 })
    expect(depthTransform(1, 1)).toMatchObject({ y: 12, scale: 1, opacity: 1 })
  })
  it('promotion decelerates (ease-out leads the linear midpoint -2)', () => {
    expect(depthTransform(1, 0.5).y).toBeGreaterThan(-2)
  })
  it('depth 2 promotes one slot forward', () => {
    expect(depthTransform(2, 0)).toMatchObject({ y: -44, scale: 0.9 })
    expect(depthTransform(2, 1)).toMatchObject({ y: -16, scale: 0.95 })
  })
  it('incoming depth-3 card fades in at the back slot without moving', () => {
    expect(depthTransform(3, 0)).toMatchObject({ y: -44, opacity: 0 })
    expect(depthTransform(3, 1)).toMatchObject({ y: -44, opacity: 1 })
  })
  it('shadow strength tracks slot linearly', () => {
    expect(depthTransform(0, 0).shadow).toBeCloseTo(1, 6)
    expect(depthTransform(2, 0).shadow).toBeCloseTo(0.3, 6)
  })
})

describe('morphValues (gooey blur/opacity, capped, no Infinity)', () => {
  it('at frac 0 the outgoing title is crisp, incoming blurred + transparent', () => {
    const m = morphValues(0)
    expect(m.outgoing).toEqual({ blur: 0, opacity: 1 })
    expect(m.incoming.opacity).toBe(0)
    expect(m.incoming.blur).toBe(100)
  })
  it('at frac 1 the incoming title is crisp, outgoing gone', () => {
    const m = morphValues(1)
    expect(m.incoming).toEqual({ blur: 0, opacity: 1 })
    expect(m.outgoing.opacity).toBe(0)
    expect(m.outgoing.blur).toBe(100)
  })
  it('at the midpoint both blur to 8px and are symmetric', () => {
    const m = morphValues(0.5)
    expect(m.incoming.blur).toBeCloseTo(8, 6)
    expect(m.outgoing.blur).toBeCloseTo(8, 6)
    expect(m.incoming.opacity).toBeCloseTo(Math.pow(0.5, 0.4), 6)
  })
  it('blur is always within [0, 100]', () => {
    for (const f of [0, 0.01, 0.2, 0.5, 0.8, 0.99, 1]) {
      const m = morphValues(f)
      for (const b of [m.incoming.blur, m.outgoing.blur]) {
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(100)
      }
    }
  })
})
```

- [x] **Step 2: Run the test — verify it FAILS**

Run: `npm run test:unit -- stackMotion`
Expected: FAIL (`Cannot find module '../../src/utils/stackMotion'`).

- [x] **Step 3: Implement `src/utils/stackMotion.ts` (reference implementation — transcribe)**

Create `src/utils/stackMotion.ts`:
```ts
/**
 * Pure, progress-driven motion helpers for the selected-work card stack.
 * Scroll position is the playhead; every helper is a deterministic function of
 * scroll progress (0..1) or a per-segment fraction. No time, no state, no side
 * effects — unit-tested in tests/unit/stackMotion.test.ts.
 */

export function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const easeIn = (t: number): number => t * t // accelerate: commits and leaves
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) // decelerate: lands settled

/** Classic Hermite smoothstep on [0,1]. Expects t already clamped to [0,1]. */
export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export interface Segment {
  index: number
  frac: number
}

/**
 * Maps overall scroll progress (0..1) onto n-1 equal transition segments.
 * index ∈ [0, n-2]; frac ∈ [0, 1] within that segment.
 */
export function segmentFor(progress: number, n: number): Segment {
  if (n <= 1) return { index: 0, frac: 0 }
  const transitions = n - 1
  const raw = clamp(progress, 0, 1) * transitions
  const index = clamp(Math.floor(raw), 0, transitions - 1)
  const frac = clamp(raw - index, 0, 1)
  return { index, frac }
}

/**
 * Settle-plateau remap: the transition occupies the middle 70% (0.15–0.85) of a
 * segment, smoothstepped, so the stack dwells settled at every project and at
 * both pin edges — entering/leaving the section never lands mid-morph.
 */
export function settleFrac(frac: number): number {
  return smoothstep(clamp((frac - 0.15) / 0.7, 0, 1))
}

export interface DepthStyle {
  y: number
  scale: number
  opacity: number
  shadow: number
}

// Depth grammar from the vault: slot y-offsets / scales / shadow strength.
const SLOTS: ReadonlyArray<{ y: number; scale: number; shadow: number }> = [
  { y: 12, scale: 1, shadow: 1 },
  { y: -16, scale: 0.95, shadow: 0.6 },
  { y: -44, scale: 0.9, shadow: 0.3 },
]
const EXIT_Y = 340

/**
 * Interpolated style for a card currently at logical `depth` (0 = front,
 * 1/2 behind, 3 = incoming) given the settled transition progress `frac`.
 * depth 0 exits downward (ease-in); deeper cards promote one slot (ease-out);
 * the incoming depth-3 card fades in at the back slot without moving.
 */
export function depthTransform(depth: number, frac: number): DepthStyle {
  const f = clamp(frac, 0, 1)
  if (depth <= 0) {
    return {
      y: lerp(SLOTS[0].y, EXIT_Y, easeIn(f)),
      scale: 1,
      opacity: lerp(1, 0.85, f),
      shadow: SLOTS[0].shadow,
    }
  }
  const from = SLOTS[Math.min(depth, 2)]
  const to = SLOTS[Math.min(depth - 1, 2)]
  const tp = easeOut(f)
  return {
    y: lerp(from.y, to.y, tp),
    scale: lerp(from.scale, to.scale, tp),
    opacity: depth >= 3 ? lerp(0, 1, f) : 1,
    shadow: lerp(from.shadow, to.shadow, f),
  }
}

export interface MorphStyle {
  blur: number
  opacity: number
}

// Gooey blur, capped at 100px, guarded against division by zero (→ full cap).
const morphBlur = (x: number): number => (x <= 0 ? 100 : Math.min(8 / x - 8, 100))

/**
 * Gooey title crossfade: incoming span sharpens (blur→0, opacity→1) as `frac`
 * rises; outgoing span mirrors on (1 - frac).
 */
export function morphValues(frac: number): {
  incoming: MorphStyle
  outgoing: MorphStyle
} {
  const f = clamp(frac, 0, 1)
  return {
    incoming: { blur: morphBlur(f), opacity: Math.pow(f, 0.4) },
    outgoing: { blur: morphBlur(1 - f), opacity: Math.pow(1 - f, 0.4) },
  }
}
```

- [x] **Step 4: Run the test — verify it PASSES**

Run: `npm run test:unit -- stackMotion`
Expected: PASS (all describe blocks green).

- [x] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [x] **Step 6: Commit**

```bash
git add src/utils/stackMotion.ts tests/unit/stackMotion.test.ts
git commit -m "feat(stack): progress-driven motion helpers for the card stack"
```

**Acceptance check (read-only):** `npm run test:unit -- stackMotion` green. Never edit `tests/unit/stackMotion.test.ts`.

**Verify before returning:** `npm run test:unit -- stackMotion` green; `npx tsc -b` clean.

**Boundaries:** Out of scope: any React/DOM/Framer import in this file (pure math only). If a formula in the test seems wrong, return `blocked: <formula> — test contract disputed`; do not "fix" the test.

---

## Task 3: `GooeyTitle.tsx` — progress-driven two-span morph

**Spec TODO:** `GooeyTitle` (`src/components/ui/GooeyTitle.tsx`): progress-driven two-span morph, per-instance filter id, threshold-off degrade flag, RM = plain text no filter.

**Files:**
- Create: `src/components/ui/GooeyTitle.tsx`

**Interfaces:**
- Consumes: `morphValues` from `src/utils/stackMotion.ts`; a Framer `MotionValue<number>` (settled per-segment progress) from Task 5.
- Produces:
```ts
export interface GooeyTitleProps {
  from: string                 // outgoing (segment-start) project title — morph span
  to: string                   // incoming (segment-end) project title — morph span
  staticTitle: string          // RESTING (front) project title — accessible name + the entire RM render.
                               // Driven by frontIndex, NOT baseIndex: from/to are segment-stable while
                               // staticTitle flips at the settle-midpoint with the cards/meta (review fix:
                               // baseIndex-driven RM title lagged a segment and was wrong on the last plateau)
  progress: MotionValue<number> // settled transition progress within the segment (0..1)
  reducedMotion: boolean
  thresholdFilter?: boolean    // WebKit degrade flag; false drops the feColorMatrix, keeps blur/opacity
  className?: string
}
export function GooeyTitle(props: GooeyTitleProps): React.ReactElement
```

- [x] **Step 1: Implement the component (transcribe)**

Create `src/components/ui/GooeyTitle.tsx`:
```tsx
import { useId } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { morphValues } from '../../utils/stackMotion'

export interface GooeyTitleProps {
  /** Outgoing (segment-start) project title — morph span. */
  from: string
  /** Incoming (segment-end) project title — morph span. */
  to: string
  /** Resting (front) project title: the accessible name and the entire RM render. Track frontIndex. */
  staticTitle: string
  /** Settled transition progress within the current segment (0..1). */
  progress: MotionValue<number>
  reducedMotion: boolean
  /** WebKit degrade flag: false drops the threshold feColorMatrix, keeps the blur/opacity crossfade. */
  thresholdFilter?: boolean
  className?: string
}

// Self-contained sr-only style so the heading has an accessible name without a
// CSS dependency (the visible morph spans are aria-hidden).
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
}

export function GooeyTitle({
  from,
  to,
  staticTitle,
  progress,
  reducedMotion,
  thresholdFilter = true,
  className,
}: GooeyTitleProps): React.ReactElement {
  // Hooks run unconditionally (rules-of-hooks); the RM branch returns after them.
  const rawId = useId()
  const filterId = `gooey-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const outBlur = useTransform(progress, (p) => `blur(${morphValues(p).outgoing.blur}px)`)
  const outOpacity = useTransform(progress, (p) => morphValues(p).outgoing.opacity)
  const inBlur = useTransform(progress, (p) => `blur(${morphValues(p).incoming.blur}px)`)
  const inOpacity = useTransform(progress, (p) => morphValues(p).incoming.opacity)

  const cls = `gooey-title ${className ?? ''}`.trim()

  // Reduced motion: plain static title (the RESTING project, not the segment
  // origin), no filter, no morph.
  if (reducedMotion) {
    return <h2 className={cls}>{staticTitle}</h2>
  }

  return (
    <h2 className={cls}>
      <span className="gooey-title-sr" style={srOnly}>{staticTitle}</span>
      {thresholdFilter && (
        <svg className="gooey-title-defs" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId}>
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
              />
            </filter>
          </defs>
        </svg>
      )}
      <span
        className="gooey-title-stage"
        aria-hidden="true"
        style={thresholdFilter ? { filter: `url(#${filterId})` } : undefined}
      >
        <motion.span className="gooey-title-span" style={{ filter: outBlur, opacity: outOpacity }}>
          {from}
        </motion.span>
        <motion.span className="gooey-title-span" style={{ filter: inBlur, opacity: inOpacity }}>
          {to}
        </motion.span>
      </span>
    </h2>
  )
}
```

- [x] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/GooeyTitle.tsx
git commit -m "feat(stack): progress-driven gooey title with WebKit degrade flag"
```

**Acceptance check (read-only):** covered by the scrub + reduced-motion e2e specs (Tasks 8, 9) and `tsc -b`. UI component — no unit test (per CLAUDE.md UI exemption); acceptance criteria: renders `from`/`to` spans (non-RM) with a `.gooey-title-sr` accessible name showing `staticTitle`, single plain `<h2>` rendering `staticTitle` (RM), per-instance `filterId`, filter absent when `thresholdFilter={false}`.

**Verify before returning:** `npx tsc -b` clean.

**Boundaries:** Out of scope: styling (Task 6 owns `.gooey-title*` CSS), any scroll/segment logic (Task 5 supplies `progress`, `from`, `to`). If the two-span overlap needs a layout decision, that is CSS in Task 6 — do not add layout here beyond the class names.

---

## Task 4: `ProjectCardStack.tsx` — progress-driven depth grammar

**Spec TODO:** `ProjectCardStack` (`src/components/ui/ProjectCardStack.tsx`): progress-driven depth grammar per the motion table; front-card link; buried cards inert; RM = instant swaps.

**Files:**
- Create: `src/components/ui/ProjectCardStack.tsx`

**Interfaces:**
- Consumes: `depthTransform` from `src/utils/stackMotion.ts`; a `MotionValue<number>` (settled progress) from Task 5; `react-router-dom` `Link`.
- Produces:
```ts
export interface StackCardData {
  slug: string
  title: string
  art?: string   // project.mockups.desktopBento
  alt: string
}
export interface ProjectCardStackProps {
  cards: StackCardData[]         // all featured projects, front-most first
  baseIndex: number              // active segment (0..n-2); non-RM depth mapping origin
  frontIndex: number             // resting project (0..n-1); RM origin + which card is interactive
  interactiveDepth: number       // non-RM: which rendered depth is the front/interactive card (0 or 1)
  progress: MotionValue<number>  // settled transition progress within the segment (0..1)
  reducedMotion: boolean
  viewProjectLabel: string       // localized "view project"
}
export function ProjectCardStack(props: ProjectCardStackProps): React.ReactElement
```

Mapping contract (correctness rests on this):
- **Non-RM:** render depths `0,1,2,3`; the card at `depth d` shows `cards[baseIndex + d]` (skip if out of range); geometry from `depthTransform(d, progress)`. The interactive/linked card is the one at `depth === interactiveDepth`; all others are buried (`aria-hidden`, `tabIndex={-1}`, `pointer-events:none`). This keeps the front card correct at every settle plateau including the terminal one (where `interactiveDepth` is 1).
- **RM:** render depths `0,1,2` statically; the card at `depth d` shows `cards[frontIndex + d]` (skip if out of range); geometry frozen at `depthTransform(d, 0)`; interactive card = depth 0. Content swaps instantly when `frontIndex` changes.

- [x] **Step 1: Implement the component (transcribe)**

Create `src/components/ui/ProjectCardStack.tsx`:
```tsx
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { depthTransform } from '../../utils/stackMotion'

export interface StackCardData {
  slug: string
  title: string
  art?: string
  alt: string
}

export interface ProjectCardStackProps {
  cards: StackCardData[]
  baseIndex: number
  frontIndex: number
  interactiveDepth: number
  progress: MotionValue<number>
  reducedMotion: boolean
  viewProjectLabel: string
}

function CardArt({ card, eager }: { card: StackCardData; eager: boolean }): React.ReactElement {
  return card.art ? (
    <img
      src={card.art}
      alt={card.alt}
      width={1024}
      height={608}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  ) : (
    <span className="stack-card-fallback" aria-hidden="true" />
  )
}

interface SlotProps {
  depth: number
  card: StackCardData
  interactive: boolean
  eager: boolean
  progress: MotionValue<number>
  reducedMotion: boolean
  viewProjectLabel: string
}

function CardSlot({
  depth,
  card,
  interactive,
  eager,
  progress,
  reducedMotion,
  viewProjectLabel,
}: SlotProps): React.ReactElement {
  // Hooks run unconditionally; RM ignores the MotionValues via inline transform.
  const y = useTransform(progress, (p) => depthTransform(depth, p).y)
  // Spec motion table: fine-pointer hover on the interactive card scales ≤1.02,
  // <100ms response, via MotionValues (no setState). Composed multiplicatively so
  // the scrub scale and the hover scale never fight over one transform channel.
  const hoverTarget = useMotionValue(1)
  const hoverScale = useSpring(hoverTarget, { stiffness: 550, damping: 38 })
  const scale = useTransform(
    [progress, hoverScale] as [MotionValue<number>, MotionValue<number>],
    ([p, h]: number[]) => depthTransform(depth, p).scale * h,
  )
  const opacity = useTransform(progress, (p) => depthTransform(depth, p).opacity)
  const boxShadow = useTransform(progress, (p) => {
    const s = depthTransform(depth, p).shadow
    return `0 ${(18 * s).toFixed(1)}px ${(40 * s).toFixed(1)}px rgba(0,0,0,${(0.45 * s).toFixed(3)})`
  })

  const rest = depthTransform(depth, 0)
  const zIndex = 10 - depth
  const style: React.CSSProperties = reducedMotion
    ? {
        transform: `translateY(${rest.y}px) scale(${rest.scale})`,
        opacity: rest.opacity,
        zIndex,
      }
    : ({ y, scale, opacity, boxShadow, zIndex } as unknown as React.CSSProperties)

  const inner = (
    <>
      <CardArt card={card} eager={eager} />
      {interactive && (
        <span className="stack-card-bar">
          <span className="stack-card-cta">{viewProjectLabel}</span>
          <span className="stack-card-arrow" aria-hidden="true">↗</span>
        </span>
      )}
    </>
  )

  const className = `stack-card${interactive ? '' : ' stack-card--buried'}`
  const hoverable = interactive && !reducedMotion
  return (
    <motion.div
      className={className}
      style={style}
      onHoverStart={hoverable ? () => hoverTarget.set(1.02) : undefined}
      onHoverEnd={hoverable ? () => hoverTarget.set(1) : undefined}
    >
      {interactive ? (
        <Link className="stack-card-link" to={`/projects/${card.slug}`} aria-label={card.title}>
          {inner}
        </Link>
      ) : (
        <div className="stack-card-inert" aria-hidden="true" tabIndex={-1}>
          {inner}
        </div>
      )}
    </motion.div>
  )
}

export function ProjectCardStack({
  cards,
  baseIndex,
  frontIndex,
  interactiveDepth,
  progress,
  reducedMotion,
  viewProjectLabel,
}: ProjectCardStackProps): React.ReactElement {
  const depths = reducedMotion ? [0, 1, 2] : [0, 1, 2, 3]
  const origin = reducedMotion ? frontIndex : baseIndex

  return (
    <div className="stack-cards">
      {depths.map((depth) => {
        const card = cards[origin + depth]
        if (!card) return null
        const interactive = reducedMotion ? depth === 0 : depth === interactiveDepth
        return (
          <CardSlot
            key={depth}
            depth={depth}
            card={card}
            interactive={interactive}
            eager={depth === 0}
            progress={progress}
            reducedMotion={reducedMotion}
            viewProjectLabel={viewProjectLabel}
          />
        )
      })}
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/ProjectCardStack.tsx
git commit -m "feat(stack): progress-driven project card stack with inert buried cards"
```

**Acceptance check (read-only):** covered by scrub + reduced-motion e2e (Tasks 8, 9) and `tsc -b`. UI component — no unit test; criteria: front card is a `<Link>` to `/projects/:slug`; buried cards carry `aria-hidden` + `tabIndex={-1}` + (via CSS) `pointer-events:none`; RM renders 3 static slots, non-RM renders up to 4; the interactive card hover-scales to 1.02 through the composed MotionValue (no scale change under RM).

**Verify before returning:** `npx tsc -b` clean.

**Boundaries:** Out of scope: the segment state machine (Task 5 supplies `baseIndex`/`frontIndex`/`interactiveDepth`/`progress`), all CSS (Task 6). The `style` cast for MotionValues follows Framer's typing; do not introduce `any` elsewhere. If the interactive-depth contract is unclear, return `blocked: interactiveDepth mapping`.

---

## Task 5: `Projects.tsx` rebuild — pinned stage, state machine, skip-links

**Spec TODO:** `Projects.tsx` rebuilt: 400svh wrapper + sticky stage + SectionHeading + meta line + skip-link project index; WorkRow import gone from this section. (Also updates the stale `#projects` specs in `rows-hover.spec.ts`.)

**Files:**
- Modify (full rewrite of the component body): `src/components/sections/Projects.tsx`
- Modify: `tests/e2e/rows-hover.spec.ts` (remove the two `#projects .workrow` tests that the rebuild invalidates; keep the work-experience expand test)

**Interfaces:**
- Consumes: `GooeyTitle` (Task 3), `ProjectCardStack` + `StackCardData` (Task 4), `segmentFor`/`settleFrac` (Task 2), `accentFor` (`src/utils/palette.ts`), `SectionHeading`, `projects` data, `useMotion().prefersReducedMotion`, `useTranslation`, Framer `useScroll`/`useTransform`/`useMotionValueEvent`.
- Keeps the export `export function Projects()` (lazy-loaded in `Home.tsx` as `.then(m => ({ default: m.Projects }))` — do not change the export shape).

Design intent (integrator judgment; skeleton provided — hold the two invariants):
1. **Zero per-frame React state.** `settled` is a `useTransform` MotionValue. `baseIndex` and `frontIndex` are discrete states flipped only inside a single `useMotionValueEvent` handler, guarded so identical values never call `setState`.
2. **Segment identity is stable per segment** (gooey `from`/`to` fixed across a full segment): `baseIndex` = `segmentFor(p,n).index`, flips at boundaries. `frontIndex` = resting project, flips at the settle-midpoint (non-RM) or at the segment midpoint (RM). `interactiveDepth = clamp(frontIndex - baseIndex, 0, 1)`.

Why the setState is safe (document in a comment): the `SectionHeading` entrance (`whileInView`, `once`) sits ABOVE the pinned stage and completes before the user scrolls into the scrub; the stack cards animate off MotionValues, never `whileInView` — so a segment-index setState cannot freeze an in-flight entrance stagger (re-render-kills-entrance lesson).

- [x] **Step 1: Rewrite `src/components/sections/Projects.tsx` (transcribe skeleton; keep both invariants)**

```tsx
import { useRef, useState } from 'react'
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { GooeyTitle } from '../ui/GooeyTitle'
import { ProjectCardStack, type StackCardData } from '../ui/ProjectCardStack'
import { projects } from '../../data/projects'
import { segmentFor, settleFrac } from '../../utils/stackMotion'
import { accentFor } from '../../utils/palette'

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
  const n = featured.length

  const cards: StackCardData[] = featured.map((p) => ({
    slug: p.slug,
    title: p.title[lang],
    art: p.mockups?.desktopBento,
    alt: `${p.title[lang]} preview`,
  }))

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  })

  // Per-frame settled progress within the active segment — a MotionValue, never state.
  const settled = useTransform(scrollYProgress, (p) => settleFrac(segmentFor(p, n).frac))

  // Discrete states — flip a handful of times total, never per frame.
  const [baseIndex, setBaseIndex] = useState(0)
  const [frontIndex, setFrontIndex] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const { index, frac } = segmentFor(p, n)
    const nextBase = index
    const nextFront = prefersReducedMotion
      ? Math.min(Math.round(p * (n - 1)), n - 1) // RM: swap at segment midpoint
      : Math.min(index + (settleFrac(frac) >= 0.5 ? 1 : 0), n - 1) // scrub: at settle-midpoint
    setBaseIndex((c) => (c === nextBase ? c : nextBase))
    setFrontIndex((c) => (c === nextFront ? c : nextFront))
  })

  const interactiveDepth = Math.min(Math.max(frontIndex - baseIndex, 0), 1)
  const front = featured[frontIndex]
  const fromTitle = cards[baseIndex]?.title ?? ''
  const toTitle = cards[Math.min(baseIndex + 1, n - 1)]?.title ?? ''
  // Resting title tracks frontIndex (NOT baseIndex): it is the accessible name and
  // the whole RM render, and must swap with the cards/meta at the settle-midpoint.
  const staticTitle = cards[frontIndex]?.title ?? ''

  const metaTech = front.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')
  const paddedFront = String(frontIndex + 1).padStart(2, '0')
  const paddedTotal = String(n).padStart(2, '0')

  const stageStyle = { '--row-tint': accentFor(frontIndex) } as React.CSSProperties &
    Record<'--row-tint', string>

  return (
    <section id="projects" className="section projects-stack-section">
      <SectionHeading
        index={t('sections.projects.index')}
        label={t('sections.projects.label')}
        title={t('sections.projects.title')}
        description={t('sections.projects.description')}
      />

      {/* Keyboard/SR path: visually-hidden-until-focused project index, no scroll-jacking. */}
      <nav className="stack-skiplinks" aria-label={t('sections.projects.stack.indexLabel')}>
        {featured.map((p) => (
          <a key={p.id} className="stack-skiplink" href={`/projects/${p.slug}`}>
            {p.title[lang]}
          </a>
        ))}
      </nav>

      <div className="stack-scroll" ref={wrapperRef}>
        <div className="stack-sticky">
          <div className="stack-inner" style={stageStyle}>
            <GooeyTitle
              from={fromTitle}
              to={toTitle}
              staticTitle={staticTitle}
              progress={settled}
              reducedMotion={prefersReducedMotion}
            />
            <p className="stack-meta">
              <span className="num">{paddedFront}</span> / {paddedTotal} · {front.year} · {metaTech}
            </p>
            <ProjectCardStack
              cards={cards}
              baseIndex={baseIndex}
              frontIndex={frontIndex}
              interactiveDepth={interactiveDepth}
              progress={settled}
              reducedMotion={prefersReducedMotion}
              viewProjectLabel={t('sections.projects.stack.viewProject')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [x] **Step 2: Remove the two stale `#projects` WorkRow tests in `tests/e2e/rows-hover.spec.ts`**

Delete the first two `test(...)` blocks (`'featured rows render as WorkRows and tint on hover'` and `'rows finish their entrance even when hovered mid-stagger'`) — they assert `#projects .workrow` / `.workrow-wrap`, which the rebuild removes. KEEP `'work experience rows expand with aria-expanded'` unchanged. Coverage of the new Projects section moves to Tasks 8 and 9.

- [x] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [x] **Step 4: Build + fresh preview + smoke the section renders with no console errors** *(pin/boundary-pop deferred to Task 6 smoke — CSS not yet landed; structural smoke: 3 .stack-card, 1 .gooey-title, 4 skiplinks, 0 console errors)*

Run:
```bash
npm run build && lsof -ti:4173 | xargs kill 2>/dev/null
nohup npx vite preview --port 4173 >/tmp/vite-preview.log 2>&1 & sleep 6
```
Then a Playwright smoke (create ad-hoc or via the Task 9 spec once it exists): load `/`, wait for `document.body.dataset.loaderState === 'done'`, scroll to `#projects`, assert `#projects .stack-card` count ≥ 1 and `#projects .gooey-title` present, zero console errors. Kill the preview after.

**Boundary-pop check (review finding — frame-desync hazard):** `settled` jumps 1→0 via Framer's rAF at the exact scroll delta where `baseIndex` flips via a React commit; a one-frame ordering gap can flash the just-exited card back at slot 0 at each of the three segment boundaries. In the same smoke (or by hand in the preview), scrub slowly back and forth across a segment boundary and watch for a single-frame pop of the front card. If observed: re-key the cards by PROJECT index instead of depth (card identity = project; depth derived per frame from a MotionValue), so React reconciliation never re-assigns content across the boundary — do not ship the pop.

- [x] **Step 5: Existing section specs still green (SectionHeading kept)** *(14 passed: section-enters + reduced-motion + rows-hover work-experience expand)*

Run: `npx playwright test tests/e2e/section-enters.spec.ts tests/e2e/reduced-motion.spec.ts tests/e2e/rows-hover.spec.ts --workers=1`
Expected: all green (`#projects .section-title` still transitions to opacity > 0.99; work-experience expand test intact).

- [x] **Step 6: Commit** *(7dd0c29)*

```bash
git add src/components/sections/Projects.tsx tests/e2e/rows-hover.spec.ts
git commit -m "feat(projects): rebuild selected work as pinned scroll-scrubbed card stack"
```

**Acceptance check (read-only):** the scrub + reduced-motion e2e specs (Tasks 8, 9) plus the surviving `section-enters`/`reduced-motion`/`rows-hover` specs. Do not weaken those to pass.

**Verify before returning:** `npx tsc -b` clean; the section renders in a real browser with zero console errors; `section-enters`/`reduced-motion`/`rows-hover` green.

**Boundaries:** Out of scope: CSS (Task 6), i18n keys (Task 7 adds `sections.projects.stack.*`; until then the keys render as their fallback string — that is expected, Task 7 lands the copy). Do NOT reorder the page or touch Archive/WorkExperience/Stats/Skills/Contact. Lenis compatibility is CONFIRMED by review: `SmoothScroll.tsx:36-39` runs Lenis in default mode (no `wrapper`/`content` — it animates real document scroll), and `MockupFrame.tsx:22` already ships `useScroll({ target, offset })` green under it, so `position: sticky` pins normally — the Step 4 smoke is confirmation, not discovery. If the pin nevertheless fails, return `blocked: sticky pin vs Lenis` with what you observed.

---

## Task 6: `index.css` — stack stage styles

**Spec TODO:** Styles on canonical tokens; `--row-tint` via `accentFor(index)`; view-project bar meets the ≥ 0.88-alpha scrim rule.

**Files:**
- Modify: `src/index.css` (append a new `SELECTED WORK — CARD STACK` block; do not touch the retired `.projects-list` block beyond leaving it — it is now unused but harmless, or remove it if the reviewer prefers).

**Invoke `frontend-design:frontend-design` before editing** (mandatory for visual work).

- [x] **Step 1: Append the stack styles (transcribe)**

Add to `src/index.css`:
```css
/* =========================================================================
   SELECTED WORK — CARD STACK (pinned scroll-scrubbed stage)
   Replaces the retired .projects-list WorkRow list. Canonical tokens only.
   ========================================================================= */
.projects-stack-section { overflow: visible; } /* never clip the sticky descendant */

.stack-scroll {
  position: relative;
  height: 400svh; /* COUPLED to Projects.tsx: featured count n=4 → n×100svh (3 transitions,
                     one viewport each + settle edges). If the top-4 curation ever changes
                     size, update this and the JS `n` TOGETHER. */
  margin-top: 96px;
}
.stack-sticky {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden; /* clip the exiting card as it flies to y 340 */
  display: grid;
  place-items: center;
}
.stack-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  width: 100%;
}

/* Gooey title */
.gooey-title {
  position: relative;
  margin: 0;
  text-align: center;
  text-transform: lowercase;
}
.gooey-title-defs { position: absolute; width: 0; height: 0; }
.gooey-title-stage { position: relative; display: inline-grid; }
.gooey-title-span {
  grid-area: 1 / 1; /* stack both spans in the same cell so they morph in place */
  display: block;
  font-size: clamp(30px, 5vw, 64px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text);
  will-change: filter, opacity;
}

/* Meta line */
.stack-meta {
  margin: 0;
  color: var(--text-faded);
  font-size: clamp(12px, 1.4vw, 13px);
  letter-spacing: 0.02em;
  text-transform: lowercase;
  font-variant-numeric: tabular-nums;
}
.stack-meta .num { color: var(--row-tint); }

/* Card stack */
.stack-cards {
  position: relative;
  width: min(46vw, 620px);
  aspect-ratio: 16 / 9.5;
}
.stack-card {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  border: 1px solid var(--hairline);
  overflow: hidden;
  background: var(--bg-tonal);
  /* No will-change here: Framer manages the compositor hint on its own animated
     transforms, and the spec sanctions will-change ONLY on the two title spans
     (CLAUDE.md: "will-change only when animating"). */
}
.stack-card--buried { pointer-events: none; }
.stack-card img,
.stack-card-fallback { width: 100%; height: 100%; object-fit: cover; display: block; }
.stack-card-fallback { background: linear-gradient(145deg, var(--bg-tonal), var(--bg)); }
.stack-card-link,
.stack-card-inert { display: block; position: absolute; inset: 0; }
.stack-card-link:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }

/* view project bar — hero-scrim rule: ink gradient ≥ 0.88 alpha behind text */
.stack-card-bar {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  color: var(--text);
  font-size: 14px;
  text-transform: lowercase;
  /* Hero-scrim rule: alpha must be ≥ 0.88 across the WHOLE text-bearing region.
     The flex-centered CTA text sits in the band up to ~72% of the bar height
     (18px padding + line box); the fade to transparent begins only ABOVE it. */
  background: linear-gradient(
    to top,
    rgba(11, 14, 20, 0.92) 0%,
    rgba(11, 14, 20, 0.88) 72%,
    rgba(11, 14, 20, 0) 100%
  );
}
.stack-card-arrow {
  color: var(--row-tint);
  transition: transform var(--dur-hover-in, 0.2s) var(--ease-house);
}
.stack-card-link:hover .stack-card-arrow,
.stack-card-link:focus-visible .stack-card-arrow { transform: translate(3px, -3px); }

/* Skip-link project index — visually hidden until focused */
.stack-skiplinks { position: absolute; }
.stack-skiplink { position: absolute; left: -9999px; }
.stack-skiplink:focus-visible {
  position: fixed;
  left: 50%; top: 16px;
  transform: translateX(-50%);
  z-index: 50;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--hairline);
  background: var(--bg);
  color: var(--text);
  text-transform: lowercase;
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .stack-cards { width: 88vw; }
}
@media (prefers-reduced-motion: reduce) {
  .gooey-title-span { will-change: auto; }
  .stack-card-arrow { transition: none; }
}
```

- [x] **Step 2: Build + fresh preview + visual smoke** *(includes Task-5-deferred pin + boundary-pop checks)*

Run: `npm run build && lsof -ti:4173 | xargs kill 2>/dev/null; nohup npx vite preview --port 4173 >/tmp/vite-preview.log 2>&1 & sleep 6`
Confirm at `http://localhost:4173/#projects`: the stage pins for ~4 viewport-heights, the front card shows the `view project` bar with legible cream text, cards stack with depth, the title reads centered. Kill the preview after.

- [x] **Step 3: Typecheck + lint (CSS is not typed, but keep the tree clean)**

Run: `npx tsc -b`
Expected: exit 0.

- [x] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(stack): pinned card-stack stage on canonical tokens, scrim-compliant view bar"
```

**Acceptance check (read-only):** scrub + reduced-motion e2e (Tasks 8, 9); visual confirmation of the pin + scrim. Do not lower the `0.88`/`0.92` gradient stops (hero-scrim contrast rule).

**Boundaries:** Out of scope: component markup (Tasks 3–5), tokens (`@theme` in `:root` — reuse, never add). Confirm `--dur-hover-in`, `--ease-house`, `--hairline` exist in `:root`; if a var is missing, use the literal from Global Constraints rather than inventing a token. If the sticky does not pin (Lenis), that is a Task 5 blocker, not a CSS fix.

---

## Task 7: i18n — new strings EN + PT

**Spec TODO:** i18n: all new strings (meta labels, `view project`, skip-link labels) in EN + PT.

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

- [x] **Step 1: Add the `stack` sub-object under `sections.projects` in `en.json`**

In `src/i18n/locales/en.json`, `sections.projects` currently ends after `"description"`. Add a trailing key so it reads:
```json
    "projects": {
      "index": "01 · featured",
      "label": "",
      "title": "selected <em>work.</em>",
      "description": "personal highlights. from brief to ship.",
      "stack": {
        "viewProject": "view project",
        "indexLabel": "selected projects"
      }
    },
```

- [x] **Step 2: Add the matching `stack` sub-object in `pt.json`**

In `src/i18n/locales/pt.json`, `sections.projects`:
```json
    "projects": {
      "index": "01 · destaques",
      "label": "",
      "title": "obras <em>em foco.</em>",
      "description": "highlights pessoais. do briefing à entrega.",
      "stack": {
        "viewProject": "ver projeto",
        "indexLabel": "projetos selecionados"
      }
    },
```

- [x] **Step 3: Validate JSON + i18n unit tests**

Run: `node -e "require('./src/i18n/locales/en.json');require('./src/i18n/locales/pt.json');console.log('json ok')" && npm run test:unit -- i18n`
Expected: `json ok`; i18n unit tests green.

- [x] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "i18n(projects): stack view-project + skip-link labels (en/pt)"
```

**Acceptance check (read-only):** JSON parses; `sections.projects.stack.viewProject` and `.indexLabel` resolve in both locales (exercised by Tasks 8/9). Meta line labels (`NN / NN · year · tech`) are composed from data, not translated strings, so no key needed.

**Boundaries:** Out of scope: any other locale key. Keep lowercase house style, no spaced em-dashes.

---

## Task 8: Reduced-motion e2e — pin present, instant swaps, no filter, no flight

**Spec TODO:** Reduced-motion e2e: pin present, instant swaps, no filter, no card flight.

**Files:**
- Create: `tests/e2e/stack-reduced-motion.spec.ts`

- [x] **Step 1: Write the spec (transcribe)**

Create `tests/e2e/stack-reduced-motion.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// Scroll the window to an absolute fraction of the stack wrapper's scrollable
// range. ABSOLUTE document Y via getBoundingClientRect().top + window.scrollY —
// `offsetTop` would be relative to the positioned `#projects` (.section is
// position:relative), which lands the scroll in the Hero (review blocker #1).
async function scrollToStackFraction(page: import('@playwright/test').Page, frac: number): Promise<void> {
  await page.evaluate((f) => {
    const wrap = document.querySelector('#projects .stack-scroll') as HTMLElement | null
    if (!wrap) return
    const start = wrap.getBoundingClientRect().top + window.scrollY
    const range = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: start + range * f, behavior: 'instant' as ScrollBehavior })
  }, frac)
  await page.waitForTimeout(160)
}

test('reduced motion: stage pins, no SVG filter, content swaps without flight', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Enter the pin range FIRST — at scrollIntoViewIfNeeded(#projects) the sticky
  // child is still below the fold and top would read a few hundred px (review
  // blocker #2). Inside the range, sticky top must be ~0.
  await scrollToStackFraction(page, 0.02)

  // No gooey SVG filter is emitted at all under reduced motion.
  const filterCount = await page.locator('#projects .gooey-title-defs').count()
  expect(filterCount).toBe(0)

  // The sticky stage is pinned to the viewport top inside the pin range.
  const stickyTopWhilePinned = await page.evaluate(() => {
    const el = document.querySelector('#projects .stack-sticky') as HTMLElement | null
    if (!el) return { ok: false, top: NaN }
    return { ok: true, top: el.getBoundingClientRect().top }
  })
  expect(stickyTopWhilePinned.ok).toBe(true)
  expect(Math.abs(stickyTopWhilePinned.top)).toBeLessThan(4)

  // Front-card state at the first plateau.
  const firstHref = await page.locator('#projects .stack-card-link').getAttribute('href')
  const boxBefore = await page.locator('#projects .stack-card-link').boundingBox()

  // "No card flight": within the same segment (0.02 → 0.10, front swap happens
  // at ~0.167 under RM), the front card's geometry must not move at all — the
  // sticky stage is viewport-fixed and RM freezes every card transform.
  await scrollToStackFraction(page, 0.10)
  const boxWithin = await page.locator('#projects .stack-card-link').boundingBox()
  expect(boxWithin).not.toBeNull()
  expect(Math.abs(boxWithin!.x - boxBefore!.x)).toBeLessThan(1.5)
  expect(Math.abs(boxWithin!.y - boxBefore!.y)).toBeLessThan(1.5)
  expect(Math.abs(boxWithin!.width - boxBefore!.width)).toBeLessThan(1.5)

  // Cross the RM swap point: the front project changes (instant swap), and the
  // new front card sits at the SAME static geometry (swap, not flight).
  await scrollToStackFraction(page, 0.34)
  const secondHref = await page.locator('#projects .stack-card-link').getAttribute('href')
  expect(secondHref).not.toBe(firstHref)
  const boxAfterSwap = await page.locator('#projects .stack-card-link').boundingBox()
  expect(Math.abs(boxAfterSwap!.y - boxBefore!.y)).toBeLessThan(1.5)
})
```

- [x] **Step 2: Run it (serial)**

Run: `npx playwright test tests/e2e/stack-reduced-motion.spec.ts --workers=1`
Expected: green on both projects. If the front card does not swap, the RM `frontIndex` midpoint logic in Task 5 is wrong — fix Task 5, not the assertion.

- [x] **Step 3: Commit**

```bash
git add tests/e2e/stack-reduced-motion.spec.ts
git commit -m "test(stack): reduced-motion e2e — pin, no filter, instant swap"
```

**Acceptance check (read-only):** this spec is the acceptance gate for the RM behavior in Tasks 3–5. Authored here; never weaken it to pass.

**Boundaries:** `page.evaluate` bodies use explicit `return`; no Framer object crosses the boundary. Import from `@playwright/test`. Out of scope: non-RM scrub (Task 9).

---

## Task 9: Scrub e2e — midpoint change, reverse restores, link navigates

**Spec TODO:** Scrub e2e: scroll to segment midpoints ⇒ title/meta/front-card change; reversing scroll restores the previous project; front-card link navigates to the project page.

**Files:**
- Create: `tests/e2e/stack-scrub.spec.ts`

- [x] **Step 1: Write the spec (transcribe)**

Create `tests/e2e/stack-scrub.spec.ts`:
```ts
import { test, expect } from '@playwright/test'

// Helper: scroll the window to an absolute fraction of the stack wrapper's
// scrollable range and settle a frame. Explicit-return evaluate body (no
// Framer/GSAP object escapes the boundary → no serialization hang).
// ABSOLUTE document Y via getBoundingClientRect().top + window.scrollY —
// `offsetTop` would be relative to the positioned `#projects` (.section is
// position:relative) and would land the scroll in the Hero (review blocker #1).
async function scrollToStackFraction(page: import('@playwright/test').Page, frac: number): Promise<void> {
  await page.evaluate((f) => {
    const wrap = document.querySelector('#projects .stack-scroll') as HTMLElement | null
    if (!wrap) return
    const start = wrap.getBoundingClientRect().top + window.scrollY
    const range = wrap.offsetHeight - window.innerHeight
    window.scrollTo({ top: start + range * f, behavior: 'instant' as ScrollBehavior })
  }, frac)
  await page.waitForTimeout(160)
}

test.describe('selected-work scrub', () => {
  test('midpoints change the front project; reversing restores it', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('#projects').scrollIntoViewIfNeeded()

    // Settle-plateau start of segment 0 (front = project 1). The settled title
    // is read from the accessible-name span (.gooey-title-sr tracks frontIndex);
    // it is the review-mandated title assertion — href/meta alone would stay
    // green with a frozen or mis-wired gooey title.
    await scrollToStackFraction(page, 0.02)
    const hrefP0 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const metaP0 = await page.locator('#projects .stack-meta').innerText()
    const titleP0 = await page.locator('#projects .gooey-title-sr').textContent()

    // Settle-plateau of the next project (past the first segment's morph window).
    await scrollToStackFraction(page, 0.34)
    const hrefP1 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const metaP1 = await page.locator('#projects .stack-meta').innerText()
    const titleP1 = await page.locator('#projects .gooey-title-sr').textContent()
    expect(hrefP1).not.toBe(hrefP0)
    expect(metaP1).not.toBe(metaP0)
    expect(titleP1).not.toBe(titleP0)

    // Reverse back to the first plateau — the previous project is restored.
    await scrollToStackFraction(page, 0.02)
    const hrefBack = await page.locator('#projects .stack-card-link').getAttribute('href')
    const titleBack = await page.locator('#projects .gooey-title-sr').textContent()
    expect(hrefBack).toBe(hrefP0)
    expect(titleBack).toBe(titleP0)
  })

  test('front-card link navigates to the project page', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.locator('#projects').scrollIntoViewIfNeeded()
    await scrollToStackFraction(page, 0.02)

    const href = await page.locator('#projects .stack-card-link').getAttribute('href')
    expect(href).toMatch(/^\/projects\//)
    await page.locator('#projects .stack-card-link').click()
    await expect(page).toHaveURL(new RegExp(href!.replace(/[/]/g, '\\/')))
  })
})
```

- [x] **Step 2: Run it (serial)** *(4 passed: desktop-chromium + mobile-chromium, no fraction adjustments needed)*

Run: `npx playwright test tests/e2e/stack-scrub.spec.ts --workers=1`
Expected: green on both projects. Mobile (Pixel 5) uses the same scrub scaled — if it flakes on `svh` under the mobile URL-bar model, adjust the fraction tolerances, not the pin (spec risk 3).

- [x] **Step 3: Commit**

```bash
git add tests/e2e/stack-scrub.spec.ts
git commit -m "test(stack): scrub e2e — midpoint change, reverse restore, link navigate"
```

**Acceptance check (read-only):** this spec gates the scrub behavior across Tasks 3–5. Authored here; never weaken to pass.

**Boundaries:** `page.evaluate` bodies use explicit `return`/void; import from `@playwright/test`; any `page.screenshot()` added for debugging must pass an explicit `timeout:` (the hero shader animates). Out of scope: RM (Task 8).

---

## Task 10: CLAUDE.md — design-direction amendment

**Spec TODO:** CLAUDE.md design-direction amendment committed with the feature.

**Files:**
- Modify: `/Users/luizarazzera/keki/dev/personal_projects/portfolio/CLAUDE.md`

Amendment intent (from the spec's "CLAUDE.md amendment" section): record that Projects/"selected work" is now the pinned scroll-scrubbed `ProjectCardStack` + `GooeyTitle`; WorkRow stays the primitive for Archive/WorkExperience; add the card-frames exception; add Framer scroll-scrub as a sanctioned lane; leave the NO-list otherwise intact.

- [x] **Step 1: Amend the WorkRow design-direction bullet**

In the `## Design Direction` list, in the **WorkRow** bullet, change its opening scope note. Find:
> **WorkRow (the one section-list primitive — `src/components/ui/WorkRow.tsx`)**: open typographic row, no card.

Replace with:
> **WorkRow (the section-list primitive for Archive + WorkExperience — `src/components/ui/WorkRow.tsx`)**: open typographic row, no card. (Selected Work no longer uses WorkRow — it is the pinned scroll-scrubbed `ProjectCardStack` + `GooeyTitle` stage; see the Selected Work bullet.)

- [x] **Step 2: Add a Selected Work bullet immediately after the Hero anatomy bullet**

Insert a new bullet:
> - **Selected Work stage (`src/components/sections/Projects.tsx` + `src/components/ui/{GooeyTitle,ProjectCardStack}.tsx`, helpers `src/utils/stackMotion.ts`)**: the page centerpiece — a `400svh` scroll wrapper drives a `position: sticky; height: 100svh` stage where the top-4 featured projects (`highlightOrder ≤ 4`) cycle through an animated card stack under a gooey-morphing title. Scroll IS the playhead (fully reversible, holds mid-morph) via Framer `useScroll` → `scrollYProgress` → pure helpers (`segmentFor`/`settleFrac`/`depthTransform`/`morphValues`). Zero React state per frame (leaf `useTransform` MotionValues; two discrete segment states flip only at boundaries/midpoints). Depth grammar: slot y `12 / −16 / −44`, scale `1 / .95 / .9`, exit y `340`. `--row-tint` via `accentFor(frontIndex)`. The `view project` bar honours the hero-scrim rule (ink gradient ≥ 0.88 alpha at text level). Reduced motion keeps the pin but removes ALL animation (static slots, instant swaps, no SVG filter — the threshold matrix can artifact static glyph edges). Keyboard/SR path: a visually-hidden-until-focused skip-link project index; buried cards are `aria-hidden` + `tabIndex={-1}` + `pointer-events:none`.

- [x] **Step 3: Amend the no-card-frames Shapes rule**

In the **Shapes** bullet, find:
> **Shapes**: Open typographic rows, no cards/containers.

Replace with:
> **Shapes**: Open typographic rows, no cards/containers (exception: the selected-work card-stack cards, which are deliberate framed cards — the sanctioned centerpiece).

- [x] **Step 4: Add the scroll-scrub lane to the Animation rules**

In the **Animations** bullet (Design Direction) — find the sentence beginning "GSAP = one-shot entrance orchestration ONLY". Append to that bullet:
> Framer scroll-scrub (`useScroll`/`useTransform` bound to scroll progress) is a sanctioned lane alongside Framer state-driven animation, used solely by the Selected Work stage; GSAP remains entrance-only.

- [x] **Step 5: Verify the NO-list is untouched and the doc still parses as Markdown**

Run: `grep -n "selected-work\|ProjectCardStack\|GooeyTitle\|card-stack" CLAUDE.md`
Expected: the new references present; no accidental edits to the `NO:` list.

- [x] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): selected-work card-stack design direction + scroll-scrub lane"
```

**Acceptance check (read-only):** the four edits land; the NO-list, contrast tables, and other bullets are byte-for-byte unchanged except the four specified spots.

**Boundaries:** Out of scope: any other CLAUDE.md section. Do not remove retired-system NO entries. Do not touch the spec file.

---

## Task 11: Final verification

**Spec TODO:** Full verify: `tsc -b` clean, unit green (66 + new), serial Playwright green with re-recorded baseline, Lighthouse on `npx vite preview` ≥ measured pre-change baseline (**89**). Also: Safari visual check (degrade-flag decision recorded); CLAUDE.md amendment committed (Task 10).

**Files:** none (verification + review handoff).

- [ ] **Step 1: Typecheck + unit**

Run: `npx tsc -b && npm run test:unit`
Expected: exit 0; unit **66 + new stackMotion tests** all green (≈ 66 + ~8 files → confirm the new file's cases pass).

- [ ] **Step 2: Build + fresh preview + Lighthouse ≥ 89**

Run:
```bash
npm run build && lsof -ti:4173 | xargs kill 2>/dev/null
nohup npx vite preview --port 4173 >/tmp/vite-preview.log 2>&1 & sleep 6
npx --yes lighthouse http://localhost:4173/ --only-categories=performance --preset=desktop \
  --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=/tmp/lh-final.json --quiet
node -e "const r=require('/tmp/lh-final.json');const s=Math.round(r.categories.performance.score*100);console.log('PERF',s);process.exit(s>=89?0:1)"
```
Expected: `PERF ≥ 89`. If below 89, the filter repaint / scrub cost regressed perf (spec risk 2) — investigate `will-change` scope and the filter-on-title cost before claiming done. Kill the preview after.

- [ ] **Step 3: Serial e2e — re-record the baseline**

Run: `lsof -ti:4173 | xargs kill 2>/dev/null; npx playwright test --workers=1`
Expected: green. Do NOT pre-compute the total from spec-file arithmetic — specs run per Playwright project (desktop-chromium AND mobile-chromium Pixel 5), so counts double per file and any `test.use`/skip conditions shift them. Take the MEASURED passed/skipped totals from this run and RECORD them here as the new baseline for future plans.

Additionally re-measure the long-task ceiling headroom over the NEW scrub section (review finding — Task 1's 300 ms ceiling was chosen before the feature existed): run `npx playwright test tests/e2e/perf-budget.spec.ts --workers=1 --project=desktop-chromium` and capture the actual max long-task duration from the spec's output/trace, not just pass/fail. RECORD the measured max here. If it sits within ~15% of the ceiling, flag it in the PR description as a watch item — a near-ceiling pass is a regression signal, not a clean bill.

- [ ] **Step 4: Manual Safari visual check of the gooey morph (spec risk 1)**

Open `http://localhost:4173/#projects` in Safari (WebKit). Scrub through the stack and watch the title morph — including slow back-and-forth passes across all three SEGMENT BOUNDARIES (the frame-desync pop surface, review finding #3). Decide the `thresholdFilter` degrade flag:
- If the `filter: url(#…)` threshold morph is smooth in Safari → keep `thresholdFilter` default `true`.
- If it glitches (edge artifacts, flashing) → set `<GooeyTitle thresholdFilter={false}` in `Projects.tsx` (keeps the blur/opacity crossfade, drops the matrix) and re-commit.
Record the decision (kept `true` / dropped to `false`) in the PR description and tick the spec's Safari TODO.

- [ ] **Step 5: Fresh-context code review handoff**

Dispatch a fresh-context **reviewer-opus-high** (never the implementer's model, never Sonnet) over the full branch diff vs `staging`, plus a **codex-review** cross-vendor pass (per CLAUDE.md). Reviewer scope: the re-render-trap invariants in `Projects.tsx`, a11y (buried cards inert, skip-links, gooey aria), the scrim gradient alpha, RM correctness, and the Task-1 budget decision. Fix findings before finishing the branch.

- [ ] **Step 6: Tick spec TODOs**

For each `- [ ]` in `docs/superpowers/specs/2026-07-22-selected-work-card-stack-design.md` whose acceptance test now passes AND review approved, edit it to `- [x]`. (Editing the spec's checkboxes is the ONE sanctioned spec edit — do not alter spec prose.)

**Acceptance check (read-only):** all of the above green + reviewer approval. No success claim without the captured evidence (per `verification-before-completion`).

**Boundaries:** Out of scope: new features. This task only verifies, records, and routes review.

---

## Self-review (plan author, against the spec)

**Spec coverage:** every spec TODO maps to a task — helpers→T2, GooeyTitle→T3, ProjectCardStack→T4, Projects rebuild+skip-links→T5, styles/scrim→T6, i18n→T7, RM e2e→T8, scrub e2e→T9, full verify+Lighthouse→T11, Safari→T11.4, CLAUDE.md→T10. Baseline+repair→T0/T1. No gaps.

**Type consistency:** `segmentFor`/`settleFrac`/`depthTransform`/`morphValues`/`clamp`/`smoothstep` signatures in T2 match every call site in T3/T4/T5. `StackCardData`/`ProjectCardStackProps`/`GooeyTitleProps` match Projects.tsx usage. `--row-tint` set on `.stack-inner` (T5) consumed by `.stack-meta .num` and `.stack-card-arrow` (T6).

**Placeholder scan:** no TBD/"handle edge cases"/"similar to"; all code and commands are literal.

---

## Spec concerns

1. **Terminal-plateau front card (design gap the spec does not spell out).** For a linear (non-looping) 4-item stack with 3 transitions, at the final rest (`scrollYProgress = 1`) the segment index maxes at `n-2` and the naive "front = depth 0" card is the *exited* one, leaving the last project unreachable via the front card. This plan resolves it with a second discrete state (`frontIndex`) + `interactiveDepth` so the last project's card (rendered at depth 1, promoted to slot 0 at `frac 1`) is the interactive one. Flagged because it is an invariant the reviewer must specifically check, not visible in the spec's motion table.
2. **Sticky pin vs Lenis smooth-scroll — RESOLVED by the pre-execution review (2026-07-22).** The fresh-context Opus pass verified `SmoothScroll.tsx:36-39` runs Lenis in DEFAULT mode (no `wrapper`/`content`/`virtualScroll` — it animates the real document scroll position, not a transform wrapper), no persistent `overflow: hidden` exists on `html`/`body`/`main` after the loader, and `MockupFrame.tsx:22` already ships `useScroll({ target, offset })` green under the same Lenis. `position: sticky` therefore pins normally; Task 5 Step 4's smoke is confirmation, not discovery, and the `blocked:` path remains only as a safety valve.
3. **`perf-budget` long-task baseline is already red (211–234 ms vs 200 ms).** The spec's Risk 2 assumes a green perf baseline; it is not. Task 1 repairs it before feature work, but the honest budget after adding a `400svh` scrub section may need the 300 ms ceiling documented in Task 1 — i.e., the spec's "must not regress" is measured against a baseline that itself needed a fix. Recorded so the perf criterion is not silently reinterpreted.
4. **Meta-line separator.** Spec shows `01 / 04 · <year> · <tech>` using both `/` and `·`. The `/` is not a spaced em-dash and reads as a fraction, so it is compliant with the em-dash ban; kept as specified.

No blocking spec defects — the spec is implementable as written with the terminal-plateau resolution above.

---

## Pre-execution review fix wave (2026-07-22)

Applied before Task 1 per the standing workflow rule, from the fresh-context Opus plan review + the codex (gpt-5.6-sol) cross-vendor pass — all findings verified against the tree before applying:

1. **[codex P1] RM/accessible title mis-wired** — `GooeyTitle` gained `staticTitle` (frontIndex-driven); the RM branch and the `.gooey-title-sr` accessible-name span render it. Previously the `baseIndex`-driven `from` lagged a segment and was permanently wrong on the terminal plateau.
2. **[codex P1] Scrim contract** — the CTA gradient now holds ≥ 0.88 alpha up to 72% of the bar (fade starts above the text region), satisfying the hero-scrim rule across the whole glyph area.
3. **[opus blocker] Task 9 scroll math** — `scrollToStackFraction` uses absolute document Y (`getBoundingClientRect().top + window.scrollY`); `offsetTop` was relative to the positioned `.section` and landed the scroll in the Hero.
4. **[opus blocker] Task 8 pin assertion** — the spec scrolls into the pin range (same corrected helper) before asserting sticky top ≈ 0; previously asserted before sticky engaged (deterministic fail).
5. **[codex P2] Hover scale** — Task 4 implements the spec's ≤ 1.02 fine-pointer hover via a spring MotionValue composed multiplicatively with the scrub scale; RM-inert.
6. **[codex P2] Scrub e2e title blind spot** — Task 9 now asserts the settled `.gooey-title-sr` text changes and restores.
7. **[codex P2] RM "no flight" blind spot** — Task 8 now asserts front-card bounding-box stability within a segment and across the swap.
8. **[opus should-fix] Boundary frame-desync pop** — Task 5 Step 4 gains an explicit boundary-scrub check with a named remedy (re-key cards by project); Task 11's Safari pass watches the same surface.
9. **[opus nits] `will-change` scoped to the two title spans only (CLAUDE.md standard); 400svh↔n coupling comment; Task 11 count arithmetic replaced with measured totals + long-task headroom re-measurement.**

Not applied: the "política essencial vs hotmart-bunde" naming nit — `hotmart-bunde` is the id/slug and "política essencial" its display title; the spec's curation list is correct as written.
