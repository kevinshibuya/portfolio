# Motion Consistency Pass — Design Spec

> **Date:** 2026-07-21
> **Branch:** `design/webgl-pivot` (folding into the in-flight intro polish)
> **Origin:** Full-project motion audit against the LottieFiles `motion-design` skill
> (installed globally 2026-07-21). The skill classifies editorial/portfolio work as the
> **Premium** archetype (350–600ms, one signature easing, 0% overshoot, low motion density).

## Context & Verdict

The audit found the motion system already strong: one signature ease
(`cubic-bezier(0.22,1,0.36,1)`, the "house" ease) carries ~80% of animations; reduced-motion
coverage is exhaustive; everything animates transform/opacity (GPU-safe); springs are tuned not
to bounce. This is a **refinement pass**, not a rescue.

Two owner decisions frame it (2026-07-21):
- **Pacing = "keep the grandeur"**: unify the scattered durations onto 3 tokens but do **not**
  speed up the reveals. Only fix true outliers. Hero rise stays 0.9s (protected, inviolable).
- **Hover = "smooth-snappy"**: enter `0.18s` / exit `0.22s`, house ease. Responsive but still lux.
- **stampIn = "restrained stamp"**: scale `1.15→1.06` (keep the blur).

## Non-Goals

- No change to the hero rise timing/feel (0.9s, protected), the loader bleed curve
  (`power2.out`, owner-tuned), the shader, or any reduced-motion variant.
- No new motion. No library changes. No refactor beyond routing existing values through tokens.

## Design

### §1 — Motion token layer (backbone)

Durations/eases are currently inlined at ~40 call sites. Introduce a single source of truth so
the palette is one edit, not forty.

- **CSS** (`src/index.css` `:root`, mirror the `@theme`/token block):
  ```
  --ease-house: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-quick: 0.18s;      /* hover/press/small state */
  --dur-standard: 0.6s;    /* section entrances */
  --dur-slow: 0.9s;        /* hero rise, dramatic reveals */
  --dur-hover-in: 0.18s;
  --dur-hover-out: 0.22s;
  ```
- **TS** (`src/utils/animations.ts`):
  ```
  export const DURATIONS = { quick: 0.18, standard: 0.6, slow: 0.9 } as const
  export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const
  ```
  Springs (`SPRINGS`) stay as-is. Only explicit-duration Framer values get tokenized.

**Acceptance:** grep shows no *new* hardcoded `cubic-bezier(0.22,1,0.36,1)` literals introduced;
the token vars exist and are consumed. Existing literals migrated where touched by other tasks.

### §2 — Tier 1: stagger budgets (skill CRITICAL: total stagger must stay < 500ms)

Measured overruns (Framer nested-container accumulation):
- **Skills** (`Skills.tsx`, nested Stagger): 6 columns × `skillsColumns 0.12` = 0.6s, then inside
  the last column 7 items × `skillsItems 0.06` → **last dot starts ~0.96s in**. ~2× over budget.
- **Projects** (9 cards × `projectCards 0.1`) → **9th at 0.8s**. Over budget.

Fix (`STAGGER_PRESETS` in `animations.ts`):
| preset | current | new | worst-case start |
|---|---|---|---|
| `skillsColumns` | 0.12 | **0.05** | 6 cols → 0.25s |
| `skillsItems` | 0.06 | **0.03** | +7 items → 0.25 + 0.18 = **0.43s** ✓ |
| `projectCards` | 0.1 | **0.05** | 9 cards → **0.4s** ✓ |
| `statValues` | 0.12 | 0.12 (keep) | 5 items → 0.48s ✓ |
| `workRows` | 0.1 | 0.1 (keep) | 5 rows → 0.4s ✓ |
| `embedRows` | 0.05 | 0.05 (keep) | Archive already caps delay at 0.4s ✓ |

**Acceptance:** worst-case stagger start (last child) < 0.5s for every section; Skills nested
total < 0.5s. Reduced-motion path (no stagger) unchanged.

### §3 — Tier 1: hover latency

All interactive hovers currently 0.25–0.4s. Route through the hover tokens:
- **Enter → `var(--dur-hover-in)` (0.18s)**, **exit → `var(--dur-hover-out)` (0.22s)**, **ease →
  `var(--ease-house)`** (replaces browser-default `ease`).
- **CSS asymmetry mechanics:** a plain CSS `transition` is symmetric. To get slower-exit, put the
  **exit** duration on the base rule and the **enter** duration on the `:hover`/`:focus-visible`
  rule — e.g. `.nav-link { transition: color var(--dur-hover-out) var(--ease-house) }` and
  `.nav-link:hover { transition-duration: var(--dur-hover-in) }`. Apply this split only to the
  prominent sites (nav, workrow, contact, btn). For minor pills/chips/dots, a single
  `var(--dur-hover-in)` symmetric transition is fine (avoid doubling ~17 declarations for
  imperceptible gain).
- **Multi-property transitions keep per-property durations** (e.g. `.contact-label` skews on one
  duration, colors on another) — tokenize each property's timing/ease independently; never collapse
  distinct per-property durations into one.
- **Carve-out:** the `.nav-link::after` underline is a *directional reveal* flourish, not a state
  toggle — it uses **`var(--dur-hover-out)` (0.22s)** + `var(--ease-house)` (migrating off its own
  `cubic-bezier(0.65,0,0.35,1)`), NOT the 0.18s enter, which reads abrupt on a left-to-right sweep.
