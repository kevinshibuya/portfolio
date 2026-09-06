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

Ratified 2026-09-02; derived in `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md`. Grounds: cream `#F5F2EC` (Selected Work, Work Experience, Stats, and the wrapper), tonal cream `#EDE9E0` (Archive, Skills; also the `.pill` surface), white `#FFFFFF` (card interiors only).

| # | pair (element → color it resolves to) | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 1 | `.section-title`, `.workrow-title`, `.stats-row-value`, `.skills-title`, `.archive-count strong`, dropdown text, search text, `.work-highlight p`, `.pill:hover` text → ink `#0B0E14` | cream / tonal | 17.29 / 15.94 | 4.5 | ✅ |
| 2 | `.section-desc`, `.workrow-meta` (+ `·` separators), `.workrow-ornament`, `.workrow-panel`, `.stats-row-num`, `.stats-row-ann`, `.skills-num`, `.skills-item`, `.archive-chip`, dropdown label/caret/options, `.archive-count`, search placeholder, `.work-meta-line`, `.work-location`, `.work-mode-pill`, `.work-bullets li`, `.pill` → muted `rgba(11,14,20,.62)` | cream / tonal | 5.23 / 5.11 | 4.5 | ✅ |
| 3 | `.workrow-index` only (`aria-hidden="true"`, pure ordinal) → faded `rgba(11,14,20,.40)` | cream / tonal | 2.62 / 2.59 | exempt (WCAG 1.4.3 note 1, decorative; matches `.contact-num`) | ✅ exempt |
| 3b | `.workrow-arrow` → muted `rgba(11,14,20,.62)`. NOT on the faded step: on the expandable row it is the only visible cue that the row opens, inside a `<button aria-expanded>`, so WCAG **1.4.11** (3:1, state indicator) applies and `aria-hidden` does not exempt it | cream / tonal | 5.23 / 5.11 | 3.0 | ✅ |
| 4 | `.section-title em`, `.stats-row-link`, `.archive-star`, dropdown `.is-selected` → deep blue `#2A54B5` | cream / tonal | 6.20 / 5.71 | 4.5 | ✅ |
| 5 | `.work-highlight-label` (10px uppercase, always visible on the expanded row) → `--row-tint-deep`: `#B22B47` / `#2A54B5` / ink-muted | cream | 5.64 / 6.20 / 5.23 | 4.5 | ✅ |
| 6 | WorkRow title hover tint, pink slot → `#B22B47` | cream / tonal | 5.64 / 5.21 | 3.0 (large, ≥28px) | ✅ |
| 7 | WorkRow title hover tint, blue slot → `#2A54B5` | cream / tonal | 6.20 / 5.71 | 3.0 | ✅ |
| 8 | WorkRow title hover tint, yellow slot → `#7A6800` | cream / tonal | 4.94 / 4.55 | 3.0 | ✅ (also clears 4.5; the small-text substitution is aesthetic) |
| 9 | `.btn--ghost` (Archive load-more) text + border → ink; hover → cream on ink | tonal; ink | 15.94; 17.29 | 4.5 | ✅ |
| 10 | focus rings: `.workrow-*:focus-visible` outline → ink; `.stats-row-link:focus-visible` → deep blue; `.archive-search:focus` border → deep blue | cream / tonal | 15.94+; 5.71+ | 3.0 (non-text) | ✅ |
| 11 | `::selection` inside the chapter → cream text on deep blue | deep blue | 6.20 | 4.5 | ✅ |
| 12 | decorative, no text: hairlines `rgba(11,14,20,.12)`; `.skills-dot`; `.skills-item:hover` dashed border; `.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border-left (all three → `--row-tint-deep-large`, so the yellow slot is olive `#7A6800`, visible, not raw `#E6CC4D` at 1.43); `.work-mode-pill` bg `rgba(11,14,20,.06)`; `.work-highlight` bg `rgba(11,14,20,.04)`; `.pill` bg tonal + hairline border; `.pill:hover` bg `rgba(11,14,20,.06)` + deep-blue border | any | decorative | n/a | ✅ |
| 13 | nav-on-light over tonal cream: link muted on `rgba(245,242,236,.85)`-over-`#EDE9E0` | ≈ cream | ≥ 5.1 | 4.5 | ✅ |
| 14 | tonal cream vs cream adjacency (Archive/Skills edges against the cream sections; `.pill` on cream) | n/a | 1.08 | n/a | ✅ (a tonal step, same role as `#131722` vs `#0B0E14` on dark) |
| 15 | Selected Work caption on the card's white band: name ink `#0B0E14`; subtitle `rgba(11,14,20,.62)` composited on white ≈ `#686A6D`; the `↗` is decorative (`accentDeepLargeFor`) | white `#FFFFFF` | 19.32 / 5.42 | 4.5 | ✅ (rasterised text, not DOM; computed 2026-09-05) |
