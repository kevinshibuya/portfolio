# Designer-Grade WebGL Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **After each step's command lands successfully, Edit that step's `- [ ]` to `- [x]` in THIS file before proceeding to the next step. Do not batch ticks at the end.**

**Goal:** Rebuild the portfolio's visual system around dark ink + WebGL shader craft: fluid-waves hero (canvas #1), open typographic WorkRow sections, lining-waves Contact/Footer backdrop (canvas #2), with the ink-draw entrance replaced by a GSAP paint-bloom + clipped-rise entrance.

**Architecture:** One token flip makes the whole page dark (legacy CSS vars remapped to the ink system, new semantic tokens added alongside). The hero is rewritten around a raw-WebGL `FluidWavesHero` (adapted from vault `fluid-swirl`: spin removed, seeded scattered wave motion, no mouse). All list sections converge on one `WorkRow` primitive. Contact + Footer share a `LiningWavesBackdrop` (three.js) stage. Ink-draw components (`HeroNameDrawing`, `glyphPaths`, `FooterNameMarquee`, R3F accent) are deleted; the `entranceDone` / `curtainGone` / `loaderState` gating machinery in `MotionContext` + `useScrollLockDuringEntrance` survives and is re-driven by the new GSAP entrance.

**Tech Stack:** React 19 + TS strict, Vite 6, TailwindCSS v4 (`@theme` in `src/index.css`), Framer Motion v12 (hover/expand states), **GSAP (new dependency — one-shot entrance timeline)**, raw WebGL (hero), three.js (lining-waves; already a dep), react-i18next, Vitest + Playwright.

**Spec:** `docs/superpowers/specs/2026-07-19-webgl-pivot-design.md` (user-ratified — do NOT modify it; tick its TODOs only per checkbox discipline)

**Commands (this project):** build `npm run build` · unit `npm run test:unit` · e2e `npm run test:e2e` · lint `npm run lint` · preview `npm run build && npx vite preview --port 4173` (**NOT** `npm run preview`, which is wrangler; restart preview after every rebuild — stale sirv snapshots 404 hashed assets) · Lighthouse `npx lighthouse http://localhost:4173 --preset=desktop --quiet --chrome-flags="--headless=new" --output=json --output-path=tmp/lh.json`

---

## Global Constraints

- Dark ink system: page bg `#0B0E14`, tonal alt `#131722`, text cream `#F5F2EC`; the ONLY color is the shader tricolor: pink-red `#E64D66`, blue `#4D80E6`, yellow `#E6CC4D`.
- Max 2 canvases on the page: `FluidWavesHero` (hero) + `LiningWavesBackdrop` (Contact/Footer). No third canvas anywhere. The R3F accent is deleted.
- Both canvases: `devicePixelRatio` capped at **1.5**, `IntersectionObserver` pauses the rAF loop off-screen, `prefers-reduced-motion` renders one static frame (frozen time) and never starts the loop.
- Animation lanes (CLAUDE.md): GSAP = one-shot entrance orchestration ONLY; Framer Motion = hover/expand/enter-view states; never both on the same animation. `gsap.context()` scoping + cleanup in every GSAP `useEffect`.
- Entrance: paint bloom → role + name rise inside `overflow:hidden` masks, ~1.6 s total; reduced motion = static fade. The monumental name (HTML text) is the LCP element and must paint < 2.5 s on `npx vite preview`.
- Typography: Plus Jakarta Sans solo, unchanged. Lowercase display copy.
- Canonical title leads the hero role cycle: `senior front-end engineer · react/typescript` (EN) / `engenheiro front-end sênior · react/typescript` (PT). Do not drop the other cycle roles.
- Bilingual EN/PT: every changed/added string lands in `en.json` AND `pt.json` **in the same task** that changes it. Authored, not word-for-word.
- No spaced em-dashes (` — `) in reader-facing prose; use `·`.
- CV repo (`~/keki/cv-rebuild`) is the source of truth for personal facts; no new content authoring beyond restyling.
- No new routes; `/projects/:slug` keeps its structure; embeds CSV pipeline unchanged; no scroll-pinned sequences.
- Contrast: every text/background pair AA-verified (large-text ≥ 3.0, normal ≥ 4.5) — table below is the authority; use exactly these hex values.
- Every task ends green: typecheck (`npm run build` runs `tsc -b`) + focused tests. Tasks that touch canvas mounting / app shell also run a real-browser mount smoke (headless Playwright: page loads, root renders, zero console errors).
- Each task is independently committable. Commit at the end of every task (and mid-task where marked).

---

## Measured baseline (recorded 2026-07-19, plan-authoring time)

Recorded against `npm run build` + `npx vite preview --port 4173` on branch `design/webgl-pivot` @ `1b2ef41`.

**Lighthouse (desktop preset):**

| Category | Score |
|---|---|
| Performance | **98** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

Metrics: LCP **0.8 s** · FCP **0.8 s** · TBT **0 ms** · CLS **0**.

> **LCP element caveat (S1):** the baseline 0.8 s LCP element is the loader `ks` mark painted from `index.html`, NOT the hero name — a *different element* that this pivot deletes. So the baseline LCP number does not carry over as a post-pivot premise. The post-pivot LCP element is the hero name text, which reveals after the ~1250 ms curtain + entrance rise (see Task 4 timing math). The **in-task LCP gate in Task 4 Step 8** (< 2400 ms, name must be the LCP element) owns the budget — the baseline does not.

