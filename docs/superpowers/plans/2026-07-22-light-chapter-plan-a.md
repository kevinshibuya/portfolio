# Plan A — Selected Work light chapter: entry veil + cream stage + Anton + Shadway cards

**Spec:** `docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md` (READ-ONLY; controller ticks spec TODOs at acceptance time, never here).
**Branch:** `feat/light-chapter-a` off `staging` (merge back into `staging`, NEVER `main`).
**Scope:** Plan A only (entry veil + hero stretch, Selected Work restyle, nav-on-light Projects-scope, on-light tokens + audit, provisional exit veil below Projects, e2e/unit updates). Plan B (Archive→Skills cream chapter, exit-veil relocation, CLAUDE.md rewrite) is OUT.

**For agentic workers — REQUIRED SUB-SKILL (check exactly one):**
- [ ] `superpowers:subagent-driven-development` (per-task dispatch, this session)
- [ ] `superpowers:executing-plans` (separate session, review checkpoints)

## Goal
Turn the page's first scroll destination into a warm-cream "light chapter" opening: the hero shader melts through a static transparent→cream veil into a cream Selected Work stage that keeps the shipped scroll-scrub mechanic verbatim but re-skins it — Anton morphing title, Shadway white cards with plain screenshots, a whisper eyebrow instead of a section header — with the nav flipping to an ink-on-light variant over the cream zone and a provisional cream→ink veil closing the chapter back to the dark sections below.

## Architecture
A re-skin + tonal-arc change, not a re-mechanic. The single-channel `segCont` stack (pure `stackMotion` helpers → `cardStyleAt`/`spanMorph`; `frontIndex` state feeds only non-visual attrs) is FROZEN; only `EXIT_Y` (geometry) and the accent-tint plumbing change in logic. Everything else is CSS token work, a hero DOM restructure that re-anchors the scrim/name to a new inner 100svh zone, a new self-hosted display font, and asset generation. New on-light canonical tokens (`--color-surface-light`, `--color-ink-on-light[-muted]`, deep accent triplet) live beside the dark system; the dark tokens and the `body`/html ink base are untouched so overscroll edges and every other section stay dark.

## Tech Stack
React 19 + TS strict · Vite 6 + SWC · Tailwind v4 (`@theme` in CSS, no config) · Framer Motion v12 (scroll-scrub is the sanctioned lane; the stack already uses it) · self-hosted Anton (OFL, weight 400, woff2, `font-display: swap`, preloaded) · Plus Jakarta Sans (unchanged site voice) · Playwright + Vitest · sharp (asset gen).

## Global Constraints (verbatim — violating any is a plan defect)
- Branch `feat/light-chapter-a` off `staging`; every merge target is `staging`, NEVER `main`/`master`. The `block-merge-to-main.sh` hook enforces this.
- **GSAP stays entrance-only.** No new GSAP surface. Veils are static CSS gradients — nothing animates in them.
- **No per-frame React state in the stack visual path.** Every per-frame visual stays a pure function of the single `segCont` MotionValue; `frontIndex` continues to feed ONLY non-visual attrs (`<Link>`, aria, `--row-tint`, `--row-tint-deep`, `staticTitle`, card subtitle text). Do NOT reintroduce identity-in-state + position-in-MotionValue (proven to tear at boundaries).
- **No text ever sits inside either veil band.** The entry veil is below the 100svh hero zone; the exit veil is a pure-tone band between sections.
- **Checkbox discipline:** the implementer edits each `- [ ] **Step N**` to `- [x]` immediately after that step's command lands, BEFORE the next step — never batched. Spec `## TODO` boxes are the controller's to tick at acceptance, never touched here.
- **Per-task QA evidence:** every task ends with `~/.claude/bin/qa-run.sh <label> <cmd...>` (command as SEPARATE argv words, never one quoted string). Proof-of-run = a registry line + a readable log.
- **e2e scroll math** uses `getBoundingClientRect().top + window.scrollY`, NEVER `offsetTop` (`.section{position:relative}` makes `#projects` the offsetParent — known trap). NO braces in `page.evaluate` bodies that touch Framer/GSAP objects (serialization hang). Explicit `timeout:` on every screenshot.
- Playwright: `npx playwright test --workers=1`. Manual Lighthouse: `lsof -ti:4173 | xargs kill 2>/dev/null; npx vite preview --port 4173` (NEVER `npm run preview` = wrangler).

## Baselines (MEASURED, from today's HANDOFF green runs — final verification re-measures ALL)
- Unit: **95 passed / 95** (13 files) — `npm run test:unit`.
- Serial e2e: **48 passed / 0 failed / 0 skipped** (24 per Playwright project × 2) — `npx playwright test --workers=1`.
- Typecheck: **`tsc -b` clean**.
- Lighthouse desktop perf: **94** (gate floor ≥ 89) — `npx vite preview` @ 4173, idle machine.
- Long-task e2e ceiling: **300 ms** (measured 211–234 ms under load, green idle) — `tests/e2e/perf-budget.spec.ts`.
- Playwright projects: `desktop-chromium`, `mobile-chromium`. webServer runs `npm run build && npm run preview -- --port 4173` per `playwright.config.ts` (leave as-is for the suite; the `npx vite preview` note above is for MANUAL Lighthouse only).

## Task → Model + effort routing (a proposal; the orchestrator re-judges each at dispatch)

| Task | Title | Model (effort) | ~Scope |
|---|---|---|---|
| T1 | Baseline verification snapshot | verifier-sonnet-low | run full suite, confirm baselines |
| T2 | Land RED acceptance tests | editor-sonnet-low | 5 test files verbatim, confirm RED |
| T3 | On-light tokens + neutral scrollbar (CSS) | editor-sonnet-low | `src/index.css` tokens |
| T4 | `accentDeepFor` palette helper (TDD) | implementer-sonnet-medium | `src/utils/palette.ts` |
| T5 | `stackMotion` EXIT_Y re-derivation (TDD) | editor-sonnet-low | one constant + comment |
| T6 | `stackCover` webp assets + type + data | implementer-sonnet-medium | sharp script, 4 webp, type, data |
| T7 | Anton self-hosted font | implementer-sonnet-medium | woff2 + `@font-face` + preload |
| T8 | GooeyTitle Anton restyle + threshold tune | integrator-opus-high | face/size/align + matrix |
| T9 | Projects restage (cream, eyebrow, tints, subtitle, i18n) | integrator-opus-high | `Projects.tsx` + CSS + i18n |
| T10 | ProjectCardStack Shadway cards + shadows | integrator-opus-high | `ProjectCardStack.tsx` + CSS |
| T11 | Hero stretch + entry veil | integrator-opus-high | `Hero.tsx` + hero CSS |
| T12 | Provisional exit veil below Projects | editor-sonnet-low | `Home.tsx` + CSS |
| T13 | Nav-on-light IntersectionObserver | implementer-sonnet-medium | `Header.tsx` + nav CSS |
| T14 | Real-Safari 2-line Anton visual check | codex-computer-use (gpt-5.6-sol) | WebKit `filter:url()` on 2-line title |
| T15 | Final verification (unit, e2e, tsc, Lighthouse) | verifier-sonnet-low | full suite + Lighthouse ≥ 89 |

UI-taste-critical tasks (T8 title tuning, T9 eyebrow/stage, T10 cards, T11 veil gradient) route to opus — never a gpt lane. T14 is the ONLY gpt lane (real-Safari computer-use, a capability Claude lacks).

---

## Ratified on-light contrast table (computed here — WCAG 2dp; the authority for these hexes)

Deep accents chosen: **deep pink `#B22B47`**, **deep blue `#2A54B5`**. Yellow deep `#7A6800` exists for large/decorative only — small-text rotation substitutes the ink-muted step. Muted/faded ink steps: **`rgba(11,14,20,0.62)`** (muted, always-visible small text) and **`rgba(11,14,20,0.40)`** (faded, DECORATIVE/`aria-hidden` only — below AA, matches the shipped `.contact-num`/`.workrow-index` exemption pattern).

