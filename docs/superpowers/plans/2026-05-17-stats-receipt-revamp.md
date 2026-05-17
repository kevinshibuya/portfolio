# Stats Receipt Revamp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **After each step's command lands successfully, Edit the corresponding `- [ ]` to `- [x]` in this plan file before proceeding to the next step.** Do not modify the spec at `docs/superpowers/specs/2026-05-17-stats-receipt-revamp-design.md`.

**Goal:** Replace the centered 3-stat band after WorkExperience with a numbered editorial "receipt" of 4 rows that cite the two featured case studies (`painel da reconstrução`, `enquetes gzh`) with their own audited figures.

**Architecture:** Add a separate `statsReceipt` export alongside the existing `heroStats` so the Hero strip is untouched. The new Stats section reads `statsReceipt`, renders a two-column heading-left / rows-right layout at desktop, single column on mobile, with hairline dividers. CountUp is kept for pure-numeric rows (01, 02) and skipped for pre-formatted strings (03, 04). Case-study citations are real `<Link>`s to the project detail pages. All new CSS lives under new class names so existing Hero classes stay clean.

**Tech Stack:** React 19 + TypeScript (strict), TailwindCSS v4 via CSS `@theme` (we add raw CSS in `src/index.css`, no new Tailwind tokens needed), Framer Motion (existing `Stagger` recipe `stampIn`), `react-router-dom` `Link`, `react-i18next` for translations.

---

## File Structure

| File | Action | Responsibility |
| --- | --- | --- |
| `src/data/stats.ts` | Modify | Add `StatRow` interface + `statsReceipt` export; leave `heroStats` untouched |
| `src/i18n/locales/en.json` | Modify | Add `stats.heading`, `stats.eyebrow`, and 6 `stats.receipt.*` keys |
| `src/i18n/locales/pt.json` | Modify | Same keys with PT values |
| `src/components/sections/Stats.tsx` | Rewrite | Render two-column heading + numbered rows; reads `statsReceipt`; conditional CountUp; inline `<Link>` for case studies |
| `src/index.css` | Modify | Replace `.stats*` block (lines 1345–1369) with new layout + responsive rules |

No new components. No changes to `Hero.tsx`, `hero.stats.*` keys, `CountUp`, `Stagger`, `SectionHeading`, or any other section.

---

## Task 1: Add StatRow type + statsReceipt data

**Files:**
- Modify: `src/data/stats.ts`

- [ ] **Step 1: Open `src/data/stats.ts` and replace its full contents with the version below**

```ts
export interface Stat {
  /** Pre-formatted display value, e.g. "7+" — matches handoff. */
  value: string
  labelKey: string
}

export interface StatRow {
  /** Pre-formatted display value, e.g. "7+", "R$ 129B", "760k". */
  value: string
  /** i18n key for the annotation sentence (EN + PT). */
  annotationKey: string
  /** Optional case-study link rendered inline at the end of the annotation. */
  caseStudy?: {
    /** Matches `Project.slug` in `src/data/projects.ts`. */
    slug: string
    /** i18n key for the link text. */
    labelKey: string
  }
}

export const heroStats: Stat[] = [
  { value: '7+',   labelKey: 'hero.stats.years' },
  { value: '3+',   labelKey: 'hero.stats.projects' },
  { value: '250+', labelKey: 'hero.stats.embeds' },
]

export const statsReceipt: StatRow[] = [
  {
    value: '7+',
    annotationKey: 'stats.receipt.years',
  },
  {
    value: '250+',
    annotationKey: 'stats.receipt.interactives',
  },
  {
    value: 'R$ 129B',
    annotationKey: 'stats.receipt.reconstruction',
    caseStudy: {
      slug: 'painel-da-reconstrucao',
      labelKey: 'stats.receipt.reconstruction_cta',
    },
  },
  {
    value: '760k',
    annotationKey: 'stats.receipt.votes',
    caseStudy: {
      slug: 'enquetes-gzh',
      labelKey: 'stats.receipt.votes_cta',
    },
  },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). If you see "Cannot find name 'StatRow'" elsewhere, stop — Stats.tsx is rewritten in Task 3, not now.

- [ ] **Step 3: Commit**

```bash
git add src/data/stats.ts
git commit -m "feat(stats): add StatRow type + statsReceipt data"
```

---

## Task 2: Add i18n keys (EN + PT)

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

- [ ] **Step 1: Read `src/i18n/locales/en.json` and locate the top-level object's existing namespaces (`hero`, etc.). Insert a new top-level `stats` namespace at the same nesting depth as `hero`. Pick a location that keeps the file's existing alphabetical-ish order (between `nav`/`hero` and other surfaces) — exact placement is not critical as long as the JSON stays valid.**

Add this block to `src/i18n/locales/en.json`:

```json
"stats": {
  "heading": "the work, in <em>numbers.</em>",
  "eyebrow": "selected metrics —",
  "receipt": {
    "years": "years shipping interactives, from first commit to today.",
    "interactives": "interactives published across gauchazh.",
    "reconstruction": "in reconstruction spend tracked —",
    "reconstruction_cta": "painel da reconstrução",
    "votes": "live votes registered —",
    "votes_cta": "enquetes gzh"
  }
}
```

- [ ] **Step 2: Add the matching `stats` namespace to `src/i18n/locales/pt.json`**

```json
"stats": {
  "heading": "o trabalho, em <em>números.</em>",
  "eyebrow": "métricas selecionadas —",
  "receipt": {
    "years": "anos entregando interativos, do primeiro commit até hoje.",
    "interactives": "interativos publicados na gauchazh.",
    "reconstruction": "em recursos da reconstrução acompanhados —",
    "reconstruction_cta": "painel da reconstrução",
    "votes": "votos ao vivo registrados —",
    "votes_cta": "enquetes gzh"
  }
}
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json','utf8')); console.log('ok')"`
Expected output: `ok`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(stats): add stats.* i18n keys for receipt section"
```

---

## Task 3: Replace `.stats*` CSS block

**Files:**
- Modify: `src/index.css` (replace lines 1345–1369)

- [ ] **Step 1: Open `src/index.css` and find the existing block (the comment header is your anchor)**

Locate this block (around line 1345):

```css
/* Stats slim-band section. Reuses .hero-stat-v / .hero-stat-l for type
   styles so the relocated Hero stat numerals keep their 40px/700 weight. */