**Targets (achievable from this baseline):** Performance ≥ 90, Accessibility = 100, Best Practices = 100, SEO = 100, LCP < 2.5 s (Task 4's in-task gate holds the tighter < 2400 ms line). (Perf will drop from 98 — two shader canvases + GSAP; ≥ 90 is the pass bar, 98 is not.)

**Unit suite:** 13 files, **73/73 passed**.

**e2e suite (Playwright, desktop-chromium + mobile-chromium):** **16 failed / 19 passed / 1 skipped**. The 16 baseline failures are pre-existing stale specs (they assert surfaces already changed on main), fixed as one batch in Task 1:

| Failing spec | Why stale |
|---|---|
| `tests/e2e/shibuya-scramble.spec.ts` (3 tests × 2 projects) | Hero scramble no longer exists (`[data-hero-word]`, `.scramble` absent from DOM); `ScrambleText`/`useScramble` are dead code on this branch |
| `tests/e2e/reduced-motion.spec.ts:5` (× 2) | `[data-fragment="bars"]` loader fragment no longer exists |
| `tests/e2e/reduced-motion.spec.ts:17` (× 2) | scramble hover — same dead feature |
| `tests/e2e/hero-entrance.spec.ts:9` (× 2) | `.nav-avail-dot` removed from Header (open-to-work pill dropped) |
| `tests/e2e/section-enters.spec.ts` `#embeds` (× 2) | Section id is `#archive` since the Archive replaced EmbedsGallery |
| `tests/e2e/perf-budget.spec.ts:57` R3F-mobile (× 2) | Hero loads `HeroAccent3D` unconditionally after entrance (no mobile gate); the R3F accent is deleted in Task 4 anyway |

**Specs that will go stale under the pivot** (rewritten/deleted inside the task that changes their surface — named here so nothing surfaces mid-execution): `tests/e2e/hero-entrance.spec.ts` (Task 4 rewrite), `tests/e2e/bento-entrance-hover.spec.ts` (Task 6: bento deleted, replaced by row-hover guard), `tests/unit/Hero.test.tsx` + `tests/unit/HeroNameDrawing.test.tsx` + `tests/unit/seo/i18n-roles.test.ts` (Task 4), `tests/unit/FooterNameMarquee.test.tsx` (Task 10), `tests/unit/bundle-deps.test.ts` (Task 4 allowlist), `tests/unit/useScramble.test.ts` (Task 1 deletion). The jsdom `entranceDone`-pollution mocks (`vi.mock` of `HeroNameDrawing` in `Hero.test.tsx`) retire with the component; the new Hero test must NOT depend on un-resolved entrance state (module-scoped promise pollution — see memory note).

---

## Contrast audit (WCAG AA, computed at plan time — these values are final)

AA thresholds: normal text ≥ 4.5, large text (≥ 24 px, or ≥ 18.66 px bold) ≥ 3.0.

| Foreground | On `#0B0E14` (base) | On `#131722` (tonal) | Intended use | Verdict |
|---|---|---|---|---|
| cream `#F5F2EC` | **17.29** | **16.02** | body + display text | PASS both sizes |
| text-muted `#C9C4BA` | **11.12** | **10.30** | secondary text (old `--bark` slot) | PASS both sizes |
| text-faded `#A8A49C` | **7.78** | **7.21** | meta/faded text (old `--dust` slot) | PASS both sizes |
| pink-red `#E64D66` | **5.17** | **4.79** | title tints AND meta accents | PASS normal + large |
| blue `#4D80E6` | **5.10** | **4.73** | title tints AND meta accents, links | PASS normal + large |
| yellow `#E6CC4D` | **12.06** | **11.17** | title tints AND meta accents | PASS normal + large |
| blue-light `#7AA0ED` | **7.43** | **6.89** | hover states (old `--blue-300/500` slots) | PASS normal |
| ink `#0B0E14` on selection bg `#4D80E6` | **5.10** | — | `::selection` text | PASS normal |

**Hero-over-paint rows** (text sits on the shader; worst case is the yellow `#E6CC4D` paint region):

| Case | Effective bg | Ratio vs cream | Verdict |
|---|---|---|---|
| name/role over bottom scrim `rgba(11,14,20,0.88)` on yellow paint | `#25251B` | **13.83** | PASS |
| meta (faded `#A8A49C`) over bottom scrim on yellow | `#25251B` | **6.22** | PASS normal |
| meta/nav over top scrim `rgba(11,14,20,0.75)` on yellow | `#423E22` | **9.67** | PASS |
| cream directly on raw `#E64D66` paint (NO scrim) | — | 3.35 | large-only — **never place normal text on raw paint** |

Consequence (binding): the hero MUST render the `.hero-scrim` overlay (bottom band ≥ 0.88 alpha behind name+role, top band ≥ 0.75 alpha behind nav/meta) between canvas and text. No token adjustments required — all four spec colors pass AA as specced.

---

## Plan risks

1. **Perf regression budget:** baseline perf is 98 with LCP 0.8 s. Two live shaders + gsap will cost; the pass bar is ≥ 90 / LCP < 2.5 s (spec's number). If Task 12 measures < 90: first suspects are hero canvas DPR (already capped 1.5), lining-waves lazy boundary (must NOT load before scroll approach), and the entrance delaying the name paint (keep name rise start ≤ 0.6 s after curtain).
2. **Shader aesthetics are not statically verifiable.** Task 3 ships complete, working code producing scattered drifting paint (spin removed). Whether it reads as "organic scattered waves" to the owner is a taste call: Task 3 ends with a screenshot checkpoint for the orchestrator/owner. If it fails the eye test, escalate the motion design to `deep-reasoner-opus-xhigh` as a prototype loop (tune `FLOW_SPEED`, pre-warp amplitudes/frequencies) — do not silently iterate inside Task 3.
3. **Hero availability copy:** the spec mandates availability meta top-right, but the owner previously dropped the open-to-work pill (commit 5972e7b). Plan uses neutral copy (`open to new projects` / `aberto a novos projetos`). Flag to owner at Task 4 review; trivially editable.
4. **ProjectDetail pages inherit the dark flip via legacy-alias remap** (Task 2) without their own restyle pass (spec: case studies keep current structure). They will be functional and AA-safe (alias mapping preserves contrast pairs) but unpolished; Task 12 smoke-loads one detail route to confirm no invisible-text regressions. Owner deliverable for a later pass.
5. **Legacy CSS var aliases remain after this plan** (`--cream` meaning "page ink" is confusing). Accepted debt: aliases keep 2 100 lines of CSS coherent without a big-bang rewrite; sections migrated in Tasks 4–11 use the new semantic tokens; CLAUDE.md documents both. Cleanup is a future chore, not this plan.
6. **`pt.json` is missing `projectDetail.routesCount_one/_other`** (pre-existing). Out of scope; noted for the owner.

---

## Task → Model routing table

Proposal — the orchestrator re-judges difficulty at dispatch. UI/copy-facing tasks require taste ≥ 7 (sonnet-5 or opus-4.8 rungs only — never below).

| # | Task | Rung | Effort | Why this rung |
|---|---|---|---|---|
| 1 | Stale-baseline test batch fix + dead scramble deletion | editor-sonnet-low | low | Pure transcription: exact deletions + exact replacement snippets below |
| 2 | Dark ink token system + loader/theme-color | editor-sonnet-low | low | Every hex and selector fully specified; zero decisions |
| 3 | FluidWavesHero canvas component | implementer-sonnet-medium | medium | Complete code shipped in-plan, but WebGL runtime debugging + smoke needs local reasoning |
| 4 | Hero composition + GSAP entrance + ink-draw/R3F deletion | integrator-opus-high | high | Multi-file wiring (MotionContext gates, LCP, i18n, test rewrites) + entrance taste |
| 5 | WorkRow primitive | integrator-opus-high | high | One primitive feeds 3 sections; hover-float re-render trap; API shape judgment |
| 6 | Projects → WorkRow rows | implementer-sonnet-medium | medium | Well-specified few-file conversion against a finished primitive |
| 7 | Archive → WorkRow rows + dark filter restyle | implementer-sonnet-medium | medium | Same, plus filter UI restyle with specified tokens |
| 8 | WorkExperience → expandable WorkRow | implementer-sonnet-medium | medium | Same, expandable variant already built in Task 5 |
| 9 | Stats + Skills dark restyle | implementer-sonnet-medium | medium | CSS-dominant restyle, behavior untouched |
| 10 | Contact/Footer stage + LiningWavesBackdrop + marquee deletion | integrator-opus-high | high | Canvas #2 lazy boundary, stage layering, glyphPaths dependency unwind |
| 11 | Nav dark restyle | editor-sonnet-low | low | Exact CSS values below; zero decisions |
| 12 | CLAUDE.md Design Direction rewrite + final verification | implementer-sonnet-medium | medium | Doc authoring from this plan's tables + mechanical verification battery |

Sequencing: 1 → 2 → 3 → 4 → 5 → (6, 7, 8, 9 in any order) → 10 → 11 → 12. Nothing parallel — shared working tree.

---

## File structure

| File | Responsibility | Tasks |
|---|---|---|
| `tests/e2e/*` (5 specs edited, 1 deleted, 3 added) | e2e coverage of new surfaces | 1, 2, 3, 4, 6, 10 |
| `src/index.css` | tokens, scrim, WorkRow language, per-section restyles | 2, 4, 5, 6, 7, 8, 9, 10, 11 |
| `index.html` | loader curtain hexes, theme-color | 2 |
| `src/components/canvas/FluidWavesHero.tsx` (new) | canvas #1 | 3 |
| `src/components/canvas/LiningWavesBackdrop.tsx` (new) | canvas #2 | 10 |
| `src/components/canvas/HeroAccent3D.tsx`, `HeroAccentSilhouette.tsx` | DELETED | 4 |
| `src/components/sections/Hero.tsx` | monumental hero + entrance | 4 |
| `src/components/ui/HeroNameDrawing.tsx`, `src/data/glyphPaths.ts`, `scripts/extract-glyph-paths.mjs`, `src/components/ui/FooterNameMarquee.tsx` | DELETED (ink-draw family) | 4, 10 |
| `src/components/ui/ScrambleText.tsx`, `src/hooks/useScramble.ts` | DELETED (dead code) | 1 |
| `src/components/ui/WorkRow.tsx` (new) + `src/utils/palette.ts` (new) | row primitive + tricolor | 5 |
| `src/components/sections/{Projects,Archive,WorkExperience,Skills,Stats,Contact}.tsx` | conversions/restyles | 6, 7, 8, 9, 10 |
| `src/components/layout/{Header,Footer}.tsx`, `src/pages/Home.tsx` | nav restyle, footer rewrite, stage wiring | 10, 11 |
| `src/i18n/locales/{en,pt}.json` | copy changes per task | 4, (6–10 as needed) |
| `package.json` | +gsap; −@react-three/fiber, −@react-three/drei, −opentype.js | 4, 10 |
| `CLAUDE.md` | Design Direction rewrite | 12 |

---

### Task 1: Stale-baseline e2e batch fix + dead scramble deletion

**Spec TODO:** `- [ ] Full e2e suite green, including new mount smoke + reduced-motion specs; stale specs fixed as a pre-Task-1 batch` (this task delivers the "stale specs fixed as a batch" half; Task 12 delivers the "full suite green" half).

**Routing:** editor-sonnet-low · low

**Files:**
- Delete: `tests/e2e/shibuya-scramble.spec.ts`
- Delete: `src/components/ui/ScrambleText.tsx`, `src/hooks/useScramble.ts`, `tests/unit/useScramble.test.ts`
- Modify: `tests/e2e/reduced-motion.spec.ts`, `tests/e2e/hero-entrance.spec.ts`, `tests/e2e/section-enters.spec.ts`, `tests/e2e/perf-budget.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a fully green baseline (73 unit / all e2e passing) that every later task's "suite stays green" verify step relies on.

- [x] **Step 1: Delete the scramble e2e spec and the dead scramble code**

```bash
git rm tests/e2e/shibuya-scramble.spec.ts src/components/ui/ScrambleText.tsx src/hooks/useScramble.ts tests/unit/useScramble.test.ts
```

(Verified at plan time: nothing in `src/` imports `ScrambleText` or `useScramble` — this mirrors commit 7e5f0f8 from the parked branch.)

- [x] **Step 2: Trim `tests/e2e/reduced-motion.spec.ts` to the one still-valid test**

Delete the first two tests (`reduced motion: loader resolves quickly and hero is final-state` — asserts `[data-fragment="bars"]`, gone — and `reduced motion: shibuya hover does not scramble`). Keep the file as exactly:

```ts
import { test, expect } from '@playwright/test'

test.use({ contextOptions: { reducedMotion: 'reduce' } })

test('reduced motion: titles never scroll-fade', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy({ top: -50, behavior: 'instant' as ScrollBehavior }))
  await page.waitForTimeout(120)
  const op = await page.locator('#projects .section-title').first().evaluate((el) =>
    parseFloat(getComputedStyle(el as HTMLElement).opacity)
  )
  expect(op).toBeGreaterThan(0.99)
})
```

- [x] **Step 3: Fix the `.nav-avail-dot` assertion in `tests/e2e/hero-entrance.spec.ts`**

In the test `hero entrance completes within 4s and unlocks scroll`, replace:

```ts
  // After entrance, the nav availability dot is in the DOM (hidden via CSS
  // on viewports <= 720px, so we assert presence rather than visibility).
  await expect(page.locator('.nav-avail-dot')).toHaveCount(1)
```

with:

```ts
  // After entrance, the nav becomes visible/interactive.
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
```

- [x] **Step 4: Fix the section id list in `tests/e2e/section-enters.spec.ts`**

Replace the array `['#projects', '#embeds', '#work', '#skills', '#contact']` with `['#projects', '#archive', '#work', '#skills', '#contact']`.

- [x] **Step 5: Delete the mobile-R3F describe block in `tests/e2e/perf-budget.spec.ts`**

Delete the entire `test.describe('mobile viewport disables R3F accent', ...)` block (the R3F accent is deleted in Task 4; the test already fails at baseline because Hero loads the chunk unconditionally). Keep the CLS and long-task tests untouched.

**Acceptance check** (authored here, read-only to the implementer — the batch IS the fix, so the check is the full suites):
- Run: `npm run test:unit && npm run test:e2e`
- Expected: unit ALL passed (baseline 73 minus the deleted `useScramble.test.ts` tests — record the actual count in the tick), e2e **0 failed** (baseline had 16 failed; the removed/fixed tests account for all of them), skipped tests OK.

- [x] **Step 6: Run both suites, confirm zero failures** — unit 69 passed (73 baseline - 4 useScramble tests deleted); e2e 23 passed, 1 skipped, 0 failed

Run: `npm run test:unit && npm run test:e2e`
Expected: vitest all green; Playwright `0 failed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: batch-fix stale baseline e2e specs; delete dead scramble code"
```

**Verify before returning:** both suites green (Step 6 output pasted); `npm run lint` clean.

**Boundaries:** Do NOT touch `src/components/sections/*`, `src/index.css`, or any i18n file. Do not "improve" surviving tests. If any test still fails after these exact edits, return `blocked: <failing test + output>` — do not improvise fixes.

---

### Task 2: Dark ink token system

**Spec TODO:** `- [ ] Design tokens: dark ink system (#0B0E14 base, #131722 tonal, cream text, tricolor accents) replaces the light cream/sand theme; all components read from tokens`

**Routing:** editor-sonnet-low · low

**Files:**
- Modify: `src/index.css` (TOKENS section + `::selection` + the `.section--contact strong` block + one appended override block)
- Modify: `index.html` (loader inline CSS hexes + theme-color metas)
- Test: `tests/e2e/dark-tokens.spec.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS custom properties every later task styles against — new canonical names: `--bg`, `--bg-tonal`, `--text`, `--text-muted`, `--text-faded`, `--hairline`, `--accent-pink`, `--accent-blue`, `--accent-yellow` (and `@theme` twins `--color-bg`, `--color-bg-tonal`, `--color-text`, `--color-text-muted`, `--color-text-faded`, `--color-accent-pink`, `--color-accent-blue`, `--color-accent-yellow`). Legacy aliases (`--cream`, `--sand`, `--mist`, `--ink`, `--bark`, `--dust`, `--blue-*`, `--periwinkle-*`) are REMAPPED onto the dark system so all existing rules flip in one commit.

- [ ] **Step 1: Write the failing e2e smoke first**

Create `tests/e2e/dark-tokens.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('page renders on the dark ink system with zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')

  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const color = await page.evaluate(() => getComputedStyle(document.body).color)
  expect(bg).toBe('rgb(11, 14, 20)')      // #0B0E14
  expect(color).toBe('rgb(245, 242, 236)') // #F5F2EC
  expect(errors).toEqual([])
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx playwright test tests/e2e/dark-tokens.spec.ts --project=desktop-chromium`
Expected: FAIL — body is `rgb(246, 249, 252)` (light cream).

- [ ] **Step 3: Replace the TOKENS section in `src/index.css`**

Replace the entire `@theme { ... }` block and the entire `:root { ... }` block (currently lines ~34–77) with exactly:

```css
@theme {
  /* Canonical dark-ink tokens (new work styles against these). */
  --color-bg:          #0B0E14;
  --color-bg-tonal:    #131722;
  --color-text:        #F5F2EC;
  --color-text-muted:  #C9C4BA;
  --color-text-faded:  #A8A49C;
  --color-accent-pink:   #E64D66;
  --color-accent-blue:   #4D80E6;
  --color-accent-yellow: #E6CC4D;

  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}

:root {
  /* Canonical dark-ink tokens. Contrast-audited in the plan — do not
     change hexes without recomputing the AA table. */
  --bg:         #0B0E14;
  --bg-tonal:   #131722;
  --text:       #F5F2EC;
  --text-muted: #C9C4BA;
  --text-faded: #A8A49C;
  --hairline:   rgba(245, 242, 236, 0.13);
  --accent-pink:   #E64D66;
  --accent-blue:   #4D80E6;
  --accent-yellow: #E6CC4D;

  /* LEGACY ALIASES — remapped onto the dark system so the whole light-era
     stylesheet flips in one commit. Semantics: in the light theme --cream
     was "page background" and --ink was "text"; those ROLES keep their
     var names, so --cream is now dark and --ink is now light. Sections
     migrate to the canonical names above as they're restyled. */
  --cream:    #0B0E14;             /* page bg */
  --sand:     #131722;             /* tonal section bg */
  --mist:     rgba(245, 242, 236, 0.14); /* borders/hairlines */
  --ink:      #F5F2EC;             /* primary text */
  --bark:     #C9C4BA;             /* secondary text */
  --dust:     #A8A49C;             /* faded text */

  --blue-50:  #131722;             /* was near-white tint bg */
  --blue-100: #1B2233;             /* chip/tint bg */
  --blue-200: #7AA0ED;
  --blue-300: #7AA0ED;
  --blue-400: #4D80E6;             /* accent slot */
  --blue-500: #7AA0ED;             /* hover: lighter, not darker, on dark */

  --periwinkle-100: #2A3450;       /* was pale bg */
  --periwinkle-200: #6B94EA;
  --periwinkle-300: #7AA0ED;

  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}
