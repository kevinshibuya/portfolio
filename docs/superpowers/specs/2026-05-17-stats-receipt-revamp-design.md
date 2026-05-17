# Stats Section Revamp — Numbered Receipt — Design

**Date:** 2026-05-17
**Owner:** Kevin Shibuya
**Scope:** Replace the existing centered 3-stat band (`src/components/sections/Stats.tsx`) with a numbered editorial "receipt" of 4 rows that ground the abstract craft numbers in two concrete case studies.

## Why

The current Stats section sits between WorkExperience and Skills as a slim 3-column band: `7+ years shipping / 3+ case studies / 250+ interactives shipped`, centered, with a count-up animation as the only motion. It reads as bland filler — the only thing it does on top of the hero stat row already shown earlier is repeat numbers with no extra context.

The revamp turns it into a section that does work the rest of the page can't:

- **Adds craft/process texture** the hero band doesn't carry — a "by the numbers" page where each row earns its own line of context.
- **Cites the case studies by name** with their own audited figures (R$ 129B reconstruction spend tracked, 760k live votes), so Stats becomes a callback that reinforces the Projects bento that appears earlier on the page.
- **Rhymes with the EmbedsGallery numbered-rows pattern**, tightening the editorial cohesion of the lower half of the page.

## Section position

Page order is **Projects → WorkExperience → Stats → Skills**. Because Projects renders before Stats, citing `painel da reconstrução` and `enquetes gzh` in rows 03/04 functions as reinforcement, not a forward reference.

## Content — final copy

### EN

```
the work, in numbers.

01   7+         years shipping interactives, from first commit to today.
02   250+       interactives published across gauchazh.
03   R$ 129B    in reconstruction spend tracked — painel da reconstrução.
04   760k       live votes registered — enquetes gzh.
```

### PT

```
o trabalho, em números.

01   7+         anos entregando interativos, do primeiro commit até hoje.
02   250+       interativos publicados na gauchazh.
03   R$ 129 bi  em recursos da reconstrução acompanhados — painel da reconstrução.
04   760 mil    votos ao vivo registrados — enquetes gzh.
```

Notes on the copy:

- Section heading uses the existing `SectionHeading` pattern (lowercase, em-tagged accent on the noun: "the work, in `<em>`numbers.`</em>`"). The italic span renders in `blue-400` per the design system.
- Row values stay as pre-formatted strings (matches the existing `Stat.value` shape in `src/data/stats.ts`), so we don't have to invent number formatters for `R$ 129B` and `760k`.
- The em-dash project citation in rows 03 and 04 is a **link** to the case study (`/projects/painel-da-reconstrucao` and `/projects/enquetes-gzh`). Underline-on-hover in `blue-400` matching the existing inline link treatment in About.
- Both heading and rows are lowercase per site convention. No terminal period on the section heading except the one already in the pattern.

## Structure & layout

### Wrapper

- Same outer `<section id="stats" className="stats">` shell to preserve existing page anchoring and lazy-load entrypoint in `src/pages/Home.tsx`.
- Padding stays at `128px 80px` desktop / `96px 24px` mobile (current values).
- Background stays cream (`var(--cream)`) — the bg sand is reserved for Skills/Embeds tonal sections.

### Inner layout — desktop (≥ 1024px)

A two-column editorial grid inside the `1440px` max-width container:

```
┌──────────────────────────┬─────────────────────────────────────────────────┐
│                          │                                                 │
│  the work, in            │   01   7+         years shipping interactives,  │
│  numbers.                │                   from first commit to today.   │
│                          │                                                 │
│  (eyebrow above heading) │   02   250+       interactives published        │
│  selected metrics —      │                   across gauchazh.              │
│                          │                                                 │
│                          │   03   R$ 129B    in reconstruction spend       │
│                          │                   tracked — painel da           │
│                          │                   reconstrução.                 │
│                          │                                                 │
│                          │   04   760k       live votes registered —       │
│                          │                   enquetes gzh.                 │
│                          │                                                 │
└──────────────────────────┴─────────────────────────────────────────────────┘
```

Column ratio approx **5 : 7** (left heading column narrower). Vertical hairline divider (`1px var(--mist)`) between columns. The left column has the eyebrow `selected metrics —` (uppercase 11px, dust color, 0.08em tracking) above the heading, matching the eyebrow pattern used elsewhere on the page.

Each row in the right column is a CSS grid of three cells:

| Cell | Width | Style |
| --- | --- | --- |
| Number (`01`–`04`) | 48px fixed | `font-size: 13px`, `dust` color, `tabular-nums`, top-aligned with the value baseline |
| Value (`7+`, `R$ 129B`…) | 180px fixed | `font-size: 56px`, `font-weight: 700`, `ink` color, `letter-spacing: -0.02em`, `tabular-nums`, `line-height: 1` |
| Annotation | flexes | `font-size: 16px`, `bark` color, `line-height: 1.6`, top-aligned with the value baseline |

