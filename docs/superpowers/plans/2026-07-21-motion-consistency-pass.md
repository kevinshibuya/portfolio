# Motion Consistency Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline execution — Kevin has NOT requested subagent-driven development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the portfolio's scattered motion values through a token layer, fix the two stagger budgets that break the motion-design skill's 500ms ceiling, tighten hovers, unify easing, and dial back two personality outliers — without altering the protected intro or any reduced-motion path.

**Architecture:** Introduce a single motion-token source of truth (CSS custom properties + TS constants), then migrate call sites onto it. Behaviour changes are limited to: stagger delays (down), hover durations (down, with slower exits), one dropdown exit (added), and two Framer motion-values (stampIn scale, mockup ease).

**Tech Stack:** React 19 + TypeScript, Vite, TailwindCSS v4 (`@theme`/`:root` CSS vars — no config file), Framer Motion v12, Vitest (unit), Playwright (e2e).

## Global Constraints

- **Signature ease is `cubic-bezier(0.22, 1, 0.36, 1)`** ("house") — the one curve for ~80% of motion. New/changed transitions use the `--ease-house` / `EASE_HOUSE` token, never a fresh literal.
- **Pacing = "keep the grandeur":** unify durations, do NOT speed up reveals. Duration palette: quick `0.18` / standard `0.6` / slow `0.9`. Hero rise stays `0.9s` (protected).
- **Hover = "smooth-snappy":** enter `0.18s` / exit `0.22s`.
- **Reduced-motion is untouched.** Every `prefersReducedMotion` branch, `REDUCED_MOTION_VARIANT`, and the loader reduced path keep current behaviour. Tokens must not leak into reduced paths.
- **Protected / do not touch:** hero rise timing, loader bleed (`power2.out`), the shader, the `house` CustomEase registration, the `.nav` scroll-reveal transition (line ~140, already house ease), all `#loader`/`.loader-standin` transitions.
- **Per CLAUDE.md:** any task editing JSX/CSS invokes `frontend-design:frontend-design` before editing. (Values here are already decided in the spec; use it to sanity-check feel, not to re-open decisions.)
- **No spaced em-dashes** (` — `) in any reader-facing copy touched; separators are `·`. (No copy changes expected in this plan.)
- Spec: `docs/superpowers/specs/2026-07-21-motion-consistency-pass-design.md`.

---

### Task 1: Motion token layer

**Files:**
- Modify: `src/index.css` (`:root` block, after the existing token vars ~line 48+)
- Modify: `src/utils/animations.ts` (add exports near top)

**Interfaces:**
- Produces (CSS): `--ease-house`, `--dur-quick`, `--dur-standard`, `--dur-slow`, `--dur-hover-in`, `--dur-hover-out` — consumed by Task 4/5/6.
- Produces (TS): `export const DURATIONS = { quick: 0.18, standard: 0.6, slow: 0.9 } as const`; `export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const` — consumed by Task 3.

- [x] **Step 1: Add CSS tokens.** In `src/index.css`, inside the existing `:root { ... }` block (the dark-ink token block starting ~line 48), add a motion sub-block:

```css
  /* Motion tokens (motion-consistency-pass, 2026-07-21). Signature = house ease. */
  --ease-house: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-quick: 0.18s;      /* small state changes */
  --dur-standard: 0.6s;    /* section entrances (grandeur kept) */
  --dur-slow: 0.9s;        /* hero rise / dramatic reveals */
  --dur-hover-in: 0.18s;
  --dur-hover-out: 0.22s;
```

- [x] **Step 2: Add TS tokens.** In `src/utils/animations.ts`, directly under the `import` line (before `SPRINGS`), add:

```ts
// Duration palette (seconds) + signature ease — the TS mirror of the CSS motion tokens.
export const DURATIONS = { quick: 0.18, standard: 0.6, slow: 0.9 } as const
export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const
```

- [x] **Step 3: Typecheck.** Run: `npx tsc -b` — Expected: exits 0, no errors (new exports are unused for now, which is fine — no `noUnusedLocals` on module exports).

- [x] **Step 4: Verify tokens present.** Run: `grep -c "\-\-ease-house\|EASE_HOUSE" src/index.css src/utils/animations.ts` — Expected: `src/index.css:1`, `src/utils/animations.ts:1`.

- [x] **Step 5: Commit.**