```

(S8 — Jakarta solo: `--font-mono` is dropped entirely; it was a dead token with no consumers. The `ui-monospace` literals in the detail-page CSS stay untouched this pass — they're addressed in the deferred detail-page restyle, Plan risk 4.)

- [ ] **Step 4: Fix the three global rules the flip inverts**

In the GLOBAL section of `src/index.css`:

1. Replace `::selection { background: var(--blue-300); color: var(--cream); }` with:

```css
::selection { background: var(--accent-blue); color: var(--bg); }
```

2. Replace the `.section--contact strong, .footer strong { color: var(--cream); }` block (the "Defensive override for ink-background sections" rule) with:

```css
.section--contact strong,
.footer strong {
  color: var(--text);
}
```

3. Immediately after that block, add:

```css
/* Interim dark guard for the Contact/Footer block until Task 10 rebuilds it
   on the LiningWaves stage: keep it ink even though the legacy alias flip
   would have inverted it to light. */
.section--contact,
.footer {
  background: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 5: Update the loader curtain + theme-color in `index.html`**

In the inline loader CSS: replace `background: #111822;` with `background: #0B0E14;`, `color: #F6F9FC;` with `color: #F5F2EC;`, and the `background: #3A96E8; /* --blue-400 — fallback hex */` dot with `background: #4D80E6; /* --accent-blue — fallback hex */`. In `<head>`: `<meta name="theme-color" content="#0B0E14" />` and `<meta name="msapplication-TileColor" content="#0B0E14" />`.

- [ ] **Step 6: Build + run the smoke green + full e2e still green**

Run: `npm run build && npm run test:e2e`
Expected: build clean; `dark-tokens.spec.ts` passes; no other spec regressed (they assert behavior/opacity, not colors).

- [ ] **Step 7: Commit**

```bash
git add src/index.css index.html tests/e2e/dark-tokens.spec.ts
git commit -m "feat(tokens): dark ink system — legacy aliases remapped, canonical tokens added"
```

**Verify before returning:** `npm run build` clean · `npm run test:unit` green · `npm run test:e2e` 0 failed.

**Boundaries:** ONLY the two files + new spec. No component/JSX edits, no per-section CSS beyond the three rules in Step 4. If any e2e spec fails after the flip for a reason not listed here, return `blocked:` with the output.

---

### Task 3: FluidWavesHero canvas component

**Spec TODO:** `- [ ] FluidWavesHero shader: fluid-swirl adaptation (no swirl, random scattered waves, no mouse) with DPR cap, off-screen pause, reduced-motion static frame, no-WebGL gradient fallback`

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Create: `src/components/canvas/FluidWavesHero.tsx`
- Modify: `src/index.css` (append `.fluid-waves` rules)
- Test: `tests/unit/FluidWavesHero.test.tsx` (new), `tests/e2e/hero-shader.spec.ts` (new)

**Interfaces:**
- Consumes: `useMotion()` from `src/context/MotionContext` (`prefersReducedMotion: boolean`).
- Produces: `export function FluidWavesHero(): React.ReactElement` — fills its **positioned parent** (`position:absolute; inset:0`), renders `<canvas className="fluid-waves-canvas" data-canvas="fluid-waves">` or, when WebGL is unavailable, `<div className="fluid-waves-fallback" data-testid="fluid-waves-fallback">`. Sets `data-paused="true"` on the canvas while the IO reports off-screen, `data-static="true"` under reduced motion. Task 4 mounts it inside `.hero-canvas`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/FluidWavesHero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { FluidWavesHero } from '../../src/components/canvas/FluidWavesHero'

describe('FluidWavesHero', () => {
  it('renders the layered-gradient fallback when WebGL is unavailable (jsdom)', () => {
    render(
      <MotionProvider>
        <FluidWavesHero />
      </MotionProvider>,
    )
    // jsdom has no WebGL context — the component must fall back, never
    // render a dead black canvas.
    expect(screen.getByTestId('fluid-waves-fallback')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/FluidWavesHero.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/canvas/FluidWavesHero.tsx` with exactly this code (adapted from vault fluid-swirl; spin/polar/mouse removed, seeded scattered wave motion added — the 5-iteration UV loop is the paint look, keep it verbatim):

```tsx
import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useMotion } from '../../context/MotionContext'

// Tricolor as GLSL vec3s — #E64D66, #4D80E6, #E6CC4D (contrast-audited in
// the plan; the hero scrim guarantees AA for text above the paint).
const COLOR_1: [number, number, number] = [0.902, 0.302, 0.4]
const COLOR_2: [number, number, number] = [0.302, 0.502, 0.902]
const COLOR_3: [number, number, number] = [0.902, 0.8, 0.302]

const DPR_CAP = 1.5
const FLOW_SPEED = 0.35
const CONTRAST = 2.0
const PIXEL_FILTER = 700.0

const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

// fluid-swirl fragment shader, de-spun: the polar-angle pre-pass
// (new_pixel_angle / spin_* uniforms) is replaced by a seeded crossed-sine
// domain warp, so the paint drifts as scattered waves instead of orbiting.
const fragmentShader = `
  precision highp float;

  uniform vec2 resolution;
  uniform float time;
  uniform float seed;
  uniform vec3 colour_1;
  uniform vec3 colour_2;
  uniform vec3 colour_3;
  uniform float contrast;
  uniform float pixel_filter;

  varying vec2 vUv;

  vec4 effect(vec2 screenSize, vec2 screen_coords) {
    float pixel_size = length(screenSize.xy) / pixel_filter;
    vec2 uv = (floor(screen_coords.xy * (1.0 / pixel_size)) * pixel_size
               - 0.5 * screenSize.xy) / length(screenSize.xy);

    uv *= 30.0;
    float speed = time * ${FLOW_SPEED.toFixed(2)};

    // Scattered wave pre-warp (replaces the swirl): two crossed sine fields
    // phase-shifted by the per-load seed so every visit scatters differently.
    // Spatial frequencies 0.22 / 0.41 are deliberately non-commensurate — close
    // values (e.g. 0.35 / 0.30) beat into visible banding; these interfere
    // irregularly for an organic scatter.
    uv += 1.2 * vec2(
      sin(uv.y * 0.22 + speed * 0.32 + seed * 6.2831),
      cos(uv.x * 0.41 - speed * 0.24 + seed * 12.566)
    );

    vec2 uv2 = vec2(uv.x + uv.y);

    for (int i = 0; i < 5; i++) {
      uv2 += sin(max(uv.x, uv.y)) + uv;
      uv += 0.5 * vec2(
        cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
        sin(uv2.x - 0.113 * speed)
      );
      uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
    }

    // 1.38 folds in the retired spin_amount term (0.5 * 0.36 + 1.2) so the
    // paint bands keep the vault look exactly.
    float contrast_mod = (0.25 * contrast + 1.38);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);

    vec3 ret_col = (0.3 / contrast) * colour_1 +
                   (1.0 - 0.3 / contrast) * (colour_1 * c1p + colour_2 * c2p + colour_3 * c3p);
    return vec4(ret_col, 1.0);
  }

  void main() {
    gl_FragColor = effect(resolution, vUv * resolution);
  }
`

export function FluidWavesHero(): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: false })
    if (!gl) {
      setWebglFailed(true)
      return
    }

    const createShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vShader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fShader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vShader || !fShader) {
      setWebglFailed(true)
      return
    }

    const program = gl.createProgram()
    if (!program) {
      setWebglFailed(true)
      return
    }
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglFailed(true)
      return
    }

    const positionLoc = gl.getAttribLocation(program, 'position')
    const resolutionLoc = gl.getUniformLocation(program, 'resolution')
    const timeLoc = gl.getUniformLocation(program, 'time')
    const seedLoc = gl.getUniformLocation(program, 'seed')
    const colour1Loc = gl.getUniformLocation(program, 'colour_1')
    const colour2Loc = gl.getUniformLocation(program, 'colour_2')
    const colour3Loc = gl.getUniformLocation(program, 'colour_3')
    const contrastLoc = gl.getUniformLocation(program, 'contrast')
    const pixelFilterLoc = gl.getUniformLocation(program, 'pixel_filter')

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const seed = Math.random()
    const startTime = performance.now()
    let rafId: number | null = null
    let inView = true

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const drawFrame = (timeSec: number): void => {
      gl.useProgram(program)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      gl.uniform1f(timeLoc, timeSec)
      gl.uniform1f(seedLoc, seed)
      gl.uniform3fv(colour1Loc, COLOR_1)
      gl.uniform3fv(colour2Loc, COLOR_2)
      gl.uniform3fv(colour3Loc, COLOR_3)
      gl.uniform1f(contrastLoc, CONTRAST)
      gl.uniform1f(pixelFilterLoc, PIXEL_FILTER)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLoc)
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (): void => {
      drawFrame((performance.now() - startTime) / 1000)
      rafId = requestAnimationFrame(loop)
    }

    const start = (): void => {
      if (rafId === null && !prefersReducedMotion) {
        rafId = requestAnimationFrame(loop)
      }
    }
    const stop = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReducedMotion) {
      // One static frame, time frozen at a seed-derived phase; no loop.
      canvas.dataset.static = 'true'
      drawFrame(seed * 10)
    } else {
      start()
    }

    // Pause the loop when the hero is off-screen. Also repaint one frame on
    // re-entry under reduced motion (resize may have cleared the buffer).
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (prefersReducedMotion) {
        if (inView) drawFrame(seed * 10)
        return
      }
      if (inView) {
        canvas.removeAttribute('data-paused')
        start()
      } else {
        canvas.dataset.paused = 'true'
        stop()
      }
    })
    io.observe(canvas)

    // WebGL context loss (GPU reset, tab-backgrounding on some drivers): stop
    // the loop and drop to the gradient fallback rather than rendering a frozen
    // or black canvas. preventDefault keeps the context recoverable.
    const handleContextLost = (e: Event): void => {
      e.preventDefault()
      stop()
      setWebglFailed(true)
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.deleteProgram(program)
      gl.deleteShader(vShader)
      gl.deleteShader(fShader)
      gl.deleteBuffer(buffer)
    }
  }, [prefersReducedMotion])

  if (webglFailed) {
    return <div className="fluid-waves-fallback" data-testid="fluid-waves-fallback" aria-hidden="true" />
  }

  return <canvas ref={canvasRef} className="fluid-waves-canvas" data-canvas="fluid-waves" aria-hidden="true" />
}
```

- [ ] **Step 4: Append the CSS**

Append to `src/index.css` (new section comment `/* FLUID WAVES (canvas #1) */`):

```css
.fluid-waves-canvas,
.fluid-waves-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
/* No-WebGL fallback: same tricolor as layered radial gradients so the hero
   never renders black-on-black. */
.fluid-waves-fallback {
  background:
    radial-gradient(60% 80% at 20% 30%, rgba(230, 77, 102, 0.50), transparent 70%),
    radial-gradient(50% 70% at 80% 25%, rgba(77, 128, 230, 0.50), transparent 70%),
    radial-gradient(70% 60% at 55% 80%, rgba(230, 204, 77, 0.35), transparent 70%),
    var(--bg);
}
```

- [ ] **Step 5: Unit test green**

Run: `npx vitest run tests/unit/FluidWavesHero.test.tsx`
Expected: PASS (jsdom `getContext('webgl')` returns null → fallback).

- [ ] **Step 6: Write the mount-smoke e2e (RED until Task 4 mounts it — mark `.fixme` now)**

Create `tests/e2e/hero-shader.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