Row gap: 32px between rows. A hairline divider (`1px var(--mist)`) between each pair of rows, full-width inside the right column.

### Inner layout — tablet (768 – 1023px)

Same two-column structure, but the value cell shrinks to ~140px and the value font-size scales down to `48px`. Side padding drops to `48px`.

### Inner layout — mobile (< 768px)

Single column. Heading + eyebrow stack on top with 48px bottom margin. Rows below — each row keeps the three-cell sub-grid but the value cell shrinks to ~110px and the value font-size drops to `40px`. Annotation reflows naturally. Hairline dividers between rows remain. No vertical column divider on mobile.

## Animations

Follow the existing pattern (current Stats uses `Stagger` with `stampIn` recipe + `STAGGER_PRESETS.statValues`):

- **Section enter**: when the section crosses `amount: 0.4`, each row staggers in with the existing `stampIn` recipe (the count-up underneath each value still runs per-row using the existing `CountUp` component).
- **Count-up**: keep `CountUp` for the numeric portion of rows where the value is purely numeric (rows 01, 02). For `R$ 129B` and `760k`, the value is a pre-formatted string that does NOT count up — it just fades/stamps in with the row. The implementation needs to detect "is this value pure-numeric or pre-formatted" cheaply (e.g., regex check for non-digit chars beyond `+`) and skip CountUp when not pure-numeric. The existing `parsed.suffix` field already isolates the non-digit tail, so this is a small extension, not a refactor.
- **Heading**: section heading uses the existing `SectionHeading` component which already handles its own enter animation.
- **Reduced-motion**: respected via existing `useMotion()` / `prefersReducedMotion` checks. Final state should be the static layout — no transforms applied.

No new animation library or pattern is introduced. No GSAP, no R3F.

## Data model changes

`src/data/stats.ts` currently exports `heroStats: Stat[]` keyed by `labelKey`. Two complications:

1. The new section has 4 rows (was 3), and the annotation is longer than a single label.
2. The hero stat row at the top of the page (in `Hero.tsx`) still reads from `heroStats` for its existing 3-stat strip. We must NOT break the hero.

Decision: keep `heroStats` exactly as-is (still 3 entries) for `Hero.tsx`. Introduce a new export `statsReceipt: StatRow[]` with its own type that the Stats section consumes. The two surfaces have different needs — the hero wants a tight label, the receipt wants an annotation with an optional case-study link.

```ts
// src/data/stats.ts
export interface Stat {
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
    slug: string                 // matches src/data/projects.ts -> Project.slug
    labelKey: string             // i18n key for the link text, e.g. "painel da reconstrução"
  }
}

export const heroStats: Stat[] = [ /* unchanged */ ]

export const statsReceipt: StatRow[] = [
  { value: '7+',     annotationKey: 'stats.receipt.years' },
  { value: '250+',   annotationKey: 'stats.receipt.interactives' },
  { value: 'R$ 129B', annotationKey: 'stats.receipt.reconstruction',
    caseStudy: { slug: 'painel-da-reconstrucao', labelKey: 'stats.receipt.reconstruction_cta' } },
  { value: '760k',   annotationKey: 'stats.receipt.votes',
    caseStudy: { slug: 'enquetes-gzh', labelKey: 'stats.receipt.votes_cta' } },
]
```

The `caseStudy.labelKey` is split out so the link text is fully translatable and the en-dash + link order is rendered by the component, not hard-coded into the annotation string.

### i18n keys added

To `src/i18n/locales/en.json` (and parallel PT) under a new `stats` namespace at the top level. PT mirrors EN keys.

| Key | EN value | PT value |
| --- | --- | --- |
| `stats.heading` | `the work, in <em>numbers.</em>` | `o trabalho, em <em>números.</em>` |
| `stats.eyebrow` | `selected metrics —` | `métricas selecionadas —` |
| `stats.receipt.years` | `years shipping interactives, from first commit to today.` | `anos entregando interativos, do primeiro commit até hoje.` |
| `stats.receipt.interactives` | `interactives published across gauchazh.` | `interativos publicados na gauchazh.` |
| `stats.receipt.reconstruction` | `in reconstruction spend tracked —` | `em recursos da reconstrução acompanhados —` |
| `stats.receipt.reconstruction_cta` | `painel da reconstrução` | `painel da reconstrução` |
| `stats.receipt.votes` | `live votes registered —` | `votos ao vivo registrados —` |
| `stats.receipt.votes_cta` | `enquetes gzh` | `enquetes gzh` |

The trailing em-dash on rows 03/04 annotations is part of the annotation string itself; the component renders the link immediately after, on the same line.

The hero retains its existing keys at `hero.stats.*` — those entries are unchanged.