```bash
git add src/index.css src/utils/animations.ts
git commit -m "feat(motion): add motion token layer (durations + house ease)"
```

---

### Task 2: Stagger budgets under 500ms

**Files:**
- Modify: `src/utils/animations.ts` (`STAGGER_PRESETS`)
- Modify/Test: `tests/unit/animations.test.ts` (add a budget guard)

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged `STAGGER_PRESETS` shape (same keys), new values: `skillsColumns: 0.05`, `skillsItems: 0.03`, `projectCards: 0.05` (others unchanged).

Budget model (Framer nested containers accumulate): last-child start = `(childCount-1) * stagger`; nested = outer last-column start + inner last-item start. Section item counts are fixed in `src/data/*`: Skills 6 categories × 7 skills, Projects 9, Stats 5, WorkExperience 5.

- [ ] **Step 1: Write the failing test.** Append to `tests/unit/animations.test.ts`:

```ts
import { STAGGER_PRESETS } from '../../src/utils/animations'

describe('stagger budgets stay under the 500ms motion-design ceiling', () => {
  const CEIL = 0.5
  it('projects: 9 cards last-card start < 0.5s', () => {
    expect((9 - 1) * STAGGER_PRESETS.projectCards).toBeLessThan(CEIL)
  })
  it('stats: 5 values last start < 0.5s', () => {
    expect((5 - 1) * STAGGER_PRESETS.statValues).toBeLessThan(CEIL)
  })
  it('workExperience: 5 rows last start < 0.5s', () => {
    expect((5 - 1) * STAGGER_PRESETS.workRows).toBeLessThan(CEIL)
  })
  it('skills: nested 6 columns x 7 items last-dot start < 0.5s', () => {
    const lastColumnStart = (6 - 1) * STAGGER_PRESETS.skillsColumns
    const lastItemStart = (7 - 1) * STAGGER_PRESETS.skillsItems
    expect(lastColumnStart + lastItemStart).toBeLessThan(CEIL)
  })
})
```

- [ ] **Step 2: Run it — expect FAIL** (current values overflow). Run: `npx vitest run tests/unit/animations.test.ts` — Expected: the `skills` case FAILS (0.6 + 0.36 = 0.96 ≥ 0.5) and `projects` FAILS (0.8 ≥ 0.5).

- [ ] **Step 3: Update presets.** In `src/utils/animations.ts`, change `STAGGER_PRESETS`:

```ts
export const STAGGER_PRESETS = {
  workRows: 0.1,
  skillsColumns: 0.05,
  skillsItems: 0.03,
  projectCards: 0.05,
  embedRows: 0.05,
  statValues: 0.12,
} as const satisfies Record<string, number>
```

- [ ] **Step 4: Run it — expect PASS.** Run: `npx vitest run tests/unit/animations.test.ts` — Expected: all green (skills 0.25 + 0.18 = 0.43; projects 0.4).

- [ ] **Step 5: Commit.**

```bash
git add src/utils/animations.ts tests/unit/animations.test.ts
git commit -m "fix(motion): stagger budgets under 500ms (skills/projects) + guard test"
```

---

### Task 3: Framer motion-value refinements

**Files:**
- Modify: `src/utils/animations.ts` (`stampIn` scale)
- Modify: `src/components/projectDetail/MockupFrame.tsx` (mobile ease)
- Modify: `src/components/ui/WorkRow.tsx` (expand-panel exit)
- Modify: `src/components/sections/Hero.tsx` (role-cycle exit)

**Interfaces:**
- Consumes: `EASE_HOUSE` from Task 1.

- [ ] **Step 1: Restrain stampIn.** In `src/utils/animations.ts`, `VARIANTS.stampIn`, change the hidden scale `1.15` → `1.06` (keep blur):

```ts
  stampIn: {
    hidden:  { opacity: 0, scale: 1.06, filter: 'blur(2px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: SPRINGS.snappy },
  },
```

- [ ] **Step 2: Flatten mockup overshoot.** In `src/components/projectDetail/MockupFrame.tsx`, the mobile variant's `transition` ease `[0.34, 1.56, 0.64, 1]` → import and use `EASE_HOUSE`. Add `EASE_HOUSE` to the existing `from '../../utils/animations'` import, then replace the inline `ease: [0.34, 1.56, 0.64, 1]` with `ease: EASE_HOUSE`. Keep the `rotate: -3 → 0`, `y`, `opacity`, and `duration: 1.0`.