- Sites: `.nav-link` color + `::after` underline (carve-out above), `.workrow-*` color/rotate,
  `.contact-row`, `.contact-label` skew, `.contact-meta`, `.contact-label-arrow`, `.pill`, `.chip`,
  `.archive-chip`, `.archive-dropdown-trigger`, `.skills-item`, `.skills-dot`, `.btn`, `.btn-arrow`,
  `.nav-lang`, `.footer-lang`, `.stats-row-link`.

**Acceptance:** every interactive hover transition ≤ 0.22s and uses `--ease-house`;
`rows-hover.spec.ts` still green (tint appears on hover; entrance completes when hovered
mid-stagger).

### §4 — Tier 2: easing unification

Every CSS `transition` uses `var(--ease-house)`. The nav underline sweep
(`cubic-bezier(0.65,0,0.35,1)`) migrates to house ease. No interactive element keeps browser
-default `ease`.

**Acceptance:** grep of `src/index.css` shows no `transition:` on an interactive/state element
without `var(--ease-house)` (ambient `@keyframes` like `loaderStandinDrift` are exempt — they are
`ease-in-out` loops by design).

### §5 — Tier 2: ArchiveDropdown exit + asymmetric exits

- **ArchiveDropdown** (`src/components/ui/ArchiveDropdown.tsx`): the option list currently
  unmounts instantly (conditional render, no exit). Wrap in `AnimatePresence`; open =
  collapse+fade `~0.18s` (`EASE_HOUSE`), close = `~0.14s`. Respect reduced motion (duration 0).
- **Exits shorter than enters** (skill: exit = 65–75% of enter):
  - `WorkRow.tsx` expand panel: keep enter `0.32s`, add explicit exit `~0.22s`.
  - `Hero.tsx` role-cycle `AnimatePresence`: enter `0.45s`, exit `~0.3s` (currently symmetric).

**Acceptance:** dropdown has a visible collapse on close (not instant); panel/role-cycle exits are
shorter than their enters; reduced-motion still instant.

### §6 — Tier 3: personality outliers (owner-approved magnitudes)

- **`stampIn`** (`animations.ts`; Stats + Contact headings): `scale 1.15 → 1.06`, blur kept.
- **MockupFrame mobile** (`src/components/projectDetail/MockupFrame.tsx`): ease
  `[0.34,1.56,0.64,1]` → `EASE_HOUSE` (removes the only overshoot/bounce; keeps -3°→0 tilt + y).

**Acceptance:** `stampIn` scale = 1.06; no overshoot cubic-bezier (a control-point y > 1 or < 0,
e.g. `[0.34,1.56,0.64,1]`) remains in the codebase. Note the house ease `[0.22,1,0.36,1]` is not an
overshoot curve (both y-values = 1, no undershoot) and is expected to remain.

### §7 — Tier 4: nits

- `src/main.tsx`: fix the stale `"80%"` handoff comment to reflect the `0.6` (60%) literal.
- `src/components/projectDetail/ScrollCue.tsx`: arrow bob duration `1.6s → 2.0s` (elegance;
  still an active cue, not ambient-slow).

**Acceptance:** comment matches code; bob is 2.0s; reduced-motion still no bob.

## Guardrails

- **Reduced-motion variants are untouched.** `REDUCED_MOTION_VARIANT`, the loader reduced path,
  and every `prefersReducedMotion` branch keep their current behavior.
- **Protected:** hero rise 0.9s, loader bleed `power2.out`, the shader, the `house` CustomEase.
- **e2e that encodes contracts:** `loader`, `hero-entrance`, `perf-budget`, `rows-hover`,
  `section-enters`, `reduced-motion` — none hard-assert the durations changed here (verified: they
  assert behavior/visibility, not timing literals). Run them anyway.

## Verification

Real scripts (from `package.json`): `test:unit` = `vitest run`, `test:e2e` = `playwright test`,
`lint` = `eslint .`, `build` = `tsc -b && vite build`. There is **no** standalone `typecheck`
script — typecheck runs via `tsc -b` (the first half of `build`).

- **Typecheck:** `npx tsc -b` · **Lint:** `npm run lint` · **Unit:** `npm run test:unit` (62/62)
- **E2e:** `npm run test:e2e -- loader hero-entrance perf-budget rows-hover section-enters reduced-motion`
  (Playwright's own `webServer` rebuilds; kill any stray manual `vite preview` first).
- **Visual:** `npm run build` + `npx vite preview --port 4173` → pass on: section reveals (staggers
  feel tight, not laggy), hovers (snappy but smooth), dropdown close (collapses), Stats/Contact
  headings (restrained stamp), mobile mockup (no bounce). Optional computer-use screenshot pass.

## TODO (acceptance checklist — tick only when the criterion passes AND review approves)

- [x] §1 — Motion tokens exist (CSS vars + TS `DURATIONS`/`EASE_HOUSE`) and are consumed
- [x] §2 — Skills/Projects stagger worst-case start < 0.5s (presets updated)
- [x] §3 — All interactive hovers ≤ 0.22s on `--ease-house`; `rows-hover` green
- [x] §4 — Every interactive CSS transition uses `--ease-house` (no default `ease`)
- [x] §5 — ArchiveDropdown collapses on close; panel/role-cycle exits < enters
- [x] §6 — `stampIn` scale 1.06; mockup mobile on house ease (no overshoot)
- [x] §7 — Loader comment fixed; ScrollCue bob 2.0s
- [x] Verify — typecheck + lint + unit + named e2e all green; visual preview pass