.stats {
  padding: 128px 80px;
}
.stats-inner {
  max-width: 1440px;
  margin: 0 auto;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  text-align: center;
}
.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
@media (max-width: 768px) {
  .stats { padding: 96px 24px; }
  .stats-grid { grid-template-columns: 1fr; gap: 32px; }
}
```

- [ ] **Step 2: Replace the block above (exactly that block — keep everything before and after untouched) with this new block**

```css
/* Stats numbered-receipt section. Two-column editorial layout on desktop
   (heading left, numbered rows right), single column on mobile. The
   slim-band/.hero-stat-* classes are no longer referenced from this
   section but stay in place for Hero. */
.stats {
  padding: 128px 80px;
  background: var(--cream);
}
.stats-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: 80px;
  align-items: start;
}
.stats-heading-col {
  position: sticky;
  top: 120px;
}
.stats-eyebrow {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--blue-500);
  text-transform: lowercase;
  letter-spacing: 0.15em;
  margin-bottom: 14px;
}
.stats-rows {
  position: relative;
  border-left: 1px solid var(--mist);
  padding-left: 80px;
  display: flex;
  flex-direction: column;
}
.stats-row {
  display: grid;
  grid-template-columns: 48px 200px 1fr;
  column-gap: 24px;
  align-items: baseline;
  padding: 28px 0;
  border-bottom: 1px solid var(--mist);
}
.stats-row:first-child { padding-top: 0; }
.stats-row:last-child { border-bottom: none; padding-bottom: 0; }
.stats-row-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--dust);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
}
.stats-row-value {
  font-size: 56px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.stats-row-ann {
  font-size: 16px;
  color: var(--bark);
  line-height: 1.6;
  text-transform: lowercase;
}
.stats-row-link {
  color: var(--blue-500);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-bottom-color 0.2s cubic-bezier(0.22, 1, 0.36, 1),
              color 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  margin-left: 6px;
}
.stats-row-link:hover {
  color: var(--blue-400);
  border-bottom-color: var(--blue-400);
}
.stats-row-link:focus-visible {
  outline: 2px solid var(--blue-300);
  outline-offset: 4px;
  border-radius: 2px;
}
@media (max-width: 1023px) {
  .stats { padding: 112px 48px; }
  .stats-inner { gap: 56px; }
  .stats-rows { padding-left: 48px; }
  .stats-row { grid-template-columns: 40px 140px 1fr; column-gap: 20px; }
  .stats-row-value { font-size: 48px; }
}
@media (max-width: 768px) {
  .stats { padding: 96px 24px; }
  .stats-inner {
    grid-template-columns: 1fr;
    gap: 48px;
  }
  .stats-heading-col { position: static; }
  .stats-rows {
    border-left: none;
    padding-left: 0;
  }
  .stats-row {
    grid-template-columns: 32px 110px 1fr;
    column-gap: 16px;
    padding: 24px 0;
  }
  .stats-row-value { font-size: 40px; }
  .stats-row-ann { font-size: 15px; }
}
```

- [ ] **Step 3: Verify the CSS file still parses (no missing braces, no duplicate selectors flagged)**

Run: `npx vite build 2>&1 | head -40`
Expected: build proceeds past CSS without parse errors. (It may fail later if Stats.tsx is broken — that's Task 4's territory and OK at this point; we just want CSS-level confidence here.) If you see a CSS syntax error, stop and fix it before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(stats): replace slim-band CSS with two-column receipt layout"
```

---

## Task 4: Rewrite Stats.tsx component

**Files:**
- Rewrite: `src/components/sections/Stats.tsx`

- [ ] **Step 1: Replace the full contents of `src/components/sections/Stats.tsx` with this version**

```tsx
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { useTranslation, Trans } from 'react-i18next'
import { Link } from 'react-router-dom'
import { statsReceipt, type StatRow } from '../../data/stats'
import { useMotion } from '../../context/MotionContext'
import { Stagger } from '../ui/Stagger'
import { STAGGER_PRESETS } from '../../utils/animations'

interface CountUpProps {
  target: number
  suffix: string
  durationMs?: number
}

function CountUp({ target, suffix, durationMs = 1400 }: CountUpProps) {
  const { prefersReducedMotion } = useMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [display, setDisplay] = useState(prefersReducedMotion ? target : 0)

  useEffect(() => {
    if (!inView || prefersReducedMotion) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, durationMs, prefersReducedMotion])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

/**
 * Detect whether a pre-formatted stat value is "pure numeric" — i.e.
 * digits plus an optional trailing `+`. Examples:
 *   "7+"        -> { numeric: 7, suffix: "+" }
 *   "250+"      -> { numeric: 250, suffix: "+" }
 *   "R$ 129B"   -> null (not pure numeric)
 *   "760k"      -> null (suffix has letters, not just "+")
 */
function parsePureNumeric(
  value: string,
): { numeric: number; suffix: string } | null {
  const match = /^(\d+)(\+?)$/.exec(value)
  if (!match) return null
  return { numeric: parseInt(match[1], 10), suffix: match[2] }
}

function ReceiptRow({ row, index }: { row: StatRow; index: number }) {
  const { t } = useTranslation()
  const num = String(index + 1).padStart(2, '0')
  const pure = parsePureNumeric(row.value)

  return (
    <div className="stats-row">
      <span className="stats-row-num">{num}</span>
      <span className="stats-row-value">
        {pure ? (
          <CountUp target={pure.numeric} suffix={pure.suffix} />
        ) : (
          row.value
        )}
      </span>
      <span className="stats-row-ann">
        {t(row.annotationKey)}
        {row.caseStudy && (
          <Link
            to={`/projects/${row.caseStudy.slug}`}
            className="stats-row-link"
          >
            {t(row.caseStudy.labelKey)}
          </Link>
        )}
      </span>
    </div>
  )
}

export function Stats() {
  const { t } = useTranslation()

  return (
    <section id="stats" className="stats">
      <div className="stats-inner">
        <div className="stats-heading-col">
          <span className="stats-eyebrow">{t('stats.eyebrow')}</span>
          <h2
            className="section-title"
            dangerouslySetInnerHTML={{ __html: t('stats.heading') }}
          />
        </div>
        <Stagger
          recipe="stampIn"
          stagger={STAGGER_PRESETS.statValues}
          className="stats-rows"
        >
          {statsReceipt.map((row, i) => (
            <ReceiptRow key={row.annotationKey} row={row} index={i} />
          ))}
        </Stagger>
      </div>
    </section>
  )
}
```

Notes for the implementer:

- The `Trans` import is included defensively in case you need to handle `<em>` interpolation inside annotations — but the current copy does not require it, so it is unused and you should **remove it** before committing if your linter complains. Keep `useTranslation`.
- The `<h2>` reuses the global `.section-title` class so the italic `<em>` accent in the heading inherits the established `blue-500` color from `src/index.css:622`. This is intentional and matches other sections.
- `STAGGER_PRESETS.statValues` is the same preset the previous Stats used — keeping it preserves the existing rhythm.
- `useInView` from `framer-motion` is already in this file; no new dependency.

- [ ] **Step 2: Run the typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If `Trans` is flagged as unused, remove `Trans` from the import line and rerun.

- [ ] **Step 3: Build and verify no errors**

Run: `npm run build`
Expected: clean build, no TS errors, no missing-module errors. Output ends with `✓ built in …`.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Stats.tsx
git commit -m "feat(stats): rewrite Stats as numbered receipt with case-study links"
```

---

## Task 5: Visual + Lighthouse verification

**Files:** none modified. This is a verification-only task.

- [ ] **Step 1: Start the dev server in the background**

Run: `npm run dev -- --port 5173 --strictPort` (run_in_background = true)
Expected: server boots and prints `Local: http://localhost:5173/`.

- [ ] **Step 2: Open `http://localhost:5173/` in the browser and scroll to the Stats section (between WorkExperience and Skills). Manually verify ALL of the following:**

  - [ ] Section heading renders as "the work, in *numbers.*" with the italic accent in blue.
  - [ ] Eyebrow "selected metrics —" sits above the heading.
  - [ ] 4 numbered rows render, in order: 01 / 02 / 03 / 04.
  - [ ] Row 01 value `7+` and Row 02 value `250+` animate upward via CountUp when first scrolled into view.
  - [ ] Row 03 value reads `R$ 129B` verbatim with no count-up.
  - [ ] Row 04 value reads `760k` verbatim with no count-up.
  - [ ] Row 03 annotation ends with a `painel da reconstrução` link styled in blue-500 with hover underline; clicking it navigates to `/projects/painel-da-reconstrucao`.
  - [ ] Row 04 annotation ends with an `enquetes gzh` link; clicking it navigates to `/projects/enquetes-gzh`.
  - [ ] The two-column desktop layout shows the heading column on the left, rows on the right, separated by the vertical hairline (left border of `.stats-rows`).

- [ ] **Step 3: Toggle the language switcher to PT and re-verify**

  - [ ] Heading becomes "o trabalho, em *números.*".
  - [ ] Row annotations switch to the PT strings.
  - [ ] Link labels remain `painel da reconstrução` and `enquetes gzh` (same in both languages).

- [ ] **Step 4: Resize the viewport / use devtools to verify responsive states**

  - [ ] At ~900px wide (tablet range), the two-column layout holds but value type shrinks to 48px and side padding reduces.
  - [ ] At ~400px wide (mobile), the layout collapses to a single column: heading on top, rows below, no vertical column hairline, value type at 40px.

- [ ] **Step 5: Verify reduced-motion path**

  - With the dev server still running, in devtools, open Rendering → "Emulate CSS media feature prefers-reduced-motion" → `reduce`.
  - Refresh the page.
  - Scroll to Stats: rows should appear in their final state. No CountUp tween, no Stagger transform. Values render fully (`7`, `250`, `R$ 129B`, `760k`).

- [ ] **Step 6: Stop the dev server**

Kill the background `npm run dev` process.

- [ ] **Step 7: Build for preview and audit Lighthouse**

```bash
npm run build
npm run preview -- --port 4173 --strictPort
```

Run `npm run preview` in the background. Then audit Lighthouse against `http://localhost:4173/` for the desktop home route. Compare to the most recent baseline noted in `docs/superpowers/specs/2026-05-09-lighthouse-95-design.md` (or the most recent prior Lighthouse run in the repo).

- [ ] **Step 8: Confirm acceptance**

  - [ ] Lighthouse Performance score: no regression beyond ±2 vs prior baseline (target ≥ 95 still met).
  - [ ] No new CLS regressions (Stats section has no images and uses fixed grid columns, so CLS should be unchanged).
  - [ ] No console errors in dev or preview.

- [ ] **Step 9: Stop preview server and final commit (if anything got tweaked during verification)**

Kill the background `npm run preview` process. If you had to make adjustments during verification, commit them now with a descriptive message. Otherwise, no commit needed for this task.

---

## Self-Review

This plan covers every TODO in the spec:

| Spec TODO | Plan task |
| --- | --- |
| stats.ts: add `StatRow` + `statsReceipt`, leave `heroStats` | Task 1 |
| i18n: 8 `stats.*` keys EN + PT | Task 2 |
| Stats.tsx rewrite: two-column heading + rows | Task 4 |
| Stats.tsx: conditional CountUp | Task 4 (`parsePureNumeric` helper) |
| index.css: replace `.stats*` block | Task 3 |
| Build passes | Task 4 Step 3 + Task 5 Step 7 |
| Dev visual verification | Task 5 Steps 2–5 |
| Preview Lighthouse no regression | Task 5 Steps 7–8 |

No placeholders. Types are consistent (`StatRow` defined once in Task 1, used by signature in Task 4). Order of tasks ensures Stats.tsx (Task 4) only runs after its imports (Task 1) and CSS classes (Task 3) exist; i18n keys (Task 2) similarly land before Task 4 reads them.