- [ ] **Step 3: Shorten WorkRow panel exit.** In `src/components/ui/WorkRow.tsx`, the expand-panel `AnimatePresence` child currently uses one `transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: EASE }}` for both enter and exit. Give the exit its own shorter duration by splitting the transition onto the `animate`/`exit` props:
  - enter (`animate`): `transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: EASE }}`
  - exit (`exit`): add `transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: EASE }}`

  (`EASE` is the local `[0.22,1,0.36,1]` const already in the file; leave it as-is.)

- [ ] **Step 4: Shorten Hero role-cycle exit.** In `src/components/sections/Hero.tsx`, the role-cycle `AnimatePresence` `motion` element uses `transition={{ duration: 0.45, ease: RISE_EASE }}`. Move the exit to a shorter duration: keep enter at `0.45`, set the `exit` variant's transition to `{ duration: 0.3, ease: RISE_EASE }`. Do NOT touch the rise (`entered`) logic, `RISE_EASE`, or the `0.9s` name-line rise.

- [ ] **Step 5: Typecheck + unit.** Run: `npx tsc -b && npx vitest run` — Expected: exits 0, 62+ tests pass (the Hero/WorkRow unit tests still green).

- [ ] **Step 6: Commit.**

```bash
git add src/utils/animations.ts src/components/projectDetail/MockupFrame.tsx src/components/ui/WorkRow.tsx src/components/sections/Hero.tsx
git commit -m "polish(motion): restrained stamp, flatten mockup overshoot, shorter panel/role exits"
```

---

### Task 4: CSS hover + easing unification

**Files:**
- Modify: `src/index.css` (interactive transition declarations — the full map below)

Route every interactive-element transition through the tokens. **Prominent** sites get asymmetric enter/exit (base rule = `--dur-hover-out`, `:hover`/`:focus-visible` rule = `transition-duration: var(--dur-hover-in)`). **Minor** sites get a single symmetric `var(--dur-hover-in)`. All use `var(--ease-house)`. Two **reveal flourishes** (nav underline, contact-label skew) use `--dur-hover-out` (0.22s) — snappy 0.18 reads abrupt on a directional sweep.

**Transformation map** (match by current declaration text; line numbers approximate and will drift as you edit):

| Selector | Current `transition:` | New `transition:` | Class |
|---|---|---|---|
| `.nav-link` (198) | `color 0.3s;` | `color var(--dur-hover-out) var(--ease-house);` + add `transition-duration: var(--dur-hover-in);` to the existing `.nav-link:hover` (208) | prominent |
| `.nav-link::after` (206) | `right 0.4s cubic-bezier(0.65,0,0.35,1);` | `right var(--dur-hover-out) var(--ease-house);` | flourish |
| `.nav-lang` (216) | `color 0.2s;` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.hero-role` (307) | `color 0.2s cubic-bezier(0.22,1,0.36,1);` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| link (449) | `text-decoration-color 0.3s cubic-bezier(0.22,1,0.36,1);` | `text-decoration-color var(--dur-hover-in) var(--ease-house);` | minor |
| `.btn` (468) | `all 0.35s cubic-bezier(0.22,1,0.36,1);` | `all var(--dur-hover-out) var(--ease-house);` + add new rule `.btn:hover { transition-duration: var(--dur-hover-in); }` | prominent |
| `.btn-arrow` (489) | `transform 0.3s;` | `transform var(--dur-hover-in) var(--ease-house);` | minor |
| `.pill` (563) | `all 0.25s;` | `all var(--dur-hover-in) var(--ease-house);` | minor |
| `.chip` (582) | `all 0.25s;` | `all var(--dur-hover-in) var(--ease-house);` | minor |
| `.skills-item` (709) | `all 0.25s;` | `all var(--dur-hover-in) var(--ease-house);` | minor |
| `.skills-dot` (720) | `all 0.25s;` | `all var(--dur-hover-in) var(--ease-house);` | minor |
| `.contact-row` (800) | `all 0.35s cubic-bezier(0.22,1,0.36,1);` | `all var(--dur-hover-out) var(--ease-house);` + add `transition-duration: var(--dur-hover-in);` to the `.contact-row:hover` rule (create if absent) | prominent |
| `.contact-label` (827-829) | `transform 0.4s cubic-bezier(0.22,1,0.36,1), color 0.3s;` | `transform var(--dur-hover-out) var(--ease-house), color var(--dur-hover-in) var(--ease-house);` | flourish |
| `.contact-label-arrow` (839) | `opacity 0.3s;` | `opacity var(--dur-hover-in) var(--ease-house);` | minor |
| `.contact-meta` (849) | `all 0.3s;` | `all var(--dur-hover-in) var(--ease-house);` | minor |
| `.footer-lang` (905) | `color 0.3s;` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.stats-row-link` (1050-1051) | `border-bottom-color 0.2s cubic-bezier(...), color 0.2s cubic-bezier(...);` | `border-bottom-color var(--dur-hover-in) var(--ease-house), color var(--dur-hover-in) var(--ease-house);` | minor |
| `.archive-dropdown-trigger` (1107) | `border-color 0.2s, background 0.2s;` | `border-color var(--dur-hover-in) var(--ease-house), background var(--dur-hover-in) var(--ease-house);` | minor |
| (1157) | `border-color 0.2s;` | `border-color var(--dur-hover-in) var(--ease-house);` | minor |
| `.archive-chip` (1178) | `background 0.2s, border-color 0.2s, color 0.2s;` | each property → `var(--dur-hover-in) var(--ease-house)` | minor |
| `.project-detail-back` (1260) | `color 0.2s;` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.workrow-index` (1783) | `color 0.3s cubic-bezier(0.22,1,0.36,1);` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.workrow-title` (1792) | `color 0.3s cubic-bezier(0.22,1,0.36,1);` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.workrow-ornament` (1813) | `color 0.3s cubic-bezier(0.22,1,0.36,1);` | `color var(--dur-hover-in) var(--ease-house);` | minor |
| `.workrow-arrow` (1822-1824) | `color 0.3s cubic-bezier(...), transform 0.3s cubic-bezier(...);` | `color var(--dur-hover-in) var(--ease-house), transform var(--dur-hover-in) var(--ease-house);` | minor |

**Do NOT touch:** `.nav` container transition (~140), `.loader-standin` (385), `#loader` (419/436), `.loader-standin` reduced (438) — these are reveal/loader/ambient, out of scope.