// Un-fixme'd in Task 4 when Hero mounts the canvas.
test.fixme('hero shader canvas mounts with zero console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveCount(1)
  expect(errors).toEqual([])
})

test.fixme('hero shader pauses off-screen', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
  await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveAttribute('data-paused', 'true')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test.fixme('hero shader renders a static frame (no loop)', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await expect(page.locator('[data-canvas="fluid-waves"]')).toHaveAttribute('data-static', 'true')
  })
})
```

- [ ] **Step 7: Typecheck + suites + commit**

Run: `npm run build && npm run test:unit && npx playwright test tests/e2e/hero-shader.spec.ts --project=desktop-chromium`
Expected: build clean; unit green; the 3 shader tests report as fixme/skipped.

```bash
git add src/components/canvas/FluidWavesHero.tsx src/index.css tests/unit/FluidWavesHero.test.tsx tests/e2e/hero-shader.spec.ts
git commit -m "feat(canvas): FluidWavesHero — de-spun fluid-swirl, seeded scattered waves, perf + a11y guards"
```

**Verify before returning:** Step 5 + Step 7 outputs. Component is NOT yet mounted anywhere — that is Task 4's job; do not edit `Hero.tsx`.

**Boundaries:** Out of scope: `Hero.tsx`, entrance, GSAP, deletions. The GLSL beyond the documented adaptation is verbatim vault code — do not "clean it up". S5 context-loss handling for the hero drops permanently to the gradient fallback (`setWebglFailed(true)` unmounts the canvas), so there is deliberately NO `webglcontextrestored` re-init here — that path only applies to the lining-waves backdrop (Task 10), which keeps its container. If the shader compiles but you cannot verify the look, that's fine: Task 4's smoke + the Task-3 screenshot checkpoint (orchestrator runs it) own the eye test. If compile/link fails at runtime in the smoke, return `blocked:` with the console output (escalation path: deep-reasoner-opus-xhigh per Plan risk 2).

---

### Task 4: Hero composition + GSAP entrance + ink-draw/R3F deletion

**Spec TODOs:**
- `- [ ] Hero composition: monumental bottom-anchored name + leading canonical title in role cycle + meta top-right; ink-draw components deleted`
- `- [ ] Entrance: paint bloom → clipped staggered rises; LCP < 2.5s on preview; reduced-motion fade`

**Routing:** integrator-opus-high · high

**Files:**
- Modify: `src/components/sections/Hero.tsx` (full rewrite), `src/index.css` (HERO + HERO NAME DRAWING sections), `src/i18n/locales/en.json`, `src/i18n/locales/pt.json`, `package.json` (+`gsap`, −`@react-three/fiber`, −`@react-three/drei`), `tests/unit/bundle-deps.test.ts`, `tests/unit/seo/i18n-roles.test.ts`, `tests/unit/Hero.test.tsx` (rewrite), `tests/e2e/hero-entrance.spec.ts` (rewrite), `tests/e2e/hero-shader.spec.ts` (un-fixme), `src/data/stats.ts` (remove `heroStats` if unused), `src/context/MotionContext.tsx` (remove `r3fAccentEnabled` + dead `loaderDone` field; drop `motion-flags` import), `src/main.tsx` (reword stale HeroNameDrawing comments)
- Delete: `src/components/ui/HeroNameDrawing.tsx`, `tests/unit/HeroNameDrawing.test.tsx`, `src/components/canvas/HeroAccent3D.tsx`, `src/components/canvas/HeroAccentSilhouette.tsx`, **`src/utils/motion-flags.ts`** (all exports dead — S6)
- (Keep for Task 10: `src/data/glyphPaths.ts`, `scripts/extract-glyph-paths.mjs` — `FooterNameMarquee` still imports glyphPaths until the footer rewrite.)

**Interfaces:**
- Consumes: `FluidWavesHero` (Task 3); `useMotion()` (`entranceDone`, `resolveEntrance`, `entranceBypassed`, `prefersReducedMotion`); module exports `curtainGone` from `src/context/MotionContext`; `useScrollLockDuringEntrance` (unchanged — keeps `document.body.dataset.loaderState` semantics all e2e specs key on); `useLenis`.
- Produces: `export function Hero(): React.ReactElement`. i18n keys: `hero.name1`, `hero.name2`, `hero.roles[]` (roles[0] = canonical title), `hero.meta.location`, `hero.meta.availability`. Removes keys: `hero.rolePrefix`, `hero.description`, `hero.cta.*`, `hero.stats.*`. DOM contract for tests: `.hero` > `.hero-canvas` (mounts FluidWavesHero) + `.hero-scrim` + `.hero-meta` + `.hero-bottom` (role line — the cycling span keeps className `.hero-role` — inside a `.hero-mask`, then `h1.hero-name` with two `.hero-mask > .hero-line` spans, text `kevin` / `shibuya.`).

**Design contract (integrator judgment within these constraints):**
- Composition: full-viewport hero (`min-height: 100svh`), canvas absolute behind, scrim above canvas, text above scrim. Name bottom-left like a signature: lowercase, `clamp(64px, 12vw, 200px)`, weight 650–750, line-height ~0.92, letter-spacing −0.03em, cream. Role line sits directly above the name: `clamp(15px, 1.6vw, 22px)`, cream, keeps the click/keyboard cycle behavior from the old Hero (AnimatePresence swap, `role="button"`, aria-label) — roles[0] is the canonical title and the cycle starts there on every load. Meta top-right (small, `--text-faded`, two lines right-aligned: location, availability), below the fixed nav.
- Scrim (MANDATORY, from the contrast table): `.hero-scrim { position:absolute; inset:0; background: linear-gradient(to top, rgba(11,14,20,0.88) 0%, rgba(11,14,20,0.55) 32%, rgba(11,14,20,0) 60%), linear-gradient(to bottom, rgba(11,14,20,0.75) 0%, rgba(11,14,20,0) 28%); }`
- **Entrance (GSAP, one-shot; install `gsap` with `npm install gsap`).** Ease: register the house ease ONCE at module scope — `import { CustomEase } from 'gsap/CustomEase'; gsap.registerPlugin(CustomEase); CustomEase.create('house', '0.22,1,0.36,1')` (CustomEase ships in the public `gsap` package) — and use `ease: 'house'` for the role + name rises (T1).
  - **Effect shape (S3 — back-nav replay guard, MANDATORY):** run the entrance in a **deferred `useEffect`** (NEVER `useLayoutEffect`) whose dep array includes `entranceBypassed` from `useMotion()`. Inside, FIRST branch on `prefersReducedMotion || entranceBypassed` → `gsap.set` all targets to their final state (`autoAlpha: 1`, `yPercent: 0`, `scale: 1`) and call `resolveEntrance()` immediately — **no timeline, no `curtainGone.then`**. Only when neither is true do you subscribe `curtainGone.then(runTimeline)`. Rationale: `curtainGone` is a once-resolved module-scoped promise, so a naive `.then(runTimeline)` on every mount replays the full 1.6 s entrance on back-navigation into Home; the `entranceBypassed` early-return (Home calls `bypassEntrance()` before restoring scroll) prevents the replay. Guard the timeline so a StrictMode double-invoke can't build it twice (a `let built = false` closure flag or `ctx` presence check).
  - **Timeline** (inside `gsap.context(() => { ... }, heroRef)`; every rise wrapped in a `.hero-mask { overflow: hidden; display: block; }` clip so nothing visibly overflows; `return () => ctx.revert()` cleanup):
    1. `.hero-canvas` from `{ autoAlpha: 0, scale: 1.045 }` to `{ autoAlpha: 1, scale: 1, duration: 0.8, ease: 'power2.out' }` at **0**;
    2. role line inner span `fromTo({ yPercent: 112 }, { yPercent: 0, duration: 0.6, ease: 'house' })` at **0.12**;
    3. the two `.hero-line` name spans `fromTo({ yPercent: 112 }, { yPercent: 0, duration: 0.65, ease: 'house', stagger: 0.18 })` at **0.30**;
    4. `.hero-meta` `fromTo({ autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 })` at **0.9**;
    5. `tl.call(resolveEntrance)` at the end.
  - **Timing reality (S1 — corrected math, do not trust the old ~1.6 s figure as an LCP proof):** `curtainGone` resolves ≈ **1250 ms after React's first commit** (per `src/main.tsx`: `MIN_DWELL 600 ms` + `TRANSITION_MS 600 ms` + `50 ms` removal delay; `MAX_WAIT` hard-lifts at 3000 ms). The name rise starts at timeline offset 0.30 s, runs 0.65 s, with the second line staggered +0.18 s, so the last name line settles at ≈ 0.30 + 0.18 + 0.65 = **1.13 s into the timeline** → ≈ 1250 + 1130 = **≈ 2.38 s after first commit** worst case. That is inside the < 2.5 s budget but with almost no slack — hence the mandatory in-task LCP gate below. Total entrance ≈ 1.7 s from `curtainGone`.
  - **LCP contract:** the name spans MUST be in the initial HTML commit (present + transformed via `yPercent`, NOT `display:none` and NOT behind a lazy import) so the paint is a `yPercent:0` reveal of already-laid-out text, not a first mount. The name text is the post-pivot LCP element (the loader `ks` mark that owned the 0.8 s baseline LCP is removed).
- **Deletions:** `HeroNameDrawing` + its test + both `HeroAccent*` canvas files; strip `r3fAccentEnabled` from `MotionContext` (and its consumers — grep) and **`git rm src/utils/motion-flags.ts` unconditionally (S6):** all four exports are dead after this task — `ENABLE_R3F_ACCENT` + `MOBILE_BREAKPOINT_PX` are referenced ONLY by `MotionContext` (both removed here), and `LOADER_*` already have zero consumers (grep to confirm, then delete the file). Remove BOTH `ENABLE_R3F_ACCENT` and `MOBILE_BREAKPOINT_PX` from the `MotionContext` import line. **Also drop the dead `loaderDone` field (S9)** from `MotionContextValue` and from the `useMemo` value object in the same rewrite (grep `loaderDone` first — if a live consumer exists, return `blocked:` instead). Remove `@react-three/fiber` + `@react-three/drei` from `package.json` dependencies (`three` STAYS — Task 10 needs it). **Update stale comments (L4):** in `src/main.tsx` and `src/context/MotionContext.tsx`, any comment referencing `HeroNameDrawing` / the ink-trace entrance gets reworded to the new GSAP entrance (the `curtainGone` handshake still exists — HeroNameDrawing awaited it, now the Hero GSAP effect does). Delete the HERO NAME DRAWING CSS section and the dead `.hero-desc/.hero-cta/.hero-stats/.hero-name-line*` rules; rebuild the HERO CSS section for the new anatomy.
- i18n (both locales, same commit — exact values):

```jsonc
// en.json  hero:
"hero": {
  "name1": "kevin",
  "name2": "shibuya.",
  "roles": [
    "senior front-end engineer · react/typescript",
    "full-stack developer",
    "system architect",
    "tech lead",
    "ai engineer"
  ],
  "meta": {
    "location": "porto alegre · brazil",
    "availability": "open to new projects"
  }
}
// pt.json  hero:
"hero": {
  "name1": "kevin",
  "name2": "shibuya.",
  "roles": [
    "engenheiro front-end sênior · react/typescript",
    "desenvolvedor full-stack",
    "arquiteto de sistemas",
    "líder técnico",
    "engenheiro de ia"
  ],
  "meta": {
    "location": "porto alegre · brasil",
    "availability": "aberto a novos projetos"
  }
}
```

- `tests/unit/bundle-deps.test.ts` allowlist becomes: `'@tailwindcss/vite', 'framer-motion', 'gsap', 'i18next', 'lenis', 'react', 'react-dom', 'react-i18next', 'react-router-dom', 'tailwindcss', 'three'`.
- `tests/unit/seo/i18n-roles.test.ts` rewrite: assert (a) EN/PT role arrays same length, (b) `roles[0]` equals the canonical title verbatim in each locale, (c) all roles are lowercase. Delete the article-grammar tests (prefix is gone).
- If `heroStats` in `src/data/stats.ts` has no remaining importers (grep), delete the export and the `hero.stats.*` keys; otherwise return `blocked:`.

**Acceptance check** (authored here, read-only — write it FIRST, watch it fail, then implement):

Rewrite `tests/e2e/hero-entrance.spec.ts` as:

```ts
import { test, expect } from '@playwright/test'