### Hero stat strip — leave as-is

`hero.stats.projects` ("case studies") was the third hero stat. Even though we dropped the equivalent row from the new Stats section, the hero strip keeps it for now — that row in the hero serves a different purpose (top-of-page proof of variety). If the user later wants the hero strip aligned with this section, that's a follow-up out of scope.

## Components touched

- **`src/components/sections/Stats.tsx`** — rewritten end-to-end. New JSX structure (two-column heading + rows), reads from `statsReceipt`, renders each row with the three-cell sub-grid, uses `Stagger` with `stampIn`. Keeps `CountUp` for pure-numeric values; skips it for pre-formatted ones. Renders case-study link via `react-router-dom`'s `Link` (consistent with how Projects bento links to detail pages).
- **`src/data/stats.ts`** — add `StatRow` type + `statsReceipt` export. Do NOT touch `heroStats`.
- **`src/i18n/locales/en.json`, `src/i18n/locales/pt.json`** — add `stats.heading`, `stats.eyebrow`, and the 6 `stats.receipt.*` keys above.
- **`src/index.css`** — the existing `.stats`, `.stats-inner`, `.stats-grid`, `.stats-item` block (lines 1345–1369) is replaced with a new block covering the two-column heading layout, the row sub-grid, the hairline dividers, and responsive breakpoints. Class names: `.stats`, `.stats-inner`, `.stats-heading-col`, `.stats-eyebrow`, `.stats-rows`, `.stats-row`, `.stats-row-num`, `.stats-row-value`, `.stats-row-ann`, `.stats-row-link`.

## Acceptance criteria

The implementation is done when ALL of these are true:

- [ ] `src/data/stats.ts` exports both `heroStats` (unchanged) and a new `statsReceipt: StatRow[]` with 4 entries matching the spec.
- [ ] `src/i18n/locales/en.json` and `pt.json` contain the new `stats.*` keys listed in the table above with exactly the EN/PT values shown.
- [ ] `src/components/sections/Stats.tsx` is rewritten to render the two-column heading + rows layout, reading from `statsReceipt`, rendering 4 rows in the order defined.
- [ ] Rows 01 and 02 (pure-numeric values `7+`, `250+`) still count up via the existing `CountUp` component when first scrolled into view.
- [ ] Rows 03 and 04 (`R$ 129B`, `760k`) render their pre-formatted value verbatim — no count-up — but still participate in the `Stagger` enter animation.
- [ ] The em-dash → case-study link is rendered as a real `<Link>` to `/projects/painel-da-reconstrucao` (row 03) and `/projects/enquetes-gzh` (row 04). Hover state: underline + `blue-400` color.
- [ ] The section heading uses `SectionHeading` (or matching markup) with the italic `<em>` accent rendering in `blue-400`.
- [ ] At ≥ 1024px the layout shows two columns separated by a vertical hairline; at < 768px it collapses to a single column. The 768–1023px tablet treatment matches the spec table.
- [ ] When `prefers-reduced-motion: reduce` is set, the section renders in its final state with no transforms or count-up animations.
- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] `npm run dev` shows the new section visually and the live route `/projects/painel-da-reconstrucao` resolves when the link is clicked.
- [ ] The Lighthouse score on `npm run preview` for the home route is not lower than the current baseline (a Stats revamp should not introduce a regression; CLS, LCP unchanged).
- [ ] No changes to `Hero.tsx`, `hero.stats.*` translations, or any other section.

## Out of scope

- The Hero stat strip at the top of the page (still 3 stats from `heroStats`).
- Any refactor of `CountUp`, `Stagger`, or `SectionHeading`.
- Adding a 5th row or any third project citation — the user explicitly chose to drop row 05.
- Changes to `MarqueeDivider` placement around Stats.

## TODO

- [ ] `src/data/stats.ts`: add `StatRow` interface + `statsReceipt` export; leave `heroStats` untouched.
- [ ] `src/i18n/locales/en.json` + `pt.json`: add `stats.heading`, `stats.eyebrow`, and 6 `stats.receipt.*` keys per the table.
- [ ] `src/components/sections/Stats.tsx`: rewrite to render two-column heading + rows; reads from `statsReceipt`; renders inline case-study link via `<Link>`.
- [ ] `src/components/sections/Stats.tsx`: keep `CountUp` for pure-numeric values, skip it for pre-formatted strings.
- [ ] `src/index.css`: replace the existing `.stats*` block (lines 1345–1369) with the new layout + responsive rules.
- [ ] Verify `npm run build` passes with no TS errors.
- [ ] Verify `npm run dev`: section renders correctly, case-study links navigate, count-up animates on rows 01–02, no count-up on rows 03–04, reduced-motion respected.
- [ ] Verify `npm run preview` Lighthouse score has no regression vs current baseline.