| # | Pair | fg | bg (whitest it sits on) | ratio | AA need | verdict |
|---|---|---|---|---|---|---|
| 1 | project name (card) | `#0B0E14` ink | `#FFFFFF` card | 19.32 | 4.5 | ✅ |
| 2 | card subtitle | `rgba(11,14,20,.62)` muted | `#FFFFFF` card | 5.42 | 4.5 | ✅ |
| 3 | gooey title | `#0B0E14` ink | `#F5F2EC` cream | 17.29 | 3.0 (large) | ✅ |
| 4 | eyebrow label `· selected work` | `rgba(11,14,20,.62)` muted | `#F5F2EC` cream | 5.23 | 4.5 | ✅ |
| 5 | eyebrow numeral — STATIC section index | `#B22B47` deep pink | `#F5F2EC` cream | 5.64 | 4.5 | ✅ (pinned static, does NOT rotate — it's the section index, not per-project) |
| 6 | `--row-tint-deep` per-project channel (deep pink slot) — Plan-A/B on-light text uses | `#2A54B5` deep blue | `#F5F2EC` cream | 6.20 | 4.5 | ✅ (channel capability; both deep hexes cleared) |
| 7 | `--row-tint-deep` yellow slot → ink-muted substitute | `rgba(11,14,20,.62)` | `#F5F2EC` cream | 5.23 | 4.5 | ✅ (yellow small-text exemption) |
| 8 | pill text `view` | `#F5F2EC` cream | `#0B0E14` ink pill | 17.29 | 4.5 | ✅ |
| 9 | pill arrow `↗` — raw pink/blue/yellow | `#E64D66`/`#4D80E6`/`#E6CC4D` | `#0B0E14` ink pill | 5.17 / 5.10 / 12.06 | 4.5 | ✅ (all pass even as small text; `aria-hidden`) |
| 10 | nav-on-light link (rest) | `rgba(11,14,20,.62)` | `#F5F2EC` cream / `rgba(245,242,236,.85)` scrolled bg | 5.23 | 4.5 | ✅ |
| 11 | nav-on-light link (hover) + brand text-on-tile | `#0B0E14` | `#F5F2EC` cream | 17.29 | 4.5 | ✅ |
| 12 | nav brand mark tile | `#F5F2EC` | `#0B0E14` tile | 17.29 | 4.5 | ✅ |
| 13 | focus-visible ring (on-light) | `#0B0E14` | `#F5F2EC` cream | 17.29 | 3.0 (non-text) | ✅ |
| 14 | hairline-on-light | `rgba(11,14,20,.12)` | cream/white | decorative | — | ✅ |

Deep-accent-on-white-card (name/subtitle accents never land there in Plan A, but verified for safety): pink 6.31, blue 6.92 — both ≥ 4.5. Deep-accent on tonal cream `#EDE9E0` (Plan B ground, verified now): pink 5.21, blue 5.71. Tonal cream `#EDE9E0` vs cream `#F5F2EC` adjacency = 1.08 (tonal is a Plan B surface; defined now, not used by Plan A).

**Raw tricolor on cream FAILS small text** (pink 3.35, blue 3.39, yellow 1.43) — this is WHY the deep triplet + `--row-tint-deep` channel exist. Raw stays only on the ink pill (all pass there, row 9) via `--row-tint`.

---

## T1 — Baseline verification snapshot
**Model: verifier-sonnet-low.** Confirms the plan's baselines are real before any edit. Returns raw evidence only; fixes nothing.

### Files
- none (read-only run).

### Work
Run each and record pass/fail with counts:
- [ ] **Step 1: typecheck** — `npx tsc -b` → clean.
- [ ] **Step 2: unit** — `npm run test:unit` → expect `95 passed`.
- [ ] **Step 3: serial e2e** — `lsof -ti:4173 | xargs kill 2>/dev/null; npx playwright test --workers=1` → expect `48 passed / 0 failed / 0 skipped`.
- [ ] **Step 4: record** — if any count differs from the Baselines block, STOP and report (stale baseline is a plan defect to fix before T2, per the standing rule).

### Verify before returning
- `~/.claude/bin/qa-run.sh baseline-unit npm run test:unit`
- `~/.claude/bin/qa-run.sh baseline-e2e npx playwright test --workers=1`

### Boundaries
- Out of scope: any edit. This task only measures.
- If counts differ: return `blocked: baseline drift <detail>`.

---

## T2 — Land RED acceptance tests + sanctioned shipped-spec updates
**Model: editor-sonnet-low.** Transcribes the seven test files below VERBATIM, then confirms the RED ones fail and the green rescopes pass. These are the upstream-authored acceptance gates + the two shipped specs that T9's SectionHeading removal would otherwise break; implementers make the RED ones pass and never edit any of them.

Two classes of change here:
- **RED (must fail after this task, turn green downstream):** `stackMotion.test.ts` (EXIT_Y 520 vs current 440), `palette.test.ts` (no `accentDeepFor` yet), `stack-scrub.spec.ts` (no `.stack-card-subtitle` yet), `hero-veil.spec.ts` (no zone/veil yet), `nav-on-light.spec.ts` (no `.nav--on-light` yet).
- **Sanctioned GREEN rescopes (pass immediately, pre-empt the T9 breakage):** `reduced-motion.spec.ts` and `section-enters.spec.ts` both currently assert `#projects .section-title`, which T9 deletes (SectionHeading removed from Projects only). Rescope them NOW so they never reference `#projects`'s title; they stay green from this task onward regardless of T9. Their per-project test count changes — see the recomputed totals at the end of this task.

### Files
- `tests/unit/stackMotion.test.ts` — modify: EXIT_Y `440`→`520` + Anton-bounded blur cap (full new file below). RED.
- `tests/unit/palette.test.ts` — create: `accentDeepFor` contract. RED.
- `tests/e2e/stack-scrub.spec.ts` — modify: `.stack-meta` → `.stack-card-link .stack-card-subtitle` (full new file below). RED.
- `tests/e2e/hero-veil.spec.ts` — create: hero > 100svh, veil band exists, name inside zone, no text in band. RED.
- `tests/e2e/nav-on-light.spec.ts` — create: nav flips on-light over Projects, dark outside. RED.
- `tests/e2e/reduced-motion.spec.ts` — modify: rescope the title-never-scroll-fades assertion off `#projects` onto `#archive` (still a SectionHeading section). GREEN rescope.
- `tests/e2e/section-enters.spec.ts` — modify: drop `'#projects'` from the looped sections array (its title moves to the gooey stage). GREEN rescope.

### Work

**`tests/unit/stackMotion.test.ts`** (FULL replacement — EXIT_Y 520 everywhere; the it()-label `226`→`266`; near-boundary `439.9`→`519.8`; and the blur-cap assertions restructured to BOUNDS form `[100, 240]` so T8's Anton blur-cap tune stays green while the midpoint stays exact). Anchors corrected: the `226` lives on both the it() label AND its assertion (replace EVERY `226`→`266`, label text included); the near-boundary lines are 83 (assertion) / 127 (comment) / 128 (bound). Transcribe exactly:
```ts
import { describe, it, expect } from 'vitest'
import {
  clamp,
  smoothstep,
  segmentFor,
  settleFrac,
  depthTransform,
  cardStyleAt,
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

describe('depthTransform (slots 12/-16/-44, scales 1/.95/.9, exit y 520)', () => {
  it('front card (depth 0) sits at slot 0 when settled', () => {
    expect(depthTransform(0, 0)).toMatchObject({ y: 12, scale: 1, opacity: 1 })
  })
  it('front card exits to y 520 and fades to .85 across the window', () => {
    expect(depthTransform(0, 1)).toMatchObject({ y: 520, opacity: 0.85 })
  })
  it('front-card exit accelerates (ease-in lags the linear midpoint 266)', () => {
    expect(depthTransform(0, 0.5).y).toBeLessThan(266)
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

describe('cardStyleAt (single-channel rel = cardIndex − segCont)', () => {
  it('parks any fully-exited card (rel ≤ −1) at EXIT_Y, opacity/shadow 0', () => {
    expect(cardStyleAt(-1)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
    expect(cardStyleAt(-1.5)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
    expect(cardStyleAt(-3)).toEqual({ y: 520, scale: 1, opacity: 0, shadow: 0 })
  })
  it('integer rest states equal depthTransform(depth, 0)', () => {
    expect(cardStyleAt(0)).toEqual(depthTransform(0, 0)) // front at rest
    expect(cardStyleAt(1)).toEqual(depthTransform(1, 0))
    expect(cardStyleAt(2)).toEqual(depthTransform(2, 0))
    expect(cardStyleAt(3)).toEqual(depthTransform(3, 0)) // incoming, opacity 0 at back slot
  })
  it('mid-exit (rel −0.5) decomposes to depthTransform(0, 0.5)', () => {
    expect(cardStyleAt(-0.5)).toEqual(depthTransform(0, 0.5))
  })
  it('mid-promotion (rel 0.5) decomposes to depthTransform(1, 0.5)', () => {
    expect(cardStyleAt(0.5)).toEqual(depthTransform(1, 0.5))
  })
  it('is continuous approaching the park boundary, then the park drops opacity', () => {
    // rel = −1 + ε → depthTransform(0, 1 − ε): y → 520, opacity → 0.85, shadow → 1.
    const nearY = cardStyleAt(-1 + 1e-4)
    expect(nearY.y).toBeGreaterThan(519.8)
    expect(nearY.y).toBeLessThanOrEqual(520)
    expect(nearY.opacity).toBeCloseTo(0.85, 3)
    // The only discontinuity at rel = −1 is the park branch: opacity 0.85 → 0.
    const parked = cardStyleAt(-1)
    expect(parked.y).toBe(520)
    expect(parked.opacity).toBe(0)
    expect(parked.shadow).toBe(0)
  })
})

describe('morphValues (gooey blur/opacity, cap in bounds, no Infinity)', () => {
  // The blur CAP is an Anton-tunable constant within [100, 240] (T8): bigger
  // glyphs need proportionally more blur to fully dissolve at the crossfade
  // extremes. These bound the cap instead of pinning it, so any value T8 picks
  // in-range stays green; the midpoint gooey blur (8px) stays exact.
  const BLUR_CAP_MIN = 100
  const BLUR_CAP_MAX = 240
  it('at frac 0 the outgoing title is crisp, incoming maxed-blur + transparent', () => {
    const m = morphValues(0)
    expect(m.outgoing).toEqual({ blur: 0, opacity: 1 })
    expect(m.incoming.opacity).toBe(0)
    expect(m.incoming.blur).toBeGreaterThanOrEqual(BLUR_CAP_MIN)
    expect(m.incoming.blur).toBeLessThanOrEqual(BLUR_CAP_MAX)
  })
  it('at frac 1 the incoming title is crisp, outgoing gone', () => {
    const m = morphValues(1)
    expect(m.incoming).toEqual({ blur: 0, opacity: 1 })
    expect(m.outgoing.opacity).toBe(0)
    expect(m.outgoing.blur).toBeGreaterThanOrEqual(BLUR_CAP_MIN)
    expect(m.outgoing.blur).toBeLessThanOrEqual(BLUR_CAP_MAX)
  })
  it('at the midpoint both blur to 8px and are symmetric', () => {
    const m = morphValues(0.5)
    expect(m.incoming.blur).toBeCloseTo(8, 6)
    expect(m.outgoing.blur).toBeCloseTo(8, 6)
    expect(m.incoming.opacity).toBeCloseTo(Math.pow(0.5, 0.4), 6)
  })
  it('blur is always within [0, cap]', () => {
    for (const f of [0, 0.01, 0.2, 0.5, 0.8, 0.99, 1]) {
      const m = morphValues(f)
      for (const b of [m.incoming.blur, m.outgoing.blur]) {
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThanOrEqual(BLUR_CAP_MAX)
      }
    }
  })
})
```

**`tests/unit/palette.test.ts`** (create):
```ts
import { describe, it, expect } from 'vitest'
import { accentFor, accentDeepFor, ACCENTS, ACCENTS_DEEP } from '../../src/utils/palette'

describe('accentFor (raw tricolor, on-ink)', () => {
  it('rotates pink/blue/yellow and wraps', () => {
    expect(accentFor(0)).toBe('#E64D66')
    expect(accentFor(1)).toBe('#4D80E6')
    expect(accentFor(2)).toBe('#E6CC4D')
    expect(accentFor(3)).toBe('#E64D66')
  })
})

describe('accentDeepFor (on-light deep triplet)', () => {
  it('deep pink / deep blue / ink-muted (yellow small-text exemption), wraps', () => {
    expect(accentDeepFor(0)).toBe('#B22B47')
    expect(accentDeepFor(1)).toBe('#2A54B5')
    expect(accentDeepFor(2)).toBe('rgba(11,14,20,0.62)')
    expect(accentDeepFor(3)).toBe('#B22B47')
  })
  it('the yellow slot never emits a deep-yellow (fails small-text AA on cream)', () => {
    expect(ACCENTS_DEEP[2]).not.toMatch(/^#/)
  })
  it('is index-aligned in length with the raw triplet', () => {
    expect(ACCENTS_DEEP.length).toBe(ACCENTS.length)
  })
})
```

**`tests/e2e/stack-scrub.spec.ts`** (full replacement — subtitle-scoped plateau assertion):
```ts
import { test, expect } from '@playwright/test'

// Scroll the window to an absolute fraction of the stack wrapper's scrollable
// range and settle a frame. ABSOLUTE document Y via getBoundingClientRect().top
// + window.scrollY — offsetTop would be relative to the positioned #projects
// (.section is position:relative) and land the scroll in the Hero.
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

    // Settle-plateau start of segment 0. The settled title is read from the
    // accessible-name span (.gooey-title-sr tracks frontIndex); the card-body
    // subtitle is scoped to the FRONT card only (.stack-card-link is the single
    // interactive card — innerText-pollution guard, all four bodies are mounted).
    await scrollToStackFraction(page, 0.02)
    const hrefP0 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const subP0 = await page.locator('#projects .stack-card-link .stack-card-subtitle').innerText()
    const titleP0 = await page.locator('#projects .gooey-title-sr').textContent()

    // Settle-plateau of the next project (past the first segment's morph window).
    await scrollToStackFraction(page, 0.34)
    const hrefP1 = await page.locator('#projects .stack-card-link').getAttribute('href')
    const subP1 = await page.locator('#projects .stack-card-link .stack-card-subtitle').innerText()
    const titleP1 = await page.locator('#projects .gooey-title-sr').textContent()
    expect(hrefP1).not.toBe(hrefP0)
    expect(subP1).not.toBe(subP0)
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

**`tests/e2e/hero-veil.spec.ts`** (create):
```ts
import { test, expect } from '@playwright/test'

test('hero grows past 100svh with a cream veil band below the name zone', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // The hero section is stretched to ~130svh: rendered height clearly exceeds the
  // viewport (100svh). Read absolute geometry, no offsetTop.
  const geo = await page.evaluate(() => {
    const hero = document.querySelector('#top') as HTMLElement | null
    const zone = document.querySelector('#top .hero-zone') as HTMLElement | null
    const veil = document.querySelector('#top .hero-veil') as HTMLElement | null
    const name = document.querySelector('#top .hero-name') as HTMLElement | null
    if (!hero || !zone || !veil || !name) return null
    const h = hero.getBoundingClientRect()
    const z = zone.getBoundingClientRect()
    const v = veil.getBoundingClientRect()
    const nm = name.getBoundingClientRect()
    return {
      heroH: h.height,
      innerH: window.innerHeight,
      zoneBottom: z.bottom,
      veilTop: v.top,
      nameBottom: nm.bottom,
      veilText: (veil.textContent || '').trim(),
    }
  })
  expect(geo).not.toBeNull()
  // > 100svh (allow measurement slack; target is ~130svh).
  expect(geo!.heroH).toBeGreaterThan(geo!.innerH * 1.15)
  // The name sits fully inside the 100svh zone, above the veil band.
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.zoneBottom + 1)
  expect(geo!.nameBottom).toBeLessThanOrEqual(geo!.veilTop + 1)
  // No text ever renders inside the veil band.
  expect(geo!.veilText).toBe('')
})
```

**`tests/e2e/nav-on-light.spec.ts`** (create):
```ts
import { test, expect } from '@playwright/test'