test('monumental name is real text and lands within the entrance budget', async ({ page }) => {
  await page.goto('/')
  // Name text exists in the DOM immediately (LCP element is HTML text).
  await expect(page.locator('h1.hero-name')).toContainText('kevin', { timeout: 2000 })
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 4000 })
  // After the entrance the name line has fully risen (no residual transform offset).
  const y = await page.locator('.hero-line').first().evaluate((el) => el.getBoundingClientRect().height > 0
    && getComputedStyle(el).transform)
  expect(y === 'none' || /matrix\(1, 0, 0, 1, 0, 0\)/.test(String(y))).toBeTruthy()
  // Role cycle leads with the canonical title.
  await expect(page.locator('.hero-role')).toContainText('senior front-end engineer · react/typescript')
  // Nav becomes interactive after entrance.
  await expect(page.locator('header.nav.is-visible')).toHaveCount(1)
})

test('body scroll is locked while the entrance plays', async ({ page }) => {
  await page.goto('/')
  const stateDuring = await page.evaluate(() => document.body.dataset.loaderState)
  expect(stateDuring).toBe('loading')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done', null, { timeout: 4000 })
  const overflowAfter = await page.evaluate(() => getComputedStyle(document.body).overflow)
  expect(overflowAfter).not.toBe('hidden')
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('entrance is a static fade: final state, fast, no masks mid-flight', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    expect(Date.now() - start).toBeLessThan(2500)
    const op = await page.locator('h1.hero-name').evaluate((el) => parseFloat(getComputedStyle(el).opacity))
    expect(op).toBeGreaterThan(0.99)
  })
})
```

**Steps:**

- [ ] **Step 1: `npm install gsap`; remove `@react-three/fiber` + `@react-three/drei` from dependencies (`npm uninstall @react-three/fiber @react-three/drei`); update `tests/unit/bundle-deps.test.ts` allowlist as above; run `npx vitest run tests/unit/bundle-deps.test.ts` → PASS**
- [ ] **Step 2: Rewrite `tests/e2e/hero-entrance.spec.ts` with the acceptance spec above; run it → FAIL (old hero still mounted)**
- [ ] **Step 3: Rewrite `Hero.tsx` + HERO CSS per the design contract (deferred `useEffect` + `entranceBypassed` guard per S3; `CustomEase` 'house' per T1); delete `HeroNameDrawing.tsx`, `HeroNameDrawing.test.tsx`, `HeroAccent3D.tsx`, `HeroAccentSilhouette.tsx`, `src/utils/motion-flags.ts`; strip `r3fAccentEnabled` + dead `loaderDone` from `MotionContext` and drop its `motion-flags` import; reword stale HeroNameDrawing comments in `main.tsx` + `MotionContext.tsx` (L4)**
- [ ] **Step 4: Apply the i18n diff to BOTH locales; delete orphaned keys (`rolePrefix`, `description`, `cta`, `stats`) and `heroStats` if unimported; rewrite `tests/unit/seo/i18n-roles.test.ts` per contract; validate JSON (`node -e "JSON.parse(...)"` both files)**
- [ ] **Step 5: Rewrite `tests/unit/Hero.test.tsx`: render Hero inside MotionProvider, assert name1/name2 text and that roles[0] renders. Do NOT assert on un-resolved entrance state (module promise pollution). Run unit suite → green**
- [ ] **Step 6: Remove `.fixme` from all three tests in `tests/e2e/hero-shader.spec.ts`**
- [ ] **Step 7: `npm run build && npm run test:unit && npm run test:e2e` → all green (hero-entrance, hero-shader, dark-tokens, section-enters, reduced-motion, perf-budget)**
- [ ] **Step 8 (in-task LCP gate — S1, do NOT defer to Task 12): measure LCP against a fresh preview and confirm the name text is the LCP element under budget**

Run:
```bash
npm run build
npx vite preview --port 4173 &   # fresh preview AFTER the build (stale-sirv rule)
sleep 3
npx lighthouse http://localhost:4173 --preset=desktop --quiet --chrome-flags="--headless=new" --output=json --output-path=tmp/lh-hero.json
node -e "const d=require('./tmp/lh-hero.json'); const a=d.audits; console.log('LCP', a['largest-contentful-paint'].numericValue, 'ms |', JSON.stringify(a['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector ?? 'n/a'))"
pkill -f "vite preview" || true
```
Expected: **LCP < 2400 ms** AND the LCP element selector resolves to the hero name (`h1.hero-name` / `.hero-line`), not a canvas or loader remnant.
**Fallback if LCP ≥ 2400 ms:** cut the name-rise `duration` from 0.65 → **0.55** and drop the name-line timeline offset from 0.30 → **0.24**, rebuild, and re-measure once. If still ≥ 2400 ms, STOP and return `blocked: LCP <n>ms` — do not sacrifice the entrance (the entrance is inviolable; fix around it, per the memory note).

- [ ] **Step 9: Mount smoke is covered by hero-shader.spec zero-console-errors test; additionally load `/projects/hotmart-bunde` in the preview and confirm it still renders (route regression from MotionContext changes)**

Run: `npx playwright test tests/e2e/hero-shader.spec.ts tests/e2e/hero-entrance.spec.ts --project=desktop-chromium`

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(hero): monumental fluid-waves hero + gsap entrance; delete ink-draw + R3F accent"
```

**Verify before returning:** full unit + full e2e green; `npm run lint` clean; screenshot of the hero (headless Playwright `page.screenshot`) attached for the orchestrator's taste checkpoint (Plan risk 2 + 3).

**Boundaries:** Do NOT touch `FooterNameMarquee`, `glyphPaths`, or the extraction script (Task 10). Do not modify `SmoothScroll`/`useScrollLockDuringEntrance` behavior — only consume. Loader curtain in `index.html` stays as restyled in Task 2.

---

### Task 5: WorkRow primitive

**Spec TODO:** `- [ ] WorkRow primitive built once (hover float + tint, touch thumbnail, expandable variant, focus states) and reused by projects, embeds, work experience`

**Routing:** integrator-opus-high · high

**Files:**
- Create: `src/components/ui/WorkRow.tsx`, `src/utils/palette.ts`
- Modify: `src/index.css` (append WORKROW section)
- Test: `tests/unit/WorkRow.test.tsx` (new)

**Interfaces:**
- Consumes: `useMotion()` (`prefersReducedMotion`), framer-motion, react-router-dom `Link`.
- Produces (exact — Tasks 6/7/8 import these):

```ts
// src/utils/palette.ts
/** Shader tricolor, contrast-audited (plan table). Index-rotated row tints. */
export const ACCENTS = ['#E64D66', '#4D80E6', '#E6CC4D'] as const
export type Accent = (typeof ACCENTS)[number]
export function accentFor(index: number): Accent {
  return ACCENTS[index % ACCENTS.length]
}
```

```ts
// src/components/ui/WorkRow.tsx
export interface WorkRowPreview {
  /** Image src (project mockup) — takes precedence over gradient. */
  src?: string
  /** CSS gradient string (archive items without imagery). */
  gradient?: string
  alt?: string
}

export interface WorkRowProps {
  /** 0-based position in the list; renders as zero-padded index and picks the tint via accentFor(index). */
  index: number
  title: string
  /** Rendered as `·`-joined meta spans after the title block. */
  meta?: string[]
  /** Internal path ('/...') renders a <Link>, external an <a target="_blank" rel="noreferrer">. Omit for non-link rows. */
  href?: string
  /** Overrides the href-prefix heuristic (L2): when set, decides Link vs anchor
   *  regardless of whether href starts with '/'. Archive passes item.internal. */
  internal?: boolean
  preview?: WorkRowPreview
  /** Expandable variant (work experience). Mutually exclusive with href. */
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  /** Expanded panel content. */
  children?: React.ReactNode
  /** Optional trailing ornament (e.g. archive ★). */
  ornament?: React.ReactNode
}
export function WorkRow(props: WorkRowProps): React.ReactElement
```

**Design contract (integrator judgment within these constraints):**
- Link decision (L2): `const isInternal = props.internal ?? href?.startsWith('/') ?? false` — internal → `<Link to={href}>`, external → `<a href={href} target="_blank" rel="noreferrer">`.
- Anatomy (open typographic row, NO card/container): `<div class="workrow">` wrapping a `<Link>/<a>` (`.workrow-link`) or `<button aria-expanded>` (`.workrow-toggle`), containing: `.workrow-index` (zero-padded `01`, `--text-faded`, tabular-nums) · `.workrow-title` (oversized lowercase, `clamp(28px, 4.6vw, 64px)`, weight 550, letter-spacing −0.02em, cream) · `.workrow-meta` (spans joined with `·`, `--text-faded`, small) · `.workrow-arrow` (`↗` for links / `+` rotating 45° when expanded, `--text-faded`).
- Dividers: each row `border-bottom: 1px solid var(--hairline)`; the LIST OWNER (section) adds the top hairline — the primitive only draws bottoms.
- Tint: the row root gets `style={{ '--row-tint': accentFor(index) }}` (typed via `React.CSSProperties & Record<'--row-tint', string>` or a cast — no `any`). CSS: hover/focus-within transitions `.workrow-title { color: var(--row-tint) }` and arrow to full cream; base state is cream/faded. `transition: color 0.3s cubic-bezier(0.22,1,0.36,1)`.
- Desktop hover float (Framer Motion lane): a fixed-position `.workrow-float` element (the preview image/gradient, ~300×200, rounded 10px) tracks the pointer with `useMotionValue` + `useSpring` — **pointer state must flow through MotionValues, never setState above the list** (a re-render mid-`whileInView` stagger permanently kills entrances — see memory + `bento-entrance-hover` history). Visibility toggled per-row via a MotionValue (0/1) consumed by a leaf component. Render the float only when `window.matchMedia('(hover: hover) and (pointer: fine)').matches` AND not `prefersReducedMotion`.
- Touch/small screens (no hover): no float; render `.workrow-thumb` inline thumbnail slot (64×44, rounded 8px, image or gradient) between index and title. Media-query driven (`@media (hover: none)`) plus the JS gate above for the float.
- Expandable variant: `<button className="workrow-toggle" aria-expanded={expanded} onClick={onToggle}>`; panel is `<AnimatePresence initial={false}>` + `motion.div` height/opacity (`duration prefersReducedMotion ? 0 : 0.32`, ease `[0.22,1,0.36,1]`, `overflow:hidden`), children rendered inside `.workrow-panel`.
- Keyboard/a11y: `:focus-visible` ring — `outline: 2px solid var(--text); outline-offset: 4px;` (visible cream ring per spec); link rows are real anchors; expandable rows are real buttons.
- Entrance: the primitive itself does NOT own scroll entrances; sections wrap rows (keeps the primitive dumb and the stagger owner in one place).

**Acceptance check** (authored here, read-only — write FIRST, run RED, implement to green):

Create `tests/unit/WorkRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../../src/context/MotionContext'
import { WorkRow } from '../../src/components/ui/WorkRow'
import { accentFor, ACCENTS } from '../../src/utils/palette'

function wrap(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <MotionProvider>{ui}</MotionProvider>
    </MemoryRouter>,
  )
}

describe('WorkRow', () => {
  it('internal href renders a router link with padded index and tint var', () => {
    wrap(<WorkRow index={0} title="radar legislativo" meta={['2026', 'nestjs']} href="/projects/radar-legislativo" />)
    const link = screen.getByRole('link', { name: /radar legislativo/i })
    expect(link).toHaveAttribute('href', '/projects/radar-legislativo')
    expect(screen.getByText('01')).toBeInTheDocument()
    const root = link.closest('.workrow') as HTMLElement
    expect(root.style.getPropertyValue('--row-tint')).toBe(ACCENTS[0])
  })

  it('external href renders a new-tab anchor', () => {
    wrap(<WorkRow index={1} title="enquete" href="https://gauchazh.clicrbs.com.br/x" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('expandable variant is a button with aria-expanded and shows children when open', () => {
    wrap(
      <WorkRow index={2} title="grupo rbs" expandable expanded onToggle={vi.fn()}>
        <p>bullets</p>
      </WorkRow>,
    )
    expect(screen.getByRole('button', { name: /grupo rbs/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('bullets')).toBeInTheDocument()
  })

  it('tint rotates through the tricolor by index', () => {
    expect(accentFor(0)).toBe('#E64D66')
    expect(accentFor(1)).toBe('#4D80E6')
    expect(accentFor(2)).toBe('#E6CC4D')
    expect(accentFor(3)).toBe('#E64D66')
  })
})
```

