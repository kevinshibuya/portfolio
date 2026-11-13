# Contrast

The AA audit for every text/background pair on the site. The tokens themselves live in `src/index.css`.

**Standing rule:** any palette or token change ships with a recomputed AA contrast audit across every affected text/background pair, verified, not hoped. Recompute this file as a unit; do not change a hex without redoing the table it appears in.

## Contact/Footer stage over the dimmed backdrop

Ratified with webgl-pivot Task 7. The Contact/Footer stage's `FluidWaves` backdrop canvas composites at `.fluid-waves-canvas--backdrop { opacity: 0.22; filter: saturate(0.7); }` over `--bg` `#0B0E14`. Note `0.22`, not the spec's ~0.32: this lower value is what makes the table below pass. Worst case = brightest tricolor `#E6CC4D` under `saturate(0.7)` composited at `0.22` over `#0B0E14` ≈ `rgb(57,56,41)`.

| Contact/Footer text | color | size | ratio | AA needed | verdict |
|---|---|---|---|---|---|
| `.contact-title` | `--text` cream | huge | 8.9:1 | 3.0 (large) | ✅ |
| `.contact-title em` | `--blue-300` #7AA0ED | huge | 4.58:1 | 3.0 (large) | ✅ |
| `.contact-lede` | rgba(246,249,252,.6) | 18px | 5.19:1 | 4.5 | ✅ |
| `.contact-label` | `--text` cream | 20–32px | 8.9:1 | 4.5 | ✅ |
| `.contact-icon` | `--blue-200` | 16px | 4.58:1 | 4.5 | ✅ |
| `.footer-name` | `--text` cream | huge | 8.9:1 | 3.0 | ✅ |
| `.footer-*` meta / `.footer-lang` | `--text-faded` #A8A49C | 11px | 4.79:1 | 4.5 | ✅ |
| `.contact-num` | rgba(246,249,252,.4) | 10px | 3.19:1 | n/a | ✅ decorative exemption (`aria-hidden="true"`, WCAG 1.4.3 note 1, matches `.workrow-index`, `WorkRow.tsx`) |
| `.contact-meta` | rgba(245,242,236,.62) | 13px, hover-revealed | 5.17:1 | 4.5 | ✅ (remedy: alpha `.5`→`.62`) |

All always-visible pairs are ≥4.5:1 (or ≥3.0:1 for large text). `.contact-num` is purely ordinal enumeration (`'01'..'04'`) with no semantic role, and its accessible name comes from `.contact-label`/`href`, so it is marked `aria-hidden="true"` and exempt from 1.4.3, the same pattern already used by `.workrow-index`; no recolor needed. `.contact-meta` (the real hover-revealed email/@handle/cv-filename text) got its color alpha raised `0.5`→`0.62` (4.95:1→5.17:1). Its `opacity: 0→1` hover-reveal transition is a separate mechanism, untouched by that change.

## Light chapter, Plan B

Ratified 2026-09-02; derived in `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md`. Recomputed as a unit 2026-11-13 for ADR 0014: the Numbers section, the archive wall and the hidden Stream are gone from the chapter, and More work and the card links are in it. Grounds: cream `#F5F2EC` (Selected Work with More work, Work Experience, and the wrapper), tonal cream `#EDE9E0` (Skills; also the `.pill` surface), white `#FFFFFF` (card interiors only).