// Absolute document-Y scroll to a fraction INTO a section (no offsetTop).
async function scrollIntoSection(page: import('@playwright/test').Page, id: string, frac: number): Promise<void> {
  await page.evaluate((args) => {
    const el = document.querySelector('#' + args.id) as HTMLElement | null
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + el.offsetHeight * args.frac, behavior: 'instant' as ScrollBehavior })
  }, { id, frac })
  await page.waitForTimeout(200)
}

test('nav flips to on-light over the cream Selected Work zone and back to dark', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  // Hero (dark): nav is not on-light.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(200)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)

  // Deep inside the pinned cream stage: nav flips on-light.
  await scrollIntoSection(page, 'projects', 0.4)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(1)

  // Into the dark section below (Archive): nav returns to dark.
  await scrollIntoSection(page, 'archive', 0.3)
  await expect(page.locator('header.nav.nav--on-light')).toHaveCount(0)
})
```

**`tests/e2e/reduced-motion.spec.ts`** (GREEN rescope — repoint the assertion off `#projects` onto `#archive`, still a SectionHeading `.section-title` section; T9 deletes the Projects header). FULL replacement:
```ts
import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

// The Selected Work stage no longer renders a SectionHeading (.section-title moved
// into the gooey stage). Assert the "titles never scroll-fade under RM" invariant
// against Archive, which keeps its SectionHeading in both plans.
test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#archive').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#archive .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
```

**`tests/e2e/section-enters.spec.ts`** (GREEN rescope — drop `'#projects'` from the looped array; its title is now the gooey stage, not a `.section-title`). FULL replacement:
```ts
import { test, expect } from '@playwright/test'

test.describe('section enter on viewport', () => {
  // Every listed section renders its title via SectionHeading as `.section-title`.
  // Projects is EXCLUDED: its header is now the pinned gooey stage (no .section-title).
  const titleSelectorFor = (id: string): string => `${id} .section-title`

  for (const id of ['#archive', '#work', '#skills', '#contact']) {
    test(`${id} title transitions from hidden to visible on scroll`, async ({ page }) => {
      await page.goto('/')
      await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
      const titleSel = titleSelectorFor(id)
      const before = await page.locator(titleSel).first().evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      ).catch(() => null)
      // Scroll to section
      await page.locator(id).scrollIntoViewIfNeeded()
      await page.waitForTimeout(900)
      const after = await page.locator(titleSel).first().evaluate((el) =>
        parseFloat(getComputedStyle(el as HTMLElement).opacity)
      )
      // Title eventually fully visible
      expect(after).toBeGreaterThan(0.99)
      void before
    })
  }
})
```