**Steps:**

- [ ] **Step 1: Write `tests/unit/WorkRow.test.tsx` (verbatim above); run `npx vitest run tests/unit/WorkRow.test.tsx` → FAIL (modules missing)**
- [ ] **Step 2: Implement `src/utils/palette.ts` (verbatim interface above) and `src/components/ui/WorkRow.tsx` per the design contract**
- [ ] **Step 3: Append the WORKROW CSS section to `src/index.css` (row grid, title scale, tint transition, float, thumb, panel, focus ring, `@media (hover: none)` thumb swap, `@media (prefers-reduced-motion: reduce) { .workrow-float { display: none } }`)**
- [ ] **Step 4: `npx vitest run tests/unit/WorkRow.test.tsx` → PASS; `npm run build` → clean; `npm run lint` → clean**
- [ ] **Step 5: Commit**

```bash
git add src/components/ui/WorkRow.tsx src/utils/palette.ts src/index.css tests/unit/WorkRow.test.tsx
git commit -m "feat(ui): WorkRow primitive — tinted typographic rows, hover float, expandable variant"
```

**Verify before returning:** Step 4 outputs; full unit suite still green.

**Boundaries:** No section conversions here (Tasks 6–8). The acceptance test is read-only. If the float-tracking design conflicts with the no-rerender constraint in a way you can't resolve, return `blocked:` rather than routing pointer state through React state.

---

### Task 6: Projects → WorkRow rows

**Spec TODO:** `- [ ] WorkRow primitive ... reused by projects ...` (projects leg) + contributes to `- [ ] Work-first section order verified intact ... with all content surviving the restyle`

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Modify: `src/components/sections/Projects.tsx` (rewrite), `src/index.css` (delete BENTO + project-cursor sections; add `.projects-list` bits), `tests/e2e/section-enters.spec.ts` (stale bento comment — L4)
- Delete: `tests/e2e/bento-entrance-hover.spec.ts`; hook `src/hooks/useCursorTilt.ts` + `tests/unit/hooks/useCursorTilt.test.ts` IF unreferenced after the rewrite (grep first)
- Test: `tests/e2e/rows-hover.spec.ts` (new)

**Interfaces:**
- Consumes: `WorkRow`, `accentFor` (Task 5); `projects` from `src/data/projects`; `SectionHeading` (kept); i18n keys `sections.projects.*` (unchanged).
- Produces: `#projects` section, `.section-title` intact (section-enters spec depends on it).