| # | pair (element → color it resolves to) | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 1 | `.section-title`, `.workrow-title` (Work Experience and More work), `.more-work-volume a`, `.skills-title`, `.work-highlight p`, `.pill:hover` text → ink `#0B0E14` | cream / tonal | 17.29 / 15.94 | 4.5 | ✅ |
| 2 | `.section-desc`, `.workrow-meta` (+ `·` separators; More work's `year · tech · tech`), `.workrow-panel`, `.more-work-volume` (the volume sentence's claim and its `·`), `.skills-num`, `.skills-item`, `.work-meta-line`, `.work-location`, `.work-mode-pill`, `.work-bullets li`, `.pill` → muted `rgba(11,14,20,.62)` | cream / tonal | 5.23 / 5.11 | 4.5 | ✅ |
| 3 | `.workrow-index` only (`aria-hidden="true"`, pure ordinal) → faded `rgba(11,14,20,.40)` | cream / tonal | 2.62 / 2.59 | exempt (WCAG 1.4.3 note 1, decorative; matches `.contact-num`) | ✅ exempt |
| 3b | `.workrow-arrow` → muted `rgba(11,14,20,.62)`. NOT on the faded step: on the expandable row it is the only visible cue that the row opens, inside a `<button aria-expanded>`, so WCAG **1.4.11** (3:1, state indicator) applies and `aria-hidden` does not exempt it | cream / tonal | 5.23 / 5.11 | 3.0 | ✅ |
| 4 | `.section-title em` → deep blue `#2A54B5` | cream / tonal | 6.20 / 5.71 | 4.5 | ✅ |
| 5 | `.work-highlight-label` (10px uppercase, always visible on the expanded row) → `--row-tint-deep`: `#B22B47` / `#2A54B5` / ink-muted | cream | 5.64 / 6.20 / 5.23 | 4.5 | ✅ |
| 6 | WorkRow title hover tint, pink slot → `#B22B47` | cream / tonal | 5.64 / 5.21 | 3.0 (large: `.workrow-title` is `clamp(28px, 4.6vw, 64px)`, at least 28 px against the 24 px line for weight 550, on Work Experience and More work alike) | ✅ |
| 7 | WorkRow title hover tint, blue slot → `#2A54B5` | cream / tonal | 6.20 / 5.71 | 3.0 | ✅ |
| 8 | WorkRow title hover tint, yellow slot → `#7A6800` | cream / tonal | 4.94 / 4.55 | 3.0 | ✅ (also clears 4.5) |
| 10 | focus rings: `.workrow-*:focus-visible` and `.more-work-volume a:focus-visible` outlines → ink | cream / tonal | 15.94+ | 3.0 (non-text) | ✅ |
| 11 | `::selection` inside the chapter → cream text on deep blue | deep blue | 6.20 | 4.5 | ✅ |
| 12 | decorative, no text: hairlines `rgba(11,14,20,.12)`; `.skills-dot`; `.skills-item:hover` dashed border; `.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border-left (all three → `--row-tint-deep-large`, so the yellow slot is olive `#7A6800`, visible, not raw `#E6CC4D` at 1.43); `.work-mode-pill` bg `rgba(11,14,20,.06)`; `.work-highlight` bg `rgba(11,14,20,.04)`; `.pill` bg tonal + hairline border; `.pill:hover` bg `rgba(11,14,20,.06)` + deep-blue border | any | decorative | n/a | ✅ |
| 13 | nav-on-light over tonal cream: link muted on `rgba(245,242,236,.85)`-over-`#EDE9E0` | ≈ cream | ≥ 5.1 | 4.5 | ✅ |
| 14 | tonal cream vs cream adjacency (the Skills edge against the cream sections; `.pill` on cream) | n/a | 1.08 | n/a | ✅ (a tonal step, same role as `#131722` vs `#0B0E14` on dark) |
| 15 | Selected Work caption on the card's white band: name ink `#0B0E14`; subtitle `rgba(11,14,20,.62)` composited on white ≈ `#686A6D`; the `↗` is decorative (`accentDeepLargeFor`) | white `#FFFFFF` | 19.32 / 5.42 | 4.5 | ✅ (rasterised text, not DOM; computed 2026-09-05) |
| 20 | card links (`.scene-cardlink`), the focused pill: `var(--text)` on `var(--bg)`, which inside the chapter resolves to ink on cream, 14 px at weight 500, with a `var(--hairline)` border and a 2 px `var(--text)` outline, so ink; unfocused, the link is clipped to 1 px and shows nothing | cream | 17.29 | 4.5 (text), 3.0 (ring) | ✅ |

**Retired rows are not renumbered**, so earlier references still resolve:

- **Row 9** covered the paging button of a section this chapter no longer has; `.btn--ghost` survives only on the project-detail route, outside this chapter.
- **Rows 16 to 18** covered the archive wall's rasterised cell titles, meta and serials. The wall was deleted with the scene's act two (ADR 0014).
- **Row 19** covered the Stream's visible state inside the chapter, the no-WebGL archive. The Stream no longer renders on the homepage in any state; its only page is All work, on ink, in the table below.

## All work, on ink

Computed 2026-10-18 for `/all-work` (ADR 0014), recomputed with the light chapter's table on 2026-11-13. The Stream renders nowhere else, so this table is the Stream's whole audit. The page sits outside the light chapter, so the Stream's canonical tokens resolve to the cream steps and its rows lift on `--row-tint`, the raw tricolor from `accentFor()`; neither deep channel is read on this page. Ground: page ink `#0B0E14` (nothing between `body` and the Stream paints its own; `tests/e2e/all-work.spec.ts` asserts it).

| # | pair (element → color it resolves to) | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 1 | `.stream-title` (the page `h1`), `.stream-year-label`, `.stream-row-title`, `.workrow-title` → cream `#F5F2EC`. The first three set an explicit `color: var(--text)` rather than inherit `body`'s, a rule from 2026-09-11, when the Stream also rendered inside the light chapter and the inherited cream went cream on cream there | ink | 17.29 | 4.5 | ✅ |
| 2 | `.stream-total`, `.stream-year-count`, `.stream-serial`, `.stream-row-meta`, `.stream-row-arrow`, and the back link `.project-detail-back` (`--bark`) → muted `#C9C4BA` | ink | 11.12 | 4.5 | ✅ |
| 3 | `.workrow-meta` (the origin word, the only origin mark the Stream renders), its `·`, the `.stream-row-meta-item` `·` separators, `.workrow-arrow` → faded `#A8A49C` | ink | 7.78 | 4.5 | ✅ |
| 4 | title lift on hover and `:focus-within`, both row kinds → `--row-tint`: pink `#E64D66` / blue `#4D80E6` / yellow `#E6CC4D`. The editorial title is 17 px, under the large-text line, so every slot takes the 4.5 bar; the yellow rule is an on-light rule and does not apply on ink | ink | 5.17 / 5.10 / 12.06 | 4.5 | ✅ |
| 5 | back link hover → `--blue-400` `#4D80E6`; the lifted arrow and index → cream | ink | 5.10; 17.29 | 4.5 | ✅ |
| 6 | focus rings on `.stream-row` and `.workrow-link` → cream outline | ink | 17.29 | 3.0 (non-text) | ✅ |