- [ ] **Step 1:** transcribe all seven files exactly.
- [ ] **Step 2: confirm RED** — run the five RED files and confirm each FAILS for the expected reason (unit: EXIT_Y 520 vs current 440 / `accentDeepFor` missing; e2e: `.stack-card-subtitle` / `.hero-veil` / `.nav--on-light` absent). RED is success here. The blur-cap bounds `[100,240]` PASS against the current cap 100 — only the EXIT_Y assertions make `stackMotion.test.ts` RED.
- [ ] **Step 3: confirm GREEN rescopes** — run `reduced-motion.spec.ts` + `section-enters.spec.ts` and confirm they PASS immediately (they no longer touch `#projects`; `#projects` still has its SectionHeading at this point, but these specs simply don't reference it anymore).

### Recomputed e2e totals (this task changes the suite size — carried to T15)
- `section-enters.spec.ts`: 5 → 4 tests (dropped `#projects`) = **−1 per Playwright project**.
- `reduced-motion.spec.ts`: 1 → 1 (rescoped, count unchanged).
- `hero-veil.spec.ts`: **+1 per project** (new).
- `nav-on-light.spec.ts`: **+1 per project** (new).
- `stack-scrub.spec.ts`: 2 → 2 (subtitle-scoped, count unchanged).
- **Net: +1 per project.** Two Playwright projects (`desktop-chromium`, `mobile-chromium`): baseline `48` → **`50 passed / 0 failed / 0 skipped`** (48 − 2 [section-enters ×2] + 2 [hero-veil ×2] + 2 [nav-on-light ×2] = 50). T15 asserts 50.

### Verify before returning
- `~/.claude/bin/qa-run.sh red-unit npx vitest run tests/unit/stackMotion.test.ts tests/unit/palette.test.ts` — both RED (failing).
- `~/.claude/bin/qa-run.sh red-e2e npx playwright test --workers=1 tests/e2e/stack-scrub.spec.ts tests/e2e/hero-veil.spec.ts tests/e2e/nav-on-light.spec.ts` — all RED.
- `~/.claude/bin/qa-run.sh green-rescope npx playwright test --workers=1 tests/e2e/reduced-motion.spec.ts tests/e2e/section-enters.spec.ts` — both GREEN.

### Boundaries
- Out of scope: any `src/` change. This task only lands/edits tests.
- The seven files are read-only to every downstream implementer.
- If a RED test errors for a DIFFERENT reason than expected (import path, syntax), or a GREEN rescope fails: return `blocked: <detail>`.

---

## T3 — On-light tokens + neutral scrollbar
**Model: editor-sonnet-low.** Pure CSS transcription of exact values.

### Files
- `src/index.css` — modify: add on-light tokens to `@theme` + `:root`; swap the scrollbar thumb to neutral gray.

### Work
1) In the `@theme { ... }` block (after `--color-accent-yellow: #E6CC4D;`, before `--font-sans`), add:
```css
  /* On-light chapter (Plan A). New canonical tokens — NOT the legacy alias set.
     Contrast-audited in docs/superpowers/plans/2026-07-22-light-chapter-plan-a.md. */
  --color-surface-light:        #F5F2EC; /* cream page surface */
  --color-surface-light-tonal:  #EDE9E0; /* deeper cream (Plan B tonal role; defined now) */
  --color-ink-on-light:         #0B0E14; /* primary ink text on cream/white */
  --color-accent-pink-deep:     #B22B47; /* deep pink, ≥4.5:1 on cream/white */
  --color-accent-blue-deep:     #2A54B5; /* deep blue, ≥4.5:1 on cream/white */
  --color-accent-yellow-deep:   #7A6800; /* large/decorative only — small text uses ink-muted */
```
2) In `:root { ... }` (after `--periwinkle-300: #7AA0ED;`), add the alpha steps (kept out of `@theme` to avoid Tailwind alpha-utility churn):
```css
  /* On-light alpha steps (Plan A). Muted = always-visible small text (≥4.5:1);
     faded = decorative/aria-hidden ONLY (below AA, matches .contact-num). */
  --color-ink-on-light-muted: rgba(11, 14, 20, 0.62);
  --color-ink-on-light-faded: rgba(11, 14, 20, 0.40);
  --color-hairline-on-light:  rgba(11, 14, 20, 0.12);
```
3) Neutral scrollbar thumb — replace the cream-alpha values so the bar reads on BOTH the dark ends and the cream chapter (one global value; per-section scrollbars aren't reliable). Change these existing lines:
- Firefox (line ~123): `scrollbar-color: rgba(245, 242, 236, 0.18) transparent;` → `scrollbar-color: rgba(120, 120, 128, 0.55) transparent;`
- WebKit thumb (line ~128): `background: rgba(245, 242, 236, 0.16);` → `background: rgba(120, 120, 128, 0.5);`
- WebKit thumb hover (line ~135): `background: rgba(245, 242, 236, 0.30);` → `background: rgba(120, 120, 128, 0.72);`

### Verify before returning
- `~/.claude/bin/qa-run.sh t3-typecheck npx tsc -b` — clean (CSS-only, no TS impact; sanity).
- Grep confirms tokens present: `grep -n "color-surface-light\|ink-on-light\|accent-pink-deep\|120, 120, 128" src/index.css`.

### Boundaries
- Out of scope: applying the tokens to any component (later tasks). Do NOT touch the dark tokens, `body { background: var(--cream) }`, or the legacy alias block.

---

## T4 — `accentDeepFor` palette helper (TDD)
**Model: implementer-sonnet-medium.** Acceptance authored in T2 (`tests/unit/palette.test.ts`).

### Files
- `src/utils/palette.ts` — modify: add `ACCENTS_DEEP` + `accentDeepFor`.

### Work
Append to `src/utils/palette.ts`:
```ts
/**
 * On-light deep triplet, index-rotated, index-aligned with ACCENTS. Set as the
 * per-project `--row-tint-deep` channel for on-light text-bearing uses (the
 * spec's two-channel mandate; the eyebrow numeral is instead pinned to the
 * STATIC section accent, not this rotation — see T9/T11). The yellow slot CANNOT
 * meet small-text AA on cream (a 4.5:1 deep-yellow reads dark-olive), so it emits
 * the ink-muted step instead — the spec's yellow small-text exemption. The raw
 * ACCENTS stay for on-ink uses (--row-tint).
 */
export const ACCENTS_DEEP = ['#B22B47', '#2A54B5', 'rgba(11,14,20,0.62)'] as const
export type AccentDeep = (typeof ACCENTS_DEEP)[number]
export function accentDeepFor(index: number): AccentDeep {
  return ACCENTS_DEEP[index % ACCENTS_DEEP.length]
}
```

### Acceptance check
- Test: `tests/unit/palette.test.ts` — authored in T2, RED.
- Run: `npx vitest run tests/unit/palette.test.ts`
- You make it pass. You never edit it.

### Verify before returning
- `~/.claude/bin/qa-run.sh t4-unit npx vitest run tests/unit/palette.test.ts` — green.
- `~/.claude/bin/qa-run.sh t4-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: consuming the helper (T9 wires it into the stage style).

---

## T5 — `stackMotion` EXIT_Y re-derivation (TDD)
**Model: editor-sonnet-low.** Geometry re-derived here (below); the edit is a one-constant transcription. Acceptance authored in T2.

**Derivation (record — the clearance rule that produced the shipped 440):** the Shadway card is taller than the image-only card. At the 620px desktop cap the card box is **448px tall**, laid out as `12(pad) + 354(frame) + 10(gap) + 60(body) + 12(pad) = 448` — i.e. the body row is exactly **60px** (T10 fixes: container `aspect-ratio: 620 / 448`; frame width 596 → height 596×9.5/16 ≈ 354; body is `flex:1` filling the residual 60px). The front card rests at slot-0 `y = 12`, so the promoted card's bottom sits at `12 + 448 = 460`. Keeping the shipped 60px clearance buffer (shipped: 440 − (12 + 368) = 60), `EXIT_Y = 460 + 60 = 520`. The exiting card fully clears the promoted card during its visible flight tail; parked cards (`rel ≤ −1`) drop to opacity 0 regardless.

### Files
- `src/utils/stackMotion.ts` — modify: `EXIT_Y` constant.
- `src/index.css` — modify: stale `.stack-sticky` comment.

### Work
1) `src/utils/stackMotion.ts` line 61: `const EXIT_Y = 440` → `const EXIT_Y = 520`.
2) `src/index.css` `.stack-sticky` comment (line ~1980) `/* clip the exiting card as it flies to y 340 */` → `/* clip the exiting card as it flies to y 520 */`.

### Acceptance check
- Test: `tests/unit/stackMotion.test.ts` — authored in T2 (EXIT_Y 520), RED.
- Run: `npx vitest run tests/unit/stackMotion.test.ts`
- You make it pass. You never edit it.

### Verify before returning
- `~/.claude/bin/qa-run.sh t5-unit npx vitest run tests/unit/stackMotion.test.ts` — green.
- `~/.claude/bin/qa-run.sh t5-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: slot offsets (12/−16/−44) and scales (1/.95/.9) STAY (viewport-independent depth grammar; only EXIT_Y is card-height-coupled). Shadows recalibrate in T10 (component, not this helper).

---

## T6 — `stackCover` webp assets + type + data
**Model: implementer-sonnet-medium.**

### Files
- `scripts/gen-stack-covers.mjs` — create: one-off sharp generator.
- `public/images/projects/<slug>/stack-cover.webp` — create ×4 (generated).
- `src/types/content.ts` — modify: add `stackCover?: string` to `Mockups`.
- `src/data/projects.ts` — modify: add `stackCover` to the 4 featured `mockups`.

### Work
1) Create `scripts/gen-stack-covers.mjs` (sharp is installed). Source PNG per featured slug is the public-facing top-of-page shot the MacBook mockup showed:
```js
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

// [slug, sourcePNG] — top-of-page public shot; cropped to 16:9.5 @ 1024w.
const JOBS = [
  ['hotmart-bunde',           '01-hero.png'],
  ['radar-legislativo',       '04-home.png'],
  ['enquetes-gzh',            '01-embed-vote.png'],
  ['painel-da-reconstrucao',  '01-dados-gerais.png'],
]
const W = 1024
const H = Math.round((W * 9.5) / 16) // 608

for (const [slug, src] of JOBS) {
  const dir = `public/images/projects/${slug}`
  const input = `${dir}/desktop/${src}`
  const out = `${dir}/stack-cover.webp`
  await mkdir(dir, { recursive: true })
  // Resize to width W, then extract the top H px (top-of-page crop).
  const buf = await sharp(input).resize({ width: W }).png().toBuffer()
  const meta = await sharp(buf).metadata()
  const cropH = Math.min(H, meta.height ?? H)
  await sharp(buf)
    .extract({ left: 0, top: 0, width: W, height: cropH })
    .resize({ width: W, height: H, fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toFile(out)
  console.log('wrote', out, `${W}x${H}`)
}
```
2) Run it: `node scripts/gen-stack-covers.mjs` — expect 4 `wrote ... 1024x608` lines. Confirm the 4 webp exist and each is < 200KB (`ls -la public/images/projects/*/stack-cover.webp`).
3) `src/types/content.ts` `Mockups` — add `stackCover?: string   // Selected Work card (1024×608 top-crop webp)` alongside `desktopBento`.
4) `src/data/projects.ts` — add `stackCover: '/images/projects/<slug>/stack-cover.webp'` to the `mockups` object of each of the 4 featured projects: `hotmart-bunde`, `radar-legislativo`, `enquetes-gzh`, `painel-da-reconstrucao`. (`desktopBento` stays.)

### Verify before returning
- `~/.claude/bin/qa-run.sh t6-assets node -e "const fs=require('fs');['hotmart-bunde','radar-legislativo','enquetes-gzh','painel-da-reconstrucao'].forEach(s=>{const p='public/images/projects/'+s+'/stack-cover.webp';if(!fs.existsSync(p))throw new Error('missing '+p);console.log('ok',p,fs.statSync(p).size)})"`
- `~/.claude/bin/qa-run.sh t6-typecheck npx tsc -b` — clean (data + type align).

### Boundaries
- Out of scope: consuming `stackCover` in components (T9/T10). Do NOT touch other projects' data or the `desktop`/`mobile` fields.

---

## T7 — Anton self-hosted font
**Model: implementer-sonnet-medium.** Anton is the largest text on the first scroll destination — self-host, subset latin+latin-ext, preload, `font-display: swap`.

### Files
- `public/fonts/Anton-latin.woff2` — create (downloaded/subset).
- `public/fonts/Anton-latin-ext.woff2` — create.
- `src/index.css` — modify: add two `@font-face` blocks.
- `index.html` — modify: add a preload link for the latin subset.

### Work
Acquire Anton (OFL, single weight 400) as latin + latin-ext woff2 subsets. **Primary path** (Google Fonts already serves per-subset woff2 — no local subsetting toolchain, which this machine lacks):
```bash
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
curl -s -A "$UA" 'https://fonts.googleapis.com/css2?family=Anton&display=swap' -o /tmp/anton.css
cat /tmp/anton.css   # inspect: two @font-face (latin, latin-ext) each with one woff2 URL + unicode-range
# Download the latin woff2 (the block whose unicode-range starts U+0000-00FF) → public/fonts/Anton-latin.woff2
# Download the latin-ext woff2 (unicode-range starting U+0100-02BA)          → public/fonts/Anton-latin-ext.woff2
curl -s -A "$UA" '<latin-woff2-url>'     -o public/fonts/Anton-latin.woff2
curl -s -A "$UA" '<latin-ext-woff2-url>' -o public/fonts/Anton-latin-ext.woff2
```
Confirm both files are valid woff2 (`file public/fonts/Anton-*.woff2` → "Web Open Font Format (Version 2)") and each < 30KB.

**Fallback if the subagent has no network:** return `blocked: no network for Anton fetch — orchestrator to supply public/fonts/Anton-latin.woff2 + Anton-latin-ext.woff2 (Google Fonts Anton, weight 400, latin + latin-ext subsets)`. Do NOT ship a placeholder or a different family.

Then add to `src/index.css` (after the two Plus Jakarta `@font-face`, before the TOKENS block). Portuguese diacritics (ç ã ú in "reconstrução") live in the latin range, so the latin subset alone renders every title; latin-ext is defensive:
```css
/* Anton — display face for the Selected Work morphing title ONLY (Anton fence).
   Self-hosted, single weight 400, subset latin + latin-ext, swap. */
@font-face {
  font-family: 'Anton';
  src: url('/fonts/Anton-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;
}
@font-face {
  font-family: 'Anton';
  src: url('/fonts/Anton-latin-ext.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;
}
```
Add the preload in `index.html` head immediately after the existing Plus Jakarta preload (`</link>` at line ~325):
```html
    <link
      rel="preload"
      href="/fonts/Anton-latin.woff2"
      as="font"
      type="font/woff2"
      crossorigin="anonymous"
    />
```
Do NOT add Anton to the inline loader `@font-face` in `index.html` — the title is below the fold; Anton is not needed pre-React.