- [ ] **Step 1: Apply the map.** Edit each row above in `src/index.css`. For prominent sites, add the `:hover` `transition-duration` override.
- [ ] **Step 2: No stray default `ease` on interactive transitions.** Run: `grep -nE "transition:" src/index.css | grep -vE "ease-house|loader|#loader|standin|\.nav \{|140:"` and eyeball — Expected: only the exempt loader/nav-container lines remain without `--ease-house`.
- [ ] **Step 3: No new house-ease literals introduced.** Run: `grep -c "cubic-bezier(0.22, 1, 0.36, 1)" src/index.css` — Expected: count DROPPED from baseline (the interactive ones migrated to `var(--ease-house)`; only non-transition uses, if any, remain).
- [ ] **Step 4: Typecheck/build sanity.** Run: `npx tsc -b` — Expected: exits 0 (CSS isn't typechecked, but confirms nothing else broke).
- [ ] **Step 5: e2e hover contract.** Run: `npm run test:e2e -- rows-hover` — Expected: green (rows tint on hover; entrance completes when hovered mid-stagger).
- [ ] **Step 6: Commit.**

```bash
git add src/index.css
git commit -m "polish(motion): unify hovers on tokens (0.18/0.22 house ease) across all interactive elements"
```

---

### Task 5: ArchiveDropdown exit animation

**Files:**
- Modify: `src/components/ui/ArchiveDropdown.tsx`

**Interfaces:**
- Consumes: Framer `AnimatePresence`/`motion` (already a project dependency); `useReducedMotion` (check existing import in the file).

- [ ] **Step 1: Invoke frontend-design** (per CLAUDE.md) to confirm the collapse feel, then implement. The option list currently renders conditionally (`{open && <ul>…</ul>}`) with no exit. Wrap it:
  - Import `AnimatePresence, motion` from `framer-motion` and (if not present) `useReducedMotion`.
  - Replace the `<ul className="archive-dropdown-list">` with `<motion.ul>` inside `<AnimatePresence>`, keyed, with:
    - `initial={{ height: 0, opacity: 0 }}`
    - `animate={{ height: 'auto', opacity: 1 }}`
    - `exit={{ height: 0, opacity: 0 }}`
    - `transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}` on enter; give `exit` a `transition` of `duration: prefersReducedMotion ? 0 : 0.14`.
    - `style={{ overflow: 'hidden' }}` so the height collapse clips cleanly.

- [ ] **Step 2: Typecheck.** Run: `npx tsc -b` — Expected: exits 0.
- [ ] **Step 3: Visual check.** In the running preview, open the Archive editorial dropdown and close it — Expected: it collapses+fades over ~0.14s instead of vanishing instantly. Reduced-motion: instant.
- [ ] **Step 4: e2e regression.** Run: `npm run test:e2e -- section-enters reduced-motion` — Expected: green.
- [ ] **Step 5: Commit.**

```bash
git add src/components/ui/ArchiveDropdown.tsx
git commit -m "polish(motion): ArchiveDropdown collapses on close instead of popping out"
```

---

### Task 6: Nits (loader comment + ScrollCue bob)

**Files:**
- Modify: `src/main.tsx` (stale comment)
- Modify: `src/components/projectDetail/ScrollCue.tsx` (bob duration)

- [ ] **Step 1: Fix the loader handoff comment.** In `src/main.tsx`, find the comment near the `handoff` `setTimeout` that says the handoff fires at "~80%" and correct it to "~60%" to match the `BLEED_TOTAL * 0.6` literal. (Comment only — do NOT change the `0.6` factor.)
- [ ] **Step 2: Slow the ScrollCue bob.** In `src/components/projectDetail/ScrollCue.tsx`, the arrow bob `transition` `duration: 1.6` → `2.0` (keep `ease: 'easeInOut'`, `repeat: Infinity`, and the reduced-motion `{ y: 0 }` gate).
- [ ] **Step 3: Typecheck.** Run: `npx tsc -b` — Expected: exits 0.
- [ ] **Step 4: Verify.** Run: `grep -n "60%\|0.6" src/main.tsx | head` and `grep -n "2.0\|duration: 2" src/components/projectDetail/ScrollCue.tsx` — Expected: comment reads 60%, bob is 2.0.
- [ ] **Step 5: Commit.**

```bash
git add src/main.tsx src/components/projectDetail/ScrollCue.tsx
git commit -m "chore(motion): fix stale loader handoff comment, slow ScrollCue bob to 2.0s"
```

---

### Task 7: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Typecheck.** Run: `npx tsc -b` — Expected: exits 0.
- [ ] **Step 2: Lint.** Run: `npm run lint` — Expected: 0 errors.
- [ ] **Step 3: Unit.** Run: `npx vitest run` — Expected: all pass (62 baseline + new stagger-budget cases).
- [ ] **Step 4: e2e (kill any stray `vite preview` first).** Run: `pkill -f "vite preview" 2>/dev/null; npm run test:e2e -- loader hero-entrance perf-budget rows-hover section-enters reduced-motion` — Expected: all green.
- [ ] **Step 5: Visual pass.** Run: `pkill -f "vite preview"; rm -rf dist; npm run build && npx vite preview --port 4173`, then confirm: section reveals land tight (no laggy tail on Skills/Projects), hovers snappy-but-smooth, Archive dropdown collapses on close, Stats/Contact headings do a restrained stamp (not a punch), mobile mockup settles with no bounce, intro/hero rise unchanged. Optional: computer-use screenshot pass via the codex-computer-use skill.
- [ ] **Step 6: Tick spec TODOs.** In the spec, tick §1–§7 + Verify as each acceptance criterion passes.
- [ ] **Step 7: Code review.** Invoke the review flow (fresh-context Opus, per CLAUDE.md) over the branch diff before finishing.

---

## Self-Review

**Spec coverage:** §1 tokens → Task 1. §2 stagger → Task 2. §3 hovers → Task 4. §4 easing unify → Task 4. §5 dropdown+asymmetric exits → Task 3 (exits) + Task 5 (dropdown). §6 stampIn+mockup → Task 3. §7 nits → Task 6. Verify → Task 7. All sections covered.

**Type consistency:** `EASE_HOUSE`/`DURATIONS` defined in Task 1, consumed in Task 3. CSS vars defined in Task 1, consumed in Tasks 4–5. `STAGGER_PRESETS` keys unchanged (Task 2). `EASE` (local in WorkRow) and `RISE_EASE` (local in Hero) are pre-existing and reused, not redefined.

**Placeholder scan:** every code step shows the exact edit; the CSS sweep is a complete declaration-level map. No TBD/TODO.