**Contract:** Keep the featured selection logic verbatim (`highlight && (highlightOrder ?? 99) <= 4`, sorted). Each project renders `<WorkRow index={i} title={project.title[lang]} meta={[String(project.year), ...project.techStack.slice(0, 2).map(t => t.toLowerCase())]} href={`/projects/${project.slug}`} preview={{ src: project.mockups?.desktopBento, alt: `${title} preview` }} />`. Section keeps `SectionHeading` (index/label/title/description i18n unchanged). List entrance: staggered `whileInView` fade-up on a wrapper per row — the wrapper MUST carry className `workrow-wrap` (the e2e entrance guard asserts on it, since child computed opacity doesn't reflect an animating parent) — `viewport={{ once: true, amount: 0.2 }}`, reduced-motion variant from `utils/animations` REDUCED_MOTION_VARIANT; stagger owner is the section, per Task 5 contract; hover must not kill in-flight entrances (MotionValue rule). Delete: `BentoCard`, `MockupLayer`, `ProjectCursorPill`, the `bento*` + `project-cursor*` CSS blocks, and the `sections.projects.viewProject` i18n key in BOTH locales if nothing else references it (grep). `caseStudy` key: keep if used in ProjectDetail (grep before removing).

**Acceptance check** (read-only; write FIRST → RED): create `tests/e2e/rows-hover.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('featured rows render as WorkRows and tint on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is desktop-only')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects').scrollIntoViewIfNeeded()
  const rows = page.locator('#projects .workrow')
  await expect(rows).toHaveCount(4)
  const title = rows.first().locator('.workrow-title')
  const before = await title.evaluate((el) => getComputedStyle(el).color)
  await rows.first().hover()
  await page.waitForTimeout(400)
  const after = await title.evaluate((el) => getComputedStyle(el).color)
  expect(after).not.toBe(before)
  expect(after).toBe('rgb(230, 77, 102)') // ACCENTS[0] #E64D66
})

test('rows finish their entrance even when hovered mid-stagger', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover is desktop-only')
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.mouse.move(10, 10)
  await page.locator('#projects').scrollIntoViewIfNeeded()
  const first = page.locator('#projects .workrow').first()
  const box = await first.boundingBox()
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 })
  const wraps = page.locator('#projects .workrow-wrap')
  const count = await wraps.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(wraps.nth(i)).toHaveCSS('opacity', '1', { timeout: 4000 })
  }
})
```

**Steps:**

- [ ] **Step 1: Write `tests/e2e/rows-hover.spec.ts` (verbatim); run → FAIL (no `.workrow` in #projects)**
- [ ] **Step 2: Rewrite `Projects.tsx` per contract; delete bento/cursor-pill code**
- [ ] **Step 3: Delete bento + project-cursor CSS blocks from `src/index.css`; add `.projects-list` top hairline (`border-top: 1px solid var(--hairline)`)**
- [ ] **Step 4: `git rm tests/e2e/bento-entrance-hover.spec.ts`; grep `useCursorTilt` — if orphaned, `git rm src/hooks/useCursorTilt.ts tests/unit/hooks/useCursorTilt.test.ts`; grep `viewProject`/`caseStudy` i18n usage and prune orphans from both locales**
- [ ] **Step 4b (L4 — stale comment): in `tests/e2e/section-enters.spec.ts`, reword the "including Projects, reverted to the bento grid" comment to "including Projects, now WorkRow rows" — the `.section-title` selector it documents is unchanged, only the comment is stale**
- [ ] **Step 5: `npm run build && npm run test:unit && npm run test:e2e` → green (incl. new spec, section-enters, reduced-motion)**
- [ ] **Step 6: Commit — `git add -A && git commit -m "feat(projects): featured work as tinted WorkRows; delete bento grid"`**

**Verify before returning:** Step 5 output; `grep -n "bento\|project-cursor" src/index.css src/components -r` returns nothing.

**Boundaries:** Do not touch Archive/WorkExperience/Stats/Skills. Do not modify `WorkRow` — if the primitive is missing something this section needs, return `blocked:` (the orchestrator routes the primitive change through a reviewed edit).

---

### Task 7: Archive → WorkRow rows + dark filter restyle

**Spec TODO:** `- [ ] Archive: rows + restyled filters, data pipeline and placeholder fallback intact`

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Modify: `src/components/sections/Archive.tsx`, `src/components/ui/ArchiveDropdown.tsx` (CSS-level restyle only), `src/index.css` (archive section rules)

**Interfaces:**
- Consumes: `WorkRow`, `accentFor`; `archive, archiveTypes, archiveEditorials, archiveYears, archiveKinds, byFeatured` from `src/data/archive`; `resolveTitle` from `src/types/content`; i18n `sections.archive.*` (unchanged).
- Produces: `#archive` section, `.section-title` intact, filters + pagination behavior identical.

**Contract:** Replace `ArchiveRow` markup with `<WorkRow index={idx} title={resolveTitle(item, lang)} meta={[item.type, item.editorial, item.date].filter(Boolean) as string[]} href={item.href} internal={item.internal} preview={{ gradient: darkenedPreview(item.gradient) }} ornament={item.kind === 'featured' && item.highlight ? <span className="archive-star">★</span> : undefined} />` — **`internal={item.internal}` (L2)** drives the Link-vs-anchor branch explicitly (the archive mixes internal `/projects/...` case-study rows with external GZH article URLs; do not rely on the href-prefix heuristic). **T4 — darken the light-era preview gradients** so the pastel `typeGradients` don't glare on the dark rows: pass `darkenedPreview(g) = `linear-gradient(rgba(11,14,20,0.35), rgba(11,14,20,0.35)), ${g}`` (a const arrow fn or inline template above the map) instead of the raw `item.gradient`. ALL state/filter/debounce/pagination logic is untouched (search, kind/type/editorial/year/sort dropdowns, disabled gating, chips, count, show-more). Missing preview → gradient placeholder (WorkRow's gradient branch — pipeline intact). Archive title scale: rows are denser than featured — override in CSS scoped to `#archive`: `.workrow-title { font-size: clamp(20px, 2.6vw, 34px); }`. Restyle toolbar to the dark language: search input transparent bg, `1px solid var(--hairline)` bottom border, cream text, `::placeholder { color: var(--text-faded) }`; dropdown trigger/list on `--bg-tonal` with hairline borders, options hover `--bg` + tint; chips = pill outline `1px solid var(--hairline)`, text `--text-muted`, `×` on hover cream; count text `--text-faded`. Keep per-row staggered `useInView` entrance (reduced-motion gate as-is), delegating visuals to a wrapper around WorkRow.

**Acceptance check:** the existing `tests/e2e/section-enters.spec.ts` `#archive` test (Task 1) plus this one-off: run `npx playwright test tests/e2e/section-enters.spec.ts --project=desktop-chromium` AND a manual-command filter check:

```bash
npx playwright test tests/e2e/dark-tokens.spec.ts tests/e2e/section-enters.spec.ts
```

plus unit: `npx vitest run tests/unit/data/archive.test.ts` (pipeline untouched → still green).

**Steps:**

- [ ] **Step 1: Convert `ArchiveRow` to `WorkRow` per contract (keep wrapper stagger + `reduced` gating)**
- [ ] **Step 2: Restyle toolbar/dropdown/chips CSS in `src/index.css` per contract (edit existing `.archive-*` rules in place — no new class names except deletions of dead preview rules)**
- [ ] **Step 3: `npm run build && npm run test:unit && npm run test:e2e` → green**
- [ ] **Step 4: Interactive smoke: `npx vite preview --port 4173` (after build), then `npx playwright test tests/e2e/rows-hover.spec.ts` still green (regression guard) — kill the preview after**
- [ ] **Step 5: Commit — `git add -A && git commit -m "feat(archive): rows on the WorkRow primitive; dark filter toolbar"`**

**Verify before returning:** suites green; filters verified by loading the page and asserting the count text changes when a kind chip is applied (one-liner Playwright eval or manual screenshot).

**Boundaries:** `src/data/archive.ts`, `embeds.csv`, and the CSV pipeline are read-only. Dropdown keyboard behavior untouched.

---

### Task 8: WorkExperience → expandable WorkRow

**Spec TODO:** `- [ ] WorkRow primitive ... reused by ... work experience` (expandable leg)

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Modify: `src/components/sections/WorkExperience.tsx`, `src/index.css` (WORK HISTORY section restyle/trim)

**Interfaces:**
- Consumes: `WorkRow` (expandable variant), `workExperiences` from `src/data/workExperience`, `Tag`, `Stagger`, i18n `sections.work.*` (unchanged).
- Produces: `#work` section, `.section-title` intact, single-open accordion behavior preserved (default open index 0).

**Contract:** Each experience renders `<WorkRow index={idx} title={exp.company.toLowerCase()} meta={[exp.role[lang], exp.period[lang]]} expandable expanded={expandedIdx === idx} onToggle={() => setExpandedIdx(expandedIdx === idx ? -1 : idx)}>` with children = the existing body content (bullets `ul.work-bullets`, `work-highlight` award line with `★` label via `sections.work.award`, `Tag` pills, mode pill `sections.work.modes.*` + location). Keep `Stagger recipe="slideInLeft"` list entrance. Delete the bespoke `work-row-head/work-num/work-toggle` markup; trim now-dead CSS from the WORK HISTORY section, keep/adapt `.work-bullets`, `.work-highlight`, `.work-tags` onto dark tokens (`--text-muted` bullets, hairline separators, tint only via the row primitive). `aria-expanded` comes from the primitive (visible cream focus ring included).

**Acceptance check** (extend the existing suite — append to `tests/e2e/rows-hover.spec.ts`, read-only once written):

```ts
test('work experience rows expand with aria-expanded', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#work').scrollIntoViewIfNeeded()
  const buttons = page.locator('#work .workrow button[aria-expanded]')
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'true') // default open
  await buttons.nth(1).click()
  await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(buttons.first()).toHaveAttribute('aria-expanded', 'false') // single-open
})
```

**Steps:**

- [ ] **Step 1: Append the acceptance test above to `tests/e2e/rows-hover.spec.ts`; run → FAIL**
- [ ] **Step 2: Convert the section per contract; trim CSS**
- [ ] **Step 3: `npm run build && npm run test:unit && npm run test:e2e` → green**
- [ ] **Step 4: Commit — `git add -A && git commit -m "feat(experience): expandable WorkRows replace bespoke accordion"`**

**Verify before returning:** suites green; keyboard check: `Tab` reaches row buttons and focus ring is visible (screenshot or `:focus-visible` computed outline assertion).

**Boundaries:** `src/data/workExperience.ts` read-only (CV canon). No i18n changes expected — if one becomes necessary, add to BOTH locales in this task.

---

### Task 9: Stats + Skills dark restyle

**Spec TODO:** `- [ ] Stats + Skills restyled onto dark tokens`

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Modify: `src/index.css` (STATS + SKILLS sections), `src/components/sections/Skills.tsx` + `src/components/sections/Stats.tsx` (class-level touches only if needed)

**Contract:** Behavior untouched: `CountUp` rAF tween + `useInView` + reduced-motion jump; `Stagger` recipes; `skillCategories` data; all i18n keys. Visual: both sections sit on the tonal alt where they used `--sand` (`section--sand` now resolves to `#131722` via the alias — verify, don't rework). Stats receipt rows: value in cream at display scale, annotation `--text-muted`, row separators `var(--hairline)`, case-study links tinted `var(--accent-blue)` with underline on hover (contrast row: 4.73 on tonal — PASS normal). `stats-row-num` → `--text-faded`. Skills columns: `skills-num` → `--text-faded`, `skills-title` cream, `skills-dot` → rotate tricolor by column index (`accentFor(colIdx)` via inline `--row-tint` or three nth-child CSS rules — CSS-only preferred: `.skills-col:nth-child(3n+1) .skills-dot { background: var(--accent-pink) }` etc.), items `--text-muted`. Kill any residual light-era literal hexes in these sections (grep the two CSS sections for `#` literals).

**Acceptance check:** existing specs — `tests/e2e/section-enters.spec.ts` (`#skills`) + unit `npx vitest run tests/unit/animations.test.ts`; plus a computed-style assertion run as a one-off command (not a committed spec):

```bash
npx playwright test tests/e2e/dark-tokens.spec.ts tests/e2e/section-enters.spec.ts --project=desktop-chromium
```

**Steps:**

- [ ] **Step 1: Restyle STATS CSS section per contract**
- [ ] **Step 2: Restyle SKILLS CSS section per contract (nth-child tricolor dots)**
- [ ] **Step 3: `npm run build && npm run test:unit && npm run test:e2e` → green**
- [ ] **Step 4: Commit — `git add -A && git commit -m "style(stats,skills): dark token restyle, tricolor skill dots"`**

**Verify before returning:** suites green; screenshot of both sections for the taste checkpoint.

**Boundaries:** No data/behavior/i18n changes. No layout re-architecture — restyle only.

---

### Task 10: Contact/Footer stage + LiningWavesBackdrop + marquee deletion

**Spec TODO:** `- [ ] Contact/Footer with lazy LiningWavesBackdrop (canvas #2), reduced-motion + pause rules applied`

**Routing:** integrator-opus-high · high

**Files:**
- Create: `src/components/canvas/LiningWavesBackdrop.tsx`
- Modify: `src/pages/Home.tsx` (stage wrapper + lazy mount), `src/components/sections/Contact.tsx` (dark restyle), `src/components/layout/Footer.tsx` (rewrite), `src/index.css` (CONTACT/FOOTER/stage sections), `package.json` (−`opentype.js` devDep)
- Delete: `src/components/ui/FooterNameMarquee.tsx`, `tests/unit/FooterNameMarquee.test.tsx`, `src/data/glyphPaths.ts`, `scripts/extract-glyph-paths.mjs`
- Test: `tests/e2e/contact-waves.spec.ts` (new)

**Interfaces:**
- Consumes: `three` (already a dep), `useMotion()`, i18n `sections.contact.*` + `footer.*` (existing keys incl. `footer.bigText`; new key `footer.location` added in this task), `react-i18next` `useTranslation` in Footer for the EN/PT toggle.
- Produces: **`export default function LiningWavesBackdrop(): ReactElement` (S7 — default export, matching the vault source's default export; there is NO named export).** Task 10's lazy import therefore stays `lazy(() => import('../components/canvas/LiningWavesBackdrop'))` with no `.then(m => ({ default: m.X }))` unwrap. The component appends a three.js `<canvas>` into its own container `<div>`; that canvas carries `data-canvas="lining-waves"`, with `data-paused`/`data-static` semantics identical to FluidWavesHero. DOM contract: `<div className="contact-footer-stage">` wraps `<Suspense><LiningWavesBackdrop/></Suspense>` (z-0) + `<Contact/><Footer/>` (z-1).

**LiningWavesBackdrop — complete code (S2 — verbatim-derived from `component-vault/src/registry/lining-waves/lining-waves-shader.tsx` per spec decision 12; the fbm `hash`/`noise`/`fbm`/`lines` GLSL is copied UNCHANGED; every adaptation is marked `// ADAPTED:` inline; no free latitude).** Transcribe exactly:

```tsx
import { useEffect, useRef, useState, type ReactElement } from 'react'
import * as THREE from 'three'
import { useMotion } from '../../context/MotionContext'

const DPR_CAP = 1.5

// ADAPTED: reminder-state + center-dimming uniforms/props removed; vertex
// shader is the vault's, unchanged.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// ADAPTED from vault lining-waves fragment shader: hash/noise/fbm/lines copied
// verbatim; reminder-state baseColor branches and the center-dimming block
// deleted; baseColor is now a dim cream, mixed over the page ink instead of
// black; thickness/distortion tuned for a subtle backdrop.
const fragmentShader = `
  precision mediump float;
  uniform vec2 iResolution;
  uniform float iTime;
  varying vec2 vUv;

  // Simple hash-based noise (vault, unchanged)
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i.x + i.y*57.0);
    float b = hash(i.x+1.0 + i.y*57.0);
    float c = hash(i.x + (i.y+1.0)*57.0);
    float d = hash(i.x+1.0 + (i.y+1.0)*57.0);
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  // Fractal Brownian Motion (vault, unchanged)
  float fbm(vec2 p) {
    float sum = 0.0, amp = 0.5, freq = 1.0;
    for(int i=0;i<6;i++){
      sum += amp * noise(p*freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }

  // Wavy lines pattern (vault, unchanged)
  float lines(vec2 uv, float thickness, float distortion) {
    float y = uv.y + distortion * fbm(uv*2.0 + iTime*0.1);
    float pattern = fract(y * 20.0);
    return smoothstep(0.5-thickness, 0.5, pattern)
         - smoothstep(0.5,       0.5+thickness, pattern);
  }

  void mainImage(out vec4 O, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution;
    uv.x *= iResolution.x / iResolution.y;

    // ADAPTED: thickness 0.02 -> 0.015, distortion 0.1 -> 0.12 (subtler lines).
    float thickness = 0.015;
    float distortion = 0.12;
    float wave = lines(uv, thickness, distortion);

    // ADAPTED: reminder-state ternary deleted — dim cream #F5F2EC*0.22.
    vec3 baseColor = vec3(0.961, 0.949, 0.925) * 0.22;

    // ADAPTED: mix over page ink #0B0E14 instead of vec3(0.0) (pure black).
    vec3 col = mix(vec3(0.043, 0.055, 0.078), baseColor, wave);

    // ADAPTED: center-dimming block deleted entirely.
    O = vec4(col, 1.0);
  }

  void main() {
    mainImage(gl_FragColor, vUv * iResolution);
  }
`

export default function LiningWavesBackdrop(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      // ADAPTED: alpha false + explicit clear color to the page ink; DPR capped.
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP))
    renderer.setClearColor(0x0b0e14, 1)

    const canvas = renderer.domElement
    canvas.dataset.canvas = 'lining-waves'
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const clock = new THREE.Clock()

    // ADAPTED: uniforms reduced to iTime + iResolution (reminder/dimming gone).
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
    }
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)

    // ADAPTED: size from the CONTAINER, not window.
    const onResize = (): void => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w, h)
    }
    window.addEventListener('resize', onResize)
    onResize()

    // ADAPTED: time fed at 0.4x for a slow drift.
    const renderFrame = (t: number): void => {
      uniforms.iTime.value = t
      renderer.render(scene, camera)
    }
    const loop = (): void => {
      renderFrame(clock.getElapsedTime() * 0.4)
    }

    let running = false
    const start = (): void => {
      if (running || prefersReducedMotion) return
      running = true
      renderer.setAnimationLoop(loop)
    }
    const stop = (): void => {
      running = false
      renderer.setAnimationLoop(null)
    }

    if (prefersReducedMotion) {
      // ADAPTED: reduced motion — exactly one frozen frame, no loop.
      canvas.dataset.static = 'true'
      renderFrame(7.0)
    }

    // ADAPTED: IO pauses the loop off-screen (identical semantics to the hero).
    const io = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting
      if (prefersReducedMotion) {
        if (inView) renderFrame(7.0)
        return
      }
      if (inView) {
        canvas.removeAttribute('data-paused')
        start()
      } else {
        canvas.dataset.paused = 'true'
        stop()
      }
    })
    io.observe(container)

    // ADAPTED: S5 — context loss drops to nothing (stage ink stands); on
    // restore, re-init by remounting via the failed→false effect re-run.
    const handleContextLost = (e: Event): void => {
      e.preventDefault()
      stop()
    }
    const handleContextRestored = (): void => {
      onResize()
      start()
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (canvas.parentNode === container) container.removeChild(canvas)
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
    }
  }, [prefersReducedMotion])

  if (failed) return <></>
  return <div ref={containerRef} className="lining-waves-backdrop" aria-hidden="true" />
}
```

CSS (append to `src/index.css`): `.lining-waves-backdrop { position: absolute; inset: 0; z-index: 0; } .lining-waves-backdrop canvas { display: block; width: 100%; height: 100%; }`

**Lazy boundary (perf-critical):** in `Home.tsx`, `const LiningWavesBackdrop = lazy(() => import('../components/canvas/LiningWavesBackdrop'))`; mount it ONLY after an IO with `rootMargin: '120%'` on the stage wrapper fires (state flip, once). Do NOT add it to the idle-warm import list — the three.js chunk must not load at idle before scroll approach. Wrap in `<Suspense fallback={null}>`.

**Contact restyle:** keep `RevealOnView` structure + i18n; `.section--contact` moves onto the stage (transparent background — remove the Task 2 interim guard for `.section--contact`/`.footer` since the stage now owns the bg), cream display title, contact rows on hairlines with tint-on-hover (reuse `.workrow` hover language via CSS, not the component).

**Footer rewrite (S4 — spec-mandated meta row `© · location · EN/PT`):** delete `FooterNameMarquee`; render `footer.bigText` as `.footer-name` typographic display (lowercase, `clamp(48px, 10vw, 160px)`, weight 650, cream, no outline trickery) above the `.footer-bottom` meta row. Meta row is a flex row, `justify-content: space-between`, `--text-faded`:
- **left group** (`.footer-meta-left`): `footer.copyright` · `footer.builtWith` (joined by a `·` separator span);
- **right group** (`.footer-meta-right`): `footer.location` · an EN/PT toggle `<button className="footer-lang">` (joined by `·`).

This satisfies the spec's `© · location · EN/PT` (copyright left, location + toggle right) while keeping `builtWith`. The toggle reuses Header's pattern: `const { t, i18n } = useTranslation()`; `onClick={() => i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt')}`; label `{t('lang')}` (renders `EN`/`PT`); `aria-label` describing the switch. **Add `footer.location` to BOTH locales in this task:** `en.json` `"location": "porto alegre, brazil"`, `pt.json` `"location": "porto alegre, brasil"` (inside the existing `footer` object). Then delete `glyphPaths.ts` + `scripts/extract-glyph-paths.mjs` + `opentype.js` devDep (`npm uninstall opentype.js`) — grep `glyphPaths` first; the marquee was its last consumer.

**Acceptance check** (read-only; write FIRST → RED): create `tests/e2e/contact-waves.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('lining-waves mounts lazily on approach; canvas budget is exactly 2', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  // Not yet approached: backdrop not mounted.
  await expect(page.locator('[data-canvas="lining-waves"]')).toHaveCount(0)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
  await expect(page.locator('[data-canvas="lining-waves"]')).toHaveCount(1, { timeout: 10000 })
  const canvases = await page.locator('canvas').count()
  expect(canvases).toBeLessThanOrEqual(2)
  expect(errors).toEqual([])
})

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } })
  test('backdrop renders a static frame', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' as ScrollBehavior }))
    await expect(page.locator('[data-canvas="lining-waves"]')).toHaveAttribute('data-static', 'true', { timeout: 10000 })
  })
})
```

**Steps:**

- [ ] **Step 1: Write `tests/e2e/contact-waves.spec.ts` (verbatim); run → FAIL**
- [ ] **Step 2: Implement `LiningWavesBackdrop.tsx` per adaptation contract**
- [ ] **Step 3: Stage wrapper + lazy IO mount in `Home.tsx` (default-export lazy, no unwrap — S7); Contact restyle; Footer rewrite (`.footer-name` + `.footer-bottom` meta row with EN/PT toggle); add `footer.location` to BOTH locales and validate JSON (S4)**
- [ ] **Step 4: Delete marquee + test + glyphPaths + extraction script; `npm uninstall opentype.js`; grep `glyphPaths|FooterNameMarquee|opentype` → zero hits**
- [ ] **Step 5: `npm run build && npm run test:unit && npm run test:e2e` → green (contact-waves included)**
- [ ] **Step 6: Commit — `git add -A && git commit -m "feat(contact,footer): lining-waves stage (canvas #2); typographic footer name; delete ink-draw remnants"`**

**Verify before returning:** suites green; the lazy check specifically: reload preview, confirm no three.js chunk in the network log before scrolling (Playwright request capture or devtools screenshot).

**Boundaries:** Hero untouched. `SmoothScroll`/Lenis untouched. Do not re-introduce center dimming or reminder props.

---

### Task 11: Nav dark restyle

**Spec TODO:** `- [ ] Nav restyled dark (MarqueeDivider absence verified — no work expected)`

**Routing:** editor-sonnet-low · low

**Files:**
- Modify: `src/index.css` (NAV section only)

**Interfaces:** consumes tokens from Task 2; Header.tsx markup unchanged (brand mark left, links center, EN/PT right — matches spec).

- [ ] **Step 1: Verify MarqueeDivider absence (spec decision 11)**

Run: `grep -rn "MarqueeDivider" src/ || echo "CLEAN: no MarqueeDivider"`
Expected: `CLEAN: no MarqueeDivider` (verified at plan time — this is the record).

- [ ] **Step 2: Apply the NAV restyle**

In the NAV section of `src/index.css`, apply exactly:
- `.nav.is-scrolled`: `background: rgba(11, 14, 20, 0.78);` (replaces `rgba(246, 249, 252, 0.85)`); `border-bottom: 1px solid var(--hairline);`
- `.nav-mark`: `background: var(--text); color: var(--bg);` (inverted tile)
- `.nav-mark__dot`: `background: var(--accent-blue);`
- `.nav-link`: `color: var(--text-faded);` hover `color: var(--text);` underline `background: var(--accent-blue);`
- `.nav-lang`: `color: var(--text);`
- **Delete the dead `.nav-brand-text` rule entirely (L3)** — the brand-text span is commented out in `Header.tsx`, so the rule has no element. (Removing it, not recoloring it.)
(Alias-driven values already close; make these literal rules read from the canonical tokens.)

- [ ] **Step 3: Build + e2e nav-dependent specs**

Run: `npm run build && npx playwright test tests/e2e/hero-entrance.spec.ts tests/e2e/dark-tokens.spec.ts --project=desktop-chromium`
Expected: green (`.nav.is-visible` assertion unaffected).

- [ ] **Step 4: Commit — `git add src/index.css && git commit -m "style(nav): dark restyle on canonical tokens"`**

**Verify before returning:** Step 3 output.

**Boundaries:** CSS only. No `Header.tsx` edits.

---

### Task 12: CLAUDE.md Design Direction rewrite + final verification

**Spec TODOs:**
- `- [ ] Work-first section order verified intact (baseline already work-first; no reorder work) with all content surviving the restyle`
- `- [ ] Bilingual EN/PT copy complete for every changed string`
- `- [ ] Contrast audit passes AA across all pairs; Lighthouse run against preview with measured baseline recorded in the plan`
- `- [ ] Full e2e suite green, including new mount smoke + reduced-motion specs; stale specs fixed as a pre-Task-1 batch`
- `- [ ] CLAUDE.md Design Direction section rewritten to describe the shipped dark/WebGL system`

**Routing:** implementer-sonnet-medium · medium

**Files:**
- Modify: `CLAUDE.md` (Design Direction section ONLY)

- [ ] **Step 1: Section order + content survival check**

Run: `grep -n "<Projects\|<Archive\|<WorkExperience\|<Stats\|<Skills\|<Contact\|<Footer" src/pages/Home.tsx`
Expected order: Projects, Archive, WorkExperience, Stats, Skills, Contact, Footer (work-first, matches spec decision 6 — no reorder was needed).

- [ ] **Step 2: Bilingual completeness check**

Run: `node -e "
const en=require('./src/i18n/locales/en.json'), pt=require('./src/i18n/locales/pt.json');
const flat=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&!Array.isArray(v)?flat(v,p+k+'.'):[p+k]);
const e=new Set(flat(en)), p=new Set(flat(pt));
const miss=[...e].filter(k=>!p.has(k)).concat([...p].filter(k=>!e.has(k)).map(k=>'EN missing: '+k));
console.log(miss.length?miss:'PARITY OK (known pre-existing gap: projectDetail.routesCount_* — acceptable)');
"`
Expected: parity OK modulo the documented pre-existing `routesCount_*` gap.

- [ ] **Step 3: Full suites**

Run: `npm run test:unit && npm run test:e2e`
Expected: ALL green — including `dark-tokens`, `hero-shader` (mount smoke, zero console errors), `hero-entrance` (+ reduced-motion fade), `rows-hover`, `contact-waves` (+ reduced-motion static), `section-enters`, `reduced-motion`, `perf-budget`.

> **Note (L1):** the reduced-motion shader specs assert `data-static="true"`, which is a *proxy* for the spec's "zero rAF loops" requirement — both canvas components set that attribute on the same code path that skips `requestAnimationFrame`/`setAnimationLoop`, so loop-absence is enforced by construction, not directly observed by the tests. If stronger evidence is ever wanted, add a `performance`-based rAF counter; not required for this plan.

- [ ] **Step 4: Lighthouse vs preview + LCP budget**

Run:
```bash
npm run build
npx vite preview --port 4173 &   # fresh preview AFTER the build (stale-sirv rule)
sleep 3
npx lighthouse http://localhost:4173 --preset=desktop --quiet --chrome-flags="--headless=new" --output=json --output-path=tmp/lh-final.json
node -e "const d=require('./tmp/lh-final.json'); for (const [k,v] of Object.entries(d.categories)) console.log(k, Math.round(v.score*100)); console.log('LCP', d.audits['largest-contentful-paint'].displayValue, '| LCP element:', JSON.stringify(d.audits['largest-contentful-paint-element']?.details?.items?.[0]?.items?.[0]?.node?.selector ?? 'n/a'))"
pkill -f "vite preview" || true

```
Expected vs baseline (perf 98 / a11y 100 / bp 100 / seo 100, LCP 0.8 s): Performance ≥ 90, Accessibility = 100, Best Practices = 100, SEO = 100, **LCP < 2.5 s** and the LCP element is the hero name text. Record the numbers in the task tick. If perf < 90 or LCP ≥ 2.5 s → STOP, report to orchestrator (Plan risk 1 lists the suspects; the hero entrance is inviolable — fix around it).

- [ ] **Step 5: Contrast spot-verification**

Run a Playwright one-off (or `node` + the plan's ratio function) confirming computed colors match the audited hexes: body text `rgb(245,242,236)` on `rgb(11,14,20)`; a `#archive` meta span resolves to `rgb(168,164,156)`; a hovered `#projects` first-row title resolves to `rgb(230,77,102)`. The audit table in this plan is the authority — any drift from those hexes is a defect.

- [ ] **Step 6: ProjectDetail smoke (Plan risk 4)**

Load `http://localhost:4173/projects/hotmart-bunde` (fresh preview): page renders, no invisible text (spot-check computed color vs background of the title + body), zero console errors.

- [ ] **Step 7: Rewrite the CLAUDE.md "Design Direction" section**

Replace the entire `## Design Direction` section (and ONLY it) with a description of the shipped system, sourced from this plan: dark ink tokens table (canonical names + hexes + the legacy-alias note), tricolor accents + `accentFor` rotation, FluidWavesHero + LiningWavesBackdrop (canvas budget 2, DPR 1.5, IO pause, reduced-motion static frame, no-WebGL fallback), monumental hero anatomy + GSAP entrance (~1.6 s, LCP = name text), WorkRow section language (anatomy, hover float, touch thumbnail, expandable, focus ring), scrim contrast rule, section flow, the NO-list updated (no light cream/sand theme, no bento cards, no ink-draw/scramble, no third canvas, no spaced em-dashes), and the standing rule that palette changes ship with a recomputed contrast audit. Keep every other CLAUDE.md section byte-identical.

- [ ] **Step 8: Commit — `git add CLAUDE.md && git commit -m "docs: Design Direction rewritten for the dark/WebGL system"`**

**Verify before returning:** paste Step 3 + Step 4 outputs verbatim. Kill any preview you started.

**Boundaries:** CLAUDE.md Design Direction section only — no other doc edits, no spec edits, no code changes. Any red discovered here is REPORTED, not hot-fixed (the orchestrator dispatches fixes).

---

## Spec TODO → Task map (1:1 coverage check)

| Spec TODO | Task(s) |
|---|---|
| Design tokens dark ink system | 2 |
| FluidWavesHero shader | 3 |
| Hero composition + ink-draw deleted | 4 |
| Entrance + LCP + reduced-motion fade | 4 |
| WorkRow primitive + reuse ×3 | 5 (+6, 7, 8) |
| Work-first order verified intact | 12 (verify-only; baseline-confirmed no-op) |
| Archive rows + filters + pipeline | 7 |
| Stats + Skills restyle | 9 |
| Contact/Footer + LiningWavesBackdrop | 10 |
| Nav restyled dark + marquee absence | 11 (absence verified at plan time: zero grep hits) |
| Bilingual EN/PT for changed strings | 4 (+ any task touching copy) + 12 parity check |
| Contrast audit + Lighthouse vs preview | plan tables (done) + 12 |
| Full e2e green + smokes + stale batch | 1 + 12 |
| CLAUDE.md Design Direction rewrite | 12 |