### Verify before returning
- `~/.claude/bin/qa-run.sh t7-fonts node -e "const fs=require('fs');['Anton-latin.woff2','Anton-latin-ext.woff2'].forEach(f=>{const p='public/fonts/'+f;const b=fs.readFileSync(p);if(b.slice(0,4).toString('ascii')!=='wOF2')throw new Error('not woff2: '+p);console.log('ok',p,b.length)})"`
- `~/.claude/bin/qa-run.sh t7-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: applying `font-family: Anton` (T8). Anton is used NOWHERE except the stack title — do not touch any other selector.

---

## T8 — GooeyTitle Anton restyle + threshold tune
**Model: integrator-opus-high.** Taste + morph-filter tuning; the real-Safari 2-line worst case is verified in T14.

### Files
- `src/index.css` — modify: `.gooey-title` / `.gooey-title-stage` / `.gooey-title-span` block (lines ~1993–2010).
- `src/components/ui/GooeyTitle.tsx` — modify: threshold feColorMatrix offset.
- `src/utils/stackMotion.ts` — modify: the `morphBlur` cap constant ONLY (spec requires threshold AND blur re-tuned for Anton).

### Work
Intent: the morphing project title becomes the heading — Anton, ink, `clamp(56px, 9vw, 150px)`, line-height 0.95, centered. Long titles wrap to 2 lines ("painel da reconstrução" MUST be 2 lines at 1280px and 390px); a 1-line title morphing against a 2-line title must be vertically centered in the shared grid cell (no top-align offset). Anton's dense condensed strokes at up to 150px merge more aggressively than Jakarta 700 at ≤64px — re-tune BOTH the SVG threshold (crispness/blob guard) AND the blur cap (bigger glyphs need proportionally more blur to fully dissolve at the crossfade extremes).

**1) Typography on the BASE rule (so the reduced-motion `<h2 class="gooey-title">{staticTitle}</h2>` gets the SAME Anton face + size — RM drops animation, not typography).** The animated spans inherit the face from the base; they carry only layout. Replace the `.gooey-title` / `.gooey-title-stage` / `.gooey-title-span` block:
```css
.gooey-title {
  position: relative;
  margin: 0;
  text-align: center;
  text-transform: lowercase;
  font-family: 'Anton', 'Plus Jakarta Sans', sans-serif;
  font-weight: 400;
  font-size: clamp(56px, 9vw, 150px);
  line-height: 0.95;
  letter-spacing: 0;               /* Anton is already condensed; -0.03em over-tightens */
  color: var(--color-ink-on-light);
}
.gooey-title-defs { position: absolute; width: 0; height: 0; }
.gooey-title-stage {
  position: relative;
  display: inline-grid;
  place-items: center;             /* center every span in the shared cell → mixed 1-/2-line align */
  max-width: min(90vw, 18ch);      /* forces "painel da reconstrução" to 2 lines; integrator finalizes */
  line-height: 0.95;
}
.gooey-title-span {
  grid-area: 1 / 1;                 /* stack all spans in one cell so they morph in place */
  place-self: center;              /* center a 1-line span within a 2-line-tall cell */
  display: block;
  text-align: center;
  line-height: 0.95;               /* explicit so a 2-line span matches the base metrics */
  will-change: filter, opacity;    /* font-family/size/weight/color inherit from .gooey-title */
}
```
**2) Threshold matrix** — `GooeyTitle.tsx` line ~93: raise the alpha offset `-140` → `-150` (threshold 0.549 → 0.588: thinner gooey bridges, less blob for denser strokes). `values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"` → `... 0 0 0 255 -150"`. Integrator may take it to `-160`/`-170` if T14 shows blobbing; record the final value. `thresholdFilter` default stays `true` (WebKit degrade flag preserved).

**3) Blur cap** — `stackMotion.ts` `morphBlur` (line ~111). The two literal `100` caps become ONE named constant tuned for Anton's scale. Bounds `[100, 240]` (the T2 unit test asserts the cap in this range, NOT an exact value, so any in-range choice stays green). Recommended starting value **180** (at cap 180 the outgoing title reaches full blur at ~28% opacity, so a 150px Anton title fully smears before it fades out; T14 may adjust within bounds). Replace:
```ts
// Gooey blur, capped, guarded against division by zero (→ full cap).
const morphBlur = (x: number): number => (x <= 0 ? 100 : Math.min(8 / x - 8, 100))
```
with:
```ts
// Gooey blur cap, tuned for Anton's large condensed glyphs — bigger glyphs need
// more blur to fully dissolve at the crossfade extremes (spec: threshold AND blur
// re-tuned for Anton). Bounds [100, 240] (tests/unit/stackMotion.test.ts asserts
// the cap in-range, not an exact value); the crossfade SHAPE (8/x−8) and the 8px
// midpoint are unchanged. Guarded against division by zero (→ full cap).
const BLUR_CAP = 180
const morphBlur = (x: number): number => (x <= 0 ? BLUR_CAP : Math.min(8 / x - 8, BLUR_CAP))
```
- [ ] **Record the chosen `BLUR_CAP` value + one-line rationale here** (starting 180; final after T14): __________

### Acceptance check
- Unit (blur cap stays in bounds after the tune): `tests/unit/stackMotion.test.ts` (T2, bounds-form blur) stays GREEN. Run: `npx vitest run tests/unit/stackMotion.test.ts`.
- Visual/behavioral (verified downstream): the RM path (`tests/e2e/stack-reduced-motion.spec.ts`) and the scrub title assertion (`tests/e2e/stack-scrub.spec.ts` `.gooey-title-sr`) stay green after T9/T10 land the cream stage. The definitive 2-line WebKit check is T14.
- Run (after T9/T10): `npx playwright test --workers=1 tests/e2e/stack-scrub.spec.ts tests/e2e/stack-reduced-motion.spec.ts`

### Verify before returning
- `~/.claude/bin/qa-run.sh t8-unit npx vitest run tests/unit/stackMotion.test.ts` — green (blur cap in bounds).
- `~/.claude/bin/qa-run.sh t8-typecheck npx tsc -b` — clean.
- Grep confirms Anton + ink + clamp on the BASE rule + tuned constants: `grep -n "font-family: 'Anton'\|clamp(56px, 9vw, 150px)\|ink-on-light\|255 -150\|BLUR_CAP" src/index.css src/components/ui/GooeyTitle.tsx src/utils/stackMotion.ts`.

### Boundaries
- Out of scope: `morphValues`/`spanMorph` logic and the crossfade SHAPE `8/x−8` (frozen). The ONLY sanctioned `morphBlur` change is the cap constant within `[100, 240]`; the midpoint (8px) and endpoints stay exact. Anton anywhere but this title. Do not remove the sr-only static title or the threshold `<svg>` scaffolding.

---

## T9 — Projects restage: cream stage, eyebrow, tint channels, card subtitle, i18n
**Model: integrator-opus-high.** Multi-file rewire; the eyebrow replaces the SectionHeading block and the stage goes cream. Feeds T10 the card `subtitle` data.

### Files
- `src/components/ui/ProjectCardStack.tsx` — modify: extend the `StackCardData` interface with `subtitle: string` (interface ONLY — T10 renders it). This lives here so T9's `cards` construction typechecks.
- `src/components/sections/Projects.tsx` — modify: remove SectionHeading + `.stack-meta`; delete dead `front`/`metaTech`/`paddedFront`/`paddedTotal`; add eyebrow; add `--row-tint-deep`; compute per-card `subtitle`; pass `stackCover`; update the stale setState-safety comment.
- `src/index.css` — modify: add cream bg to the EXISTING `.projects-stack-section` rule; add `.stack-eyebrow` block; delete `.stack-meta` block.
- `src/i18n/locales/en.json` + `pt.json` — modify: retire `sections.projects.title`/`.description`; set `index`/`label` for the eyebrow; shorten `stack.viewProject` to `view`/`ver` (arrow is a separate glyph).

### Interfaces
- Consumes: `accentFor`, `accentDeepFor` (`src/utils/palette.ts`); `segmentFor`, `settleFrac` (`src/utils/stackMotion.ts`).
- Produces: the final `StackCardData` interface (repeated verbatim in T10) —
  ```ts
  export interface StackCardData {
    slug: string
    title: string
    subtitle: string   // "<year> · <top-2 tech lowercased>", front-card-scoped in the e2e
    art?: string
    alt: string
  }
  ```
  and `stageStyle = { '--row-tint': accentFor(frontIndex), '--row-tint-deep': accentDeepFor(frontIndex) }`; `cards: StackCardData[]` where each item is `{ slug, title, subtitle, art, alt }`, `subtitle = \`${p.year} · ${top2techLowercased}\``, `art = p.mockups?.stackCover`.

### Work
Frozen invariants stay byte-for-byte: `segCont` derivation, the `useMotionValueEvent` `frontIndex` guard, skip-links, `staticTitle`. Changes:

0) **`ProjectCardStack.tsx`** — extend the interface (T10 renders `subtitle`; adding it now keeps T9's `tsc -b` green). Final state:
```ts
export interface StackCardData {
  slug: string
  title: string
  subtitle: string
  art?: string
  alt: string
}
```
1) **`Projects.tsx`** — remove `import { SectionHeading }` and its JSX block.
2) Delete the `<p className="stack-meta">…</p>` element AND the now-dead locals it was the sole consumer of: `front`, `metaTech`, `paddedFront`, `paddedTotal` (all trip `noUnusedLocals` once the meta line is gone; `staticTitle` reads `cards[frontIndex]?.title`, NOT `front`). Final state of that region (between the `useMotionValueEvent` block and the `return`):
```tsx
  // Resting title tracks frontIndex: it is the accessible name and the whole RM
  // render, and must swap with the cards at the settle-midpoint.
  const staticTitle = cards[frontIndex]?.title ?? ''

  const stageStyle = {
    '--row-tint': accentFor(frontIndex),
    '--row-tint-deep': accentDeepFor(frontIndex),
  } as React.CSSProperties & Record<'--row-tint' | '--row-tint-deep', string>
```
3) Update the now-stale setState-safety comment above `useMotionValueEvent` (it cites the removed SectionHeading `whileInView` entrance). Replace that comment block with:
```tsx
  // Why this setState is safe (re-render-kills-entrance lesson): nothing above the
  // pinned stage runs a whileInView(once) stagger that this could freeze — the
  // eyebrow is a static element, and every card/title visual derives from the
  // single MotionValue `segCont`, never from React state. The guard below skips
  // setState when the index is unchanged, so a full segment scrolls through with
  // zero re-renders once frontIndex settles; this state feeds ONLY non-visual
  // attrs (the interactive <Link>, aria, --row-tint/--row-tint-deep, staticTitle),
  // so its frame-lag can never tear the card/title flight.
```
4) Add an eyebrow inside `.stack-inner`, above `<GooeyTitle>`:
```tsx
<p className="stack-eyebrow">
  <span className="stack-eyebrow-num">{t('sections.projects.index')}</span>
  <span aria-hidden="true"> · </span>
  {t('sections.projects.label')}
</p>
```
5) Extend the `cards` map with `subtitle` and swap art to `stackCover`:
```tsx
const cards: StackCardData[] = featured.map((p) => ({
  slug: p.slug,
  title: p.title[lang],
  subtitle: `${p.year} · ${p.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')}`,
  art: p.mockups?.stackCover,
  alt: `${p.title[lang]} preview`,
}))
```
6) Import `accentDeepFor` from `../../utils/palette` (alongside `accentFor`). The `<ProjectCardStack ... />` call is unchanged (still `cards`, `seg`, `interactiveIndex`, `reducedMotion`, `viewProjectLabel`).

CSS:
- EDIT the EXISTING rule at `src/index.css:1967` — do NOT append a duplicate selector: `.projects-stack-section { overflow: visible; }` → `.projects-stack-section { overflow: visible; background: var(--color-surface-light); }` (the whole 400svh section is cream).
- Add the eyebrow block, delete the `.stack-meta` + `.stack-meta .num` rules. The numeral is the SECTION index (not per-project), so it is pinned to the STATIC deep-pink accent, NOT `--row-tint-deep` (which stays the per-project on-light channel for Plan B/subtitle-accent uses):
```css
/* Whisper eyebrow — replaces the SectionHeading block on Projects only. */
.stack-eyebrow {
  margin: 0;
  color: var(--color-ink-on-light-muted);
  font-size: clamp(11px, 1.2vw, 13px);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.stack-eyebrow-num { color: var(--color-accent-pink-deep); }
```

i18n — `sections.projects` in both locales:
- `en.json`: `index` → `"01"`, `label` → `"selected work"`, `stack.viewProject` → `"view"`; DELETE `title` and `description` keys. Keep `stack.indexLabel`.
- `pt.json`: `index` → `"01"`, `label` → `"trabalhos selecionados"`, `stack.viewProject` → `"ver"`; DELETE `title` and `description`. Keep `stack.indexLabel`.
- Pill-copy safety: `grep -rn "view project\|ver projeto" tests/ src/` returned NO assertion on the old copy (only the i18n values + the prop plumbing) — confirmed safe to shorten. Re-run the grep and confirm zero test hits before editing.

### Acceptance check
- Test: `tests/e2e/stack-scrub.spec.ts` (T2) — the `.stack-card-link .stack-card-subtitle` plateau assertion (subtitle DATA comes from here; the front-scoped MARKUP from T10). Green requires T10 too.
- Run: `npx playwright test --workers=1 tests/e2e/stack-scrub.spec.ts`

### Verify before returning
- `~/.claude/bin/qa-run.sh t9-typecheck npx tsc -b` — clean (no `noUnusedLocals` from `front`/`metaTech`/etc.; i18n key removal breaks nothing — grep first: `grep -rn "projects.title\|projects.description\|view project\|ver projeto" src tests`).
- `~/.claude/bin/qa-run.sh t9-unit npx vitest run` — SectionHeading unit test still green (component survives; only Projects stops using it).

### Boundaries
- Out of scope: card RENDER internals + shadows (T10 — this task touches ONLY the `StackCardData` interface in that file). Do NOT delete the `SectionHeading` component or its unit test. Do NOT touch `segCont`, the `frontIndex` guard, or skip-links. Do NOT change other sections' i18n.

---

## T10 — ProjectCardStack Shadway cards + shadows
**Model: integrator-opus-high.** Taste-critical card styling; the subtitle must be uniquely scopable to the front card.

### Files
- `src/components/ui/ProjectCardStack.tsx` — modify: CardFace becomes Shadway body-row anatomy; boxShadow recalibrated for cream. (The `StackCardData` interface was ALREADY extended with `subtitle: string` in T9 — do NOT re-declare it; this task renders it.)
- `src/index.css` — modify: card block (lines ~2023–2074); container aspect-ratio; delete `.stack-card-bar`/`-cta` rules.

### Interfaces
- Consumes: `cardStyleAt` (frozen), `seg` MotionValue, `interactiveIndex`, `viewProjectLabel`, and the `StackCardData` shape extended by T9 (repeated verbatim so this task is self-contained):
  ```ts
  export interface StackCardData {
    slug: string
    title: string
    subtitle: string
    art?: string
    alt: string
  }
  ```
- Produces: DOM where the FRONT (interactive) card is the ONLY `<Link className="stack-card-link">`, containing `.stack-card-frame` (inset image) + `.stack-card-body` (`.stack-card-labels` → `.stack-card-name` + `.stack-card-subtitle`, and `.stack-card-pill`). Buried cards render the same frame+labels inside `.stack-card-inert` (self-identifying) but NO pill and `aria-hidden`. Therefore `.stack-card-link .stack-card-subtitle` matches exactly one node.

### Work
1) The `StackCardData` interface already carries `subtitle: string` (added in T9) — consume `card.subtitle`; do NOT re-add the field.
2) Rework `CardFace` inner to Shadway anatomy. The interactive card wraps frame+body in the `<Link>`; buried cards wrap the same frame+body (minus pill) in the inert `<div aria-hidden tabIndex={-1}>`:
```tsx
function CardFace({ card, interactive, eager, viewProjectLabel }: {
  card: StackCardData; interactive: boolean; eager: boolean; viewProjectLabel: string
}): React.ReactElement {
  const body = (
    <>
      <span className="stack-card-frame"><CardArt card={card} eager={eager} /></span>
      <span className="stack-card-body">
        <span className="stack-card-labels">
          <span className="stack-card-name">{card.title}</span>
          <span className="stack-card-subtitle">{card.subtitle}</span>
        </span>
        {interactive && (
          <span className="stack-card-pill">
            {viewProjectLabel}
            <span className="stack-card-arrow" aria-hidden="true">↗</span>
          </span>
        )}
      </span>
    </>
  )
  return interactive ? (
    <Link className="stack-card-link" to={`/projects/${card.slug}`} aria-label={card.title}>{body}</Link>
  ) : (
    <div className="stack-card-inert" aria-hidden="true" tabIndex={-1}>{body}</div>
  )
}
```
3) `CardArt` — keep, but the inset image is now 1024×608; set `width={1024} height={608}`. (Fallback `.stack-card-fallback` span stays for missing art.)
4) boxShadow useTransform — recalibrate for cream (softer, larger radius, lower alpha, ink-toned; dark shadows read heavier on light ground):
```tsx
const boxShadow = useTransform(seg, (s) => {
  const sh = cardStyleAt(index - s).shadow
  return `0 ${(24 * sh).toFixed(1)}px ${(64 * sh).toFixed(1)}px rgba(11,14,20,${(0.14 * sh).toFixed(3)})`
})
```
(The RM `StaticCardSlot` needs no shadow change — it uses `depthTransform` for geometry only.)

CSS — replace the card block:
```css
.stack-cards {
  position: relative;
  width: min(46vw, 620px);
  aspect-ratio: 620 / 448;     /* Shadway card is taller than image-only; drives EXIT_Y=520 (T5) */
}
.stack-card {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  border: 1px solid var(--color-hairline-on-light);
  background: #FFFFFF;
  padding: 12px;
  overflow: hidden;
}
.stack-card--buried { pointer-events: none; }
.stack-card-link,
.stack-card-inert {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 10px;
}
.stack-card-link { text-decoration: none; }
.stack-card-link:focus-visible { outline: 2px solid var(--color-ink-on-light); outline-offset: 3px; }
.stack-card-frame {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9.5;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface-light-tonal);
  flex: none;
}
.stack-card-frame img,
.stack-card-fallback { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.stack-card-fallback { background: linear-gradient(145deg, var(--color-surface-light-tonal), var(--color-surface-light)); }
.stack-card-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 4px;
  min-height: 0;
}
.stack-card-labels { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.stack-card-name {
  font-size: clamp(14px, 1.4vw, 16px);
  font-weight: 700;
  color: var(--color-ink-on-light);
  text-transform: lowercase;
  letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stack-card-subtitle {
  font-size: 13px;
  color: var(--color-ink-on-light-muted);
  text-transform: lowercase;
  font-variant-numeric: tabular-nums;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.stack-card-pill {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 999px;
  background: var(--color-ink-on-light);
  color: var(--color-surface-light);
  font-size: 13px;
  text-transform: lowercase;
  white-space: nowrap;
}
.stack-card-arrow {
  color: var(--row-tint);   /* raw tricolor on the ink pill — passes AA all three (audit row 9) */
  transition: transform var(--dur-hover-in, 0.2s) var(--ease-house);
}
.stack-card-link:hover .stack-card-arrow,
.stack-card-link:focus-visible .stack-card-arrow { transform: translate(3px, -3px); }
```
DELETE the old `.stack-card-bar` and `.stack-card-cta` rules (lines ~2048–2068) and the old `.stack-card img` / `.stack-card-link,.stack-card-inert { position:absolute; inset:0 }` / `.stack-card { background: var(--bg-tonal) }` rules they replace. Keep the reduced-motion media block; add `.stack-card-arrow { transition: none }` is already there.

Mobile (`@media (max-width: 768px)`): keep `.stack-cards { width: 88vw; }` — the aspect-ratio scales the card; fixed 12px paddings are acceptable drift (note for T14 visual check).

### Acceptance check
- Test: `tests/e2e/stack-scrub.spec.ts` (T2) — `.stack-card-link .stack-card-subtitle` plateau swap; single `.stack-card-link`; `.gooey-title-sr` title swap. Plus `tests/e2e/stack-reduced-motion.spec.ts` (RM static geometry, still uses `.stack-card-link` boundingBox).
- Run: `npx playwright test --workers=1 tests/e2e/stack-scrub.spec.ts tests/e2e/stack-reduced-motion.spec.ts`
- You make them pass. You never edit them.

### Verify before returning
- `~/.claude/bin/qa-run.sh t10-e2e npx playwright test --workers=1 tests/e2e/stack-scrub.spec.ts tests/e2e/stack-reduced-motion.spec.ts` — green.
- `~/.claude/bin/qa-run.sh t10-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: `cardStyleAt`/`depthTransform` logic (frozen); the parent `ProjectCardStack` render loop (unchanged — still maps all cards keyed by slug, interactive = `interactiveIndex`). Do NOT reintroduce a `.stack-card-bar` or an image-overlay CTA.

---

## T11 — Hero stretch + entry veil
**Model: integrator-opus-high.** DOM restructure that re-anchors the scrim + name to a new inner 100svh zone; the AA table stays valid because the zone is byte-identical to the old `.hero` box.

### Files
- `src/components/sections/Hero.tsx` — modify: wrap scrim + `.hero-bottom` in `.hero-zone`; add `.hero-veil`.
- `src/index.css` — modify: `.hero` height; add `.hero-zone`, `.hero-veil`; re-anchor comments.

### Work
Intent: the hero section grows to ~130svh; the canvas covers the full section; the scrim + name/role live in an inner 100svh zone (visually identical at rest); a ~30svh transparent→cream veil band sits BELOW the zone with NO text in it. The rAF/pause/RM canvas machinery is untouched.

`Hero.tsx` JSX — the canvas stays a direct child of `.hero`; wrap the scrim + `.hero-bottom` in `.hero-zone`; add the veil as the last child:
```tsx
return (
  <section id="top" className="hero">
    <div className="hero-canvas">
      <FluidWaves variant="hero" />
    </div>
    <div className="hero-zone">
      <div className="hero-scrim" aria-hidden="true" />
      <div className={`hero-bottom${riseSettled ? ' is-entered' : ''}`}>
        {/* …role line + h1.hero-name UNCHANGED… */}
      </div>
    </div>
    <div className="hero-veil" aria-hidden="true" />
  </section>
)
```
(Keep every existing child of `.hero-bottom` exactly as-is — the role `AnimatePresence`, the `h1.hero-name` with both `.hero-line-mask` spans, all Framer props.)

`src/index.css` hero block:
```css
.hero {
  position: relative;
  min-height: 130svh;   /* was 100svh — grows for the entry veil band */
  overflow: hidden;
  background: var(--bg);
}
.hero-canvas { position: absolute; inset: 0; z-index: 0; opacity: 1; }  /* covers the FULL 130svh section */

/* Inner 100svh zone — re-anchors the scrim + name/role so the MANDATORY AA scrim
   band and the name never fall into the veil. Byte-identical to the old .hero box
   (100svh), so the hero AA table stays valid unchanged. */
.hero-zone { position: absolute; top: 0; left: 0; right: 0; height: 100svh; z-index: 2; }

/* Entry veil — always-there transparent→cream band over the canvas, below the
   zone. No text ever renders here. Its bottom = cream = the Selected Work bg,
   so hero→Projects has no hard edge. */
.hero-veil {
  position: absolute;
  left: 0; right: 0;
  top: 100svh;
  height: 30svh;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(245,242,236,0) 0%, var(--color-surface-light) 100%);
}
```
`.hero-scrim` (inset:0) and `.hero-bottom` (bottom:72px etc.) rules are UNCHANGED — they now resolve against `.hero-zone` (100svh) instead of `.hero` (100svh), which is the same box. Update the two mobile overrides that reference the hero children (`.hero-bottom { left: 40px; right: 40px }` at line ~959, and the 20px one at ~991) — they still target `.hero-bottom`, so no change needed, but confirm they still apply (they do; `.hero-bottom` is still a descendant).

### Acceptance check
- Test: `tests/e2e/hero-veil.spec.ts` (T2) — hero > 100svh, `.hero-veil` exists, name inside `.hero-zone` and above the veil, veil band has no text.
- Plus the existing hero specs MUST stay green: `tests/e2e/hero-entrance.spec.ts` (name rise/settle, `.hero-role`, nav.is-visible), `tests/e2e/hero-shader.spec.ts`.
- Run: `npx playwright test --workers=1 tests/e2e/hero-veil.spec.ts tests/e2e/hero-entrance.spec.ts tests/e2e/hero-shader.spec.ts`

### Verify before returning
- `~/.claude/bin/qa-run.sh t11-e2e npx playwright test --workers=1 tests/e2e/hero-veil.spec.ts tests/e2e/hero-entrance.spec.ts tests/e2e/hero-shader.spec.ts` — green.
- `~/.claude/bin/qa-run.sh t11-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: hero content/scrim gradient values/loader internals (frozen — only the section grows and the zone/veil are added). Do NOT change the FluidWaves mount, the entrance gate wiring, or the scrim's alpha bands. The 100svh zone is inviolable.

---

## T12 — Provisional cream→ink exit veil below Projects
**Model: editor-sonnet-low.** Keeps the intermediate (Plan A) page free of a hard cream/ink edge; Plan B relocates it below Skills.

### Files
- `src/pages/Home.tsx` — modify: insert a veil div between `<Projects />` and `<Archive />`.
- `src/index.css` — modify: add `.chapter-exit-veil`.

### Work
`Home.tsx` — insert directly after `<Projects />` (line ~236):
```tsx
        <Projects />
        <div className="chapter-exit-veil" aria-hidden="true" />
        <Archive />
```
`src/index.css` — add (near the stack section block):
```css
/* Provisional cream→ink exit veil (Plan A) — sits below the cream Selected Work
   stage so the return to the dark sections has no hard edge. Plan B relocates
   this below Skills. Pure tone, no shader, no text. */
.chapter-exit-veil {
  height: 30svh;
  background: linear-gradient(to bottom, var(--color-surface-light) 0%, var(--bg) 100%);
}
```

### Acceptance check
- Covered by `tests/e2e/nav-on-light.spec.ts` (the Archive-scroll step lands past this veil) and visual (T14/T15). No dedicated unit test.

### Verify before returning
- `~/.claude/bin/qa-run.sh t12-typecheck npx tsc -b` — clean.
- Grep: `grep -n "chapter-exit-veil" src/pages/Home.tsx src/index.css`.

### Boundaries
- Out of scope: touching Archive or any section below. Do NOT relocate any existing markup.

---

## T13 — Nav-on-light IntersectionObserver
**Model: implementer-sonnet-medium.** Observer watches `#projects` (Plan A scope); Plan B extends the root margin to the whole chapter.

### Files
- `src/components/layout/Header.tsx` — modify: add an IntersectionObserver → `onLight` state → `nav--on-light` class.
- `src/index.css` — modify: add the `.nav--on-light` variant block.

### Work
`Header.tsx` — add an `onLight` state and observe `#projects`. **`#projects` is a lazy-mounted Suspense chunk (Home.tsx `lazy(() => import('../components/sections/Projects'))`), so it is NOT in the DOM at Header mount — a plain `document.getElementById('projects')` in a mount effect returns null and the nav NEVER flips.** Arm the IntersectionObserver exactly once, when `#projects` first appears, via a `MutationObserver` on `document.body`; if the element is already present (SPA re-mount / back-nav), arm immediately. Both observers are cleaned up. Use this exact implementation:
```tsx
const [onLight, setOnLight] = useState(false);
useEffect(() => {
  if (typeof IntersectionObserver === "undefined") return;
  let io: IntersectionObserver | null = null;
  let mo: MutationObserver | null = null;

  const arm = (el: Element): boolean => {
    if (io) return true;
    io = new IntersectionObserver(
      (entries) => setOnLight(entries.some((e) => e.isIntersecting)),
      // A 1% band (not a zero-height line) at the very top, where the fixed nav
      // sits: on-light while #projects crosses the nav, dark above and below.
      { rootMargin: "-8% 0px -91% 0px", threshold: 0 },
    );
    io.observe(el);
    return true;
  };

  const existing = document.getElementById("projects");
  if (existing) {
    arm(existing);
  } else {
    // #projects mounts later (lazy chunk). Arm on first appearance, then stop watching.
    mo = new MutationObserver(() => {
      const el = document.getElementById("projects");
      if (el && arm(el)) {
        mo?.disconnect();
        mo = null;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    io?.disconnect();
    mo?.disconnect();
  };
}, []);
```
Add `nav--on-light` to the header className:
```tsx
<header className={`nav${scrolled ? " is-scrolled" : ""}${visible ? " is-visible" : ""}${onLight ? " nav--on-light" : ""}`}>
```

`src/index.css` — add the on-light nav variant (ink text/hairlines/brand, light scrolled bg). Place after the existing `.nav-lang` rules (~line 248):
```css
/* On-light nav variant — toggled by IntersectionObserver over the cream chapter. */
.nav--on-light .nav-link { color: var(--color-ink-on-light-muted); }
.nav--on-light .nav-link:hover { color: var(--color-ink-on-light); }
.nav--on-light .nav-link::after { background: var(--color-accent-blue-deep); }
.nav--on-light .nav-mark { background: var(--color-ink-on-light); color: var(--color-surface-light); }
.nav--on-light .nav-mark__dot { background: var(--color-accent-blue-deep); }
.nav--on-light .nav-lang { color: var(--color-ink-on-light); }
.nav--on-light.is-scrolled {
  background: rgba(245, 242, 236, 0.85);
  border-bottom: 1px solid var(--color-hairline-on-light);
}
```

### Acceptance check
- Test: `tests/e2e/nav-on-light.spec.ts` (T2) — dark on hero, `nav--on-light` deep inside `#projects`, dark again in `#archive`.
- Run: `npx playwright test --workers=1 tests/e2e/nav-on-light.spec.ts`
- You make it pass. You never edit it.

### Verify before returning
- `~/.claude/bin/qa-run.sh t13-e2e npx playwright test --workers=1 tests/e2e/nav-on-light.spec.ts` — green.
- `~/.claude/bin/qa-run.sh t13-typecheck npx tsc -b` — clean.

### Boundaries
- Out of scope: EN/PT toggle logic, nav markup/structure, the whole-chapter root margin (Plan B). Observe ONLY `#projects`.

---

## T14 — Real-Safari 2-line Anton visual check
**Model: codex-computer-use (gpt-5.6-sol)** via the `codex-computer-use` skill. Real WebKit is the only place the multi-line `filter:url()` risk shows; Playwright can't drive real Safari.

### Files
- none (verification only; captures screenshots to `tests/e2e/_screens/` or a scratch dir).

### Work
Drive real Safari (26.x) against `npx vite preview --port 4173` (build first; kill 4173 first):
1) Scroll into the Selected Work stage; land on the plateau for "painel da reconstrução" (the 2-line worst case) at 1280px width and 390px width.
2) Capture the title mid-morph AND settled at both widths (explicit screenshot timeout).
3) Verdict: the threshold-filtered Anton title morphs SMOOTHLY with no glyph-edge artifacts, no blob-merge between adjacent glyphs, and correct vertical centering of a 1-line title morphing against the 2-line title. Confirm the cards, eyebrow, and cream stage render as intended.
4) If blobbing appears: report the exact symptom so T8 adjusts within the sanctioned bounds — raise the threshold offset (`-150` → `-160`/`-170`) and/or the `morphBlur` cap (`180` within `[100,240]`), or flip `thresholdFilter` off as the degrade path; re-verify. Report the final threshold + blur-cap values so T8 records them.

### Verify before returning
- Proof-of-run: `~/.claude/bin/codex-run.sh light-chapter-safari …` registry line + readable report with screenshots; a verdict (SMOOTH / needs-tune with the specific artifact).

### Boundaries
- Out of scope: code edits (report only; T8 owns any threshold change). If Safari is unavailable in the lane, return `blocked: real Safari unavailable`.

---

## T15 — Final verification (unit, e2e, tsc, Lighthouse)
**Model: verifier-sonnet-low.** The completion gate; re-measures every baseline. Returns raw evidence; fixes nothing.

### Files
- none (read-only run).

### Work
- [ ] **Step 1: typecheck** — `npx tsc -b` → clean.
- [ ] **Step 2: unit** — `npm run test:unit` → expect **99 passed** (95 prior + 4 new `palette.test.ts` cases: 1 `accentFor` + 3 `accentDeepFor`; `stackMotion.test.ts` case count unchanged — its blur cases went to bounds form, not more cases). If the count differs, report.
- [ ] **Step 3: serial e2e** — `lsof -ti:4173 | xargs kill 2>/dev/null; npx playwright test --workers=1` → **50 passed / 0 failed / 0 skipped** (baseline 48 − 2 `section-enters` [`#projects` dropped ×2 projects] + 2 `hero-veil` + 2 `nav-on-light`; `reduced-motion` rescoped, count unchanged), including the migrated `stack-scrub` subtitle assertion and the two GREEN-rescoped specs.
- [ ] **Step 4: Lighthouse** — `lsof -ti:4173 | xargs kill 2>/dev/null; npx vite preview --port 4173` (fresh build), then Lighthouse desktop perf on `/` → **≥ 89** (baseline 94; a score below 89 with Anton loaded is a defect, per the standing budget rule — flag it, don't wave it through).
- [ ] **Step 5: long-task** — confirm `tests/e2e/perf-budget.spec.ts` green (< 300 ms; the canvas grew ~30% to 130svh coverage — if it reds under load, re-run idle before believing it).
- [ ] **Step 6: TODO map** — map each Plan-A spec `## TODO` box to its green acceptance evidence (table below). Report any un-mapped box.

### Verify before returning
- `~/.claude/bin/qa-run.sh final-unit npm run test:unit`
- `~/.claude/bin/qa-run.sh final-e2e npx playwright test --workers=1`
- `~/.claude/bin/qa-run.sh final-tsc npx tsc -b`
- Lighthouse evidence captured (score + report path).

### Boundaries
- Out of scope: fixing failures (report them with exact failing output; the controller routes fixes). Never claim "done" — return evidence.

---

## Spec TODO → task mapping (Plan A)

| Spec TODO (Plan A) | Task(s) |
|---|---|
| Hero stretches ~130svh via inner 100svh zone; scrim+name re-anchored & identical; canvas full section; transparent→cream veil below zone; no text in band; hero e2e green | T11 (+ T2 authors `hero-veil.spec.ts`) |
| Selected Work on `--color-surface-light` cream with whisper eyebrow (`01 · selected work`, deep-pink STATIC numeral) and NO SectionHeading | T9 (+ T3 tokens) |
| Gooey title Anton `clamp(56px,9vw,150px)` ink; threshold AND blur re-tuned; mixed 1-/2-line align; 2-line wrap verified 1280/390; real-Safari check | T7 (font) + T8 (restyle + threshold `-150` + blur cap `[100,240]`) + T14 (Safari) |
| Cards Shadway anatomy: white surface, inset plain `stackCover` (no chrome), name + `year · tech` subtitle + ink `view ↗` pill in the single front `<Link>`; meta line gone; subtitle scopable via `.stack-card-link .stack-card-subtitle` | T10 (render + `StackCardData` interface from T9, T6 assets) |
| Stack geometry re-derived (slots/EXIT_Y/shadows); clearance holds; parked opacity 0 | T5 (EXIT_Y) + T10 (shadows) |
| Single-channel invariant intact (segCont; inspection + tear-guard e2e green) | Preserved across T9/T10; gated by T2 `stack-scrub` + T15 |
| Nav flips `.nav--on-light` over cream and back to dark | T13 (MutationObserver-armed IO; + T2 `nav-on-light.spec.ts`) |
| Provisional cream→ink exit veil below Projects — no hard edge | T12 |
| On-light tokens (incl. `--row-tint`/`--row-tint-deep`); contrast table recomputed ≥4.5 (≥3.0 large); deep pink/blue ratified; yellow small-text exemption; neutral scrollbar | T3 (tokens/scrollbar) + T4 (`accentDeepFor`) + this plan's contrast table + T9 wiring |
| `stackCover` webp for 4 featured; Lighthouse ≥ 89 with Anton | T6 (assets) + T15 (Lighthouse) |
| e2e updated: plateau→card subtitle/aria; veil + nav-flip specs added; two shipped `.section-title` specs rescoped off `#projects`; full serial green; unit green; `tsc -b` clean | T2 (authors RED + GREEN rescopes) + T15 (verifies 50 e2e / 99 unit) |

## Self-review (re-run after the pre-execution fix wave)
- **Every Plan-A TODO maps to ≥1 task** — table above; no orphan TODO. The spec's "threshold AND blur re-tuned" is now genuinely covered (T8 tunes both the SVG threshold and the `morphBlur` cap, with matching bounds-form unit assertions in T2).
- **Placeholder scan** — no "TBD"/"similar to"/"…"-as-code; every code block is complete. Two runtime unknowns, both with explicit `blocked:` fallbacks: T7 font URLs (Google serves them at fetch time) and the T8 `BLUR_CAP`/threshold final values (bounded, T14-finalized, recorded in a checkbox).
- **Nav observer is executable** — T13 ships ONE concrete implementation (MutationObserver on `document.body` arms the IntersectionObserver on `#projects`'s first appearance; immediate-arm fast path for SPA re-mount; both cleaned up). No "implement whatever is cleanest" language remains.
- **tsc-safety across task boundaries** — `StackCardData.subtitle` is added in T9 (interface) before T9 constructs `cards` with it; T9 deletes `front`/`metaTech`/`paddedFront`/`paddedTotal` so `noUnusedLocals` stays clean; T10 consumes (does not re-declare) the interface. The two shipped `.section-title` specs are rescoped in T2 so T9's SectionHeading removal breaks nothing.
- **Type/name consistency** — verified identical across tasks: `stackCover` (type field + data + asset filename `stack-cover.webp`), `subtitle` (StackCardData in T9 == T10 == the e2e selector `.stack-card-link .stack-card-subtitle`), `accentDeepFor`/`ACCENTS_DEEP`, `BLUR_CAP` (T8 impl == T2 bounds `[100,240]`), `--row-tint`/`--row-tint-deep`, `--color-surface-light`/`--color-surface-light-tonal`/`--color-ink-on-light`/`--color-ink-on-light-muted`/`--color-ink-on-light-faded`/`--color-hairline-on-light`/`--color-accent-pink-deep`/`--color-accent-blue-deep`/`--color-accent-yellow-deep`, `.hero-zone`/`.hero-veil`, `.chapter-exit-veil`, `.stack-eyebrow`/`.stack-eyebrow-num`, `.stack-card-frame`/`.stack-card-body`/`.stack-card-labels`/`.stack-card-name`/`.stack-card-subtitle`/`.stack-card-pill`/`.stack-card-arrow`, `.nav--on-light` + `rootMargin: '-8% 0px -91% 0px'`, `EXIT_Y = 520`, viewProject copy `view`/`ver`.

## Decisions left open by the spec — for controller ratification
1. **Deep accent hexes:** deep pink `#B22B47` (5.64:1 cream / 6.31 white), deep blue `#2A54B5` (6.20 / 6.92). Both pass on cream, white card, and tonal cream, and stay recognizably pink/blue. (Spec said "audit-final".)
2. **Muted ink alpha = 0.62, not 0.55.** The spec's ~0.55 fails AA on the white card (4.29:1); 0.62 is the smallest step clearing 4.5 on white (5.42), cream (5.23), and tonal (5.11). Faded 0.40 kept as decorative/aria-hidden-only (below AA) — no always-visible Plan-A element uses it.
3. **Yellow-slot deep channel emits the ink-muted step** (`rgba(11,14,20,0.62)`), not a deep-yellow, since a 4.5:1 yellow on cream reads olive. Implemented deterministically in `accentDeepFor` (unit-tested). Deep-yellow token `#7A6800` defined for future large/decorative use only.
4. **Card box height 448px @ 620px cap** = `12(pad) + 354(frame @16:9.5) + 10(gap) + 60(body, flex:1) + 12(pad)` → `EXIT_Y = 520` (12 + 448 + 60 buffer). Slot offsets 12/−16/−44 and scales 1/.95/.9 KEPT (viewport-independent depth grammar); only EXIT_Y is card-height-coupled. Shadows recalibrated (24/64px, ink 0.14α) for cream.
5. **Eyebrow i18n:** repurposes `sections.projects.index`→`"01"` and `.label`→`"selected work"`/`"trabalhos selecionados"`; `.title`/`.description` keys DELETED (retired). If any surface still reads those keys, T9's pre-grep catches it.
6. **Anton delivered as two Google-subset woff2 (latin + latin-ext) via two `@font-face`**, not a locally-merged subset (no fonttools on this machine). Portuguese diacritics live in the latin range, so the latin subset alone renders every title; latin-ext is defensive. Preload targets the latin file only.
7. **Nav flip rule:** IntersectionObserver on `#projects` with `rootMargin: '-8% 0px -91% 0px'` (a 1% band under the fixed nav, not a zero-height line — resolves the codex degenerate-geometry flag while keeping the top-strip trigger). Armed via a `MutationObserver` on `document.body` because `#projects` is a lazy Suspense chunk absent at Header mount. Flips at cream-section entry/exit; Plan B widens the root margin to the whole chapter.
8. **Title `max-width: min(90vw, 18ch)`** is a starting value to force "painel da reconstrução" to 2 lines while keeping shorter titles mostly 1 line; T8 integrator + T14 Safari check finalize it. Threshold offset starts `-150` (range `[-150,-170]`); the `morphBlur` cap starts `180` (bounds `[100,240]`, T2 asserts in-range, not exact) — bigger Anton glyphs need more blur to fully dissolve at the crossfade extremes; T14 finalizes.
9. **Neutral scrollbar thumb `rgba(120,120,128,0.5)`** (hover 0.72) — one global value readable on both dark ends and the cream chapter. `theme-color` stays `#0B0E14` (ratified; Plan B may add a scroll-driven swap).
10. **Eyebrow numeral is STATIC deep pink** (`--color-accent-pink-deep`), NOT the per-project `--row-tint-deep` rotation — the eyebrow is the SECTION index, not per-project (spec: "deep-pink numeral"). `--row-tint-deep`/`accentDeepFor` remain the defined per-project on-light channel (spec's two-channel mandate); its only Plan-A text consumer is deferred to Plan B (the channel is set on the stage now so Plan B inherits it — an intentional forward-definition, not dead code).
11. **Pill copy shortened to `view`/`ver`** (spec anatomy `view ↗`); the `↗` is a separate `aria-hidden` glyph. Grep confirmed no test asserts the old `view project`/`ver projeto` copy — safe.
12. **Two shipped e2e specs rescoped in T2** (sanctioned, upstream-authored): `reduced-motion.spec.ts` repoints its `.section-title` opacity assertion `#projects`→`#archive`; `section-enters.spec.ts` drops `#projects` from its looped array. Net e2e count 48→**50** (per-project 24→25); unit 95→**99**. T15 asserts both.
