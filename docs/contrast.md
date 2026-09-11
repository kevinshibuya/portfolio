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

Ratified 2026-09-02; derived in `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md`. Grounds: cream `#F5F2EC` (Selected Work, Work Experience, Stats, and the wrapper), tonal cream `#EDE9E0` (Skills; also the `.pill` surface), white `#FFFFFF` (card interiors only).

| # | pair (element → color it resolves to) | ground | ratio | need | verdict |
|---|---|---|---|---|---|
| 1 | `.section-title`, `.workrow-title`, `.stats-row-value`, `.skills-title`, `.work-highlight p`, `.pill:hover` text → ink `#0B0E14` | cream / tonal | 17.29 / 15.94 | 4.5 | ✅ |
| 2 | `.section-desc`, `.workrow-meta` (+ `·` separators), `.workrow-panel`, `.stats-row-num`, `.stats-row-ann`, `.skills-num`, `.skills-item`, `.work-meta-line`, `.work-location`, `.work-mode-pill`, `.work-bullets li`, `.pill` → muted `rgba(11,14,20,.62)` | cream / tonal | 5.23 / 5.11 | 4.5 | ✅ |
| 3 | `.workrow-index` only (`aria-hidden="true"`, pure ordinal) → faded `rgba(11,14,20,.40)` | cream / tonal | 2.62 / 2.59 | exempt (WCAG 1.4.3 note 1, decorative; matches `.contact-num`) | ✅ exempt |
| 3b | `.workrow-arrow` → muted `rgba(11,14,20,.62)`. NOT on the faded step: on the expandable row it is the only visible cue that the row opens, inside a `<button aria-expanded>`, so WCAG **1.4.11** (3:1, state indicator) applies and `aria-hidden` does not exempt it | cream / tonal | 5.23 / 5.11 | 3.0 | ✅ |
| 4 | `.section-title em`, `.stats-row-link` → deep blue `#2A54B5` | cream / tonal | 6.20 / 5.71 | 4.5 | ✅ |
| 5 | `.work-highlight-label` (10px uppercase, always visible on the expanded row) → `--row-tint-deep`: `#B22B47` / `#2A54B5` / ink-muted | cream | 5.64 / 6.20 / 5.23 | 4.5 | ✅ |
| 6 | WorkRow title hover tint, pink slot → `#B22B47` | cream / tonal | 5.64 / 5.21 | 3.0 (large, ≥28px) | ✅ |
| 7 | WorkRow title hover tint, blue slot → `#2A54B5` | cream / tonal | 6.20 / 5.71 | 3.0 | ✅ |
| 8 | WorkRow title hover tint, yellow slot → `#7A6800` | cream / tonal | 4.94 / 4.55 | 3.0 | ✅ (also clears 4.5; the small-text substitution is aesthetic) |
| 10 | focus rings: `.workrow-*:focus-visible` outline → ink; `.stats-row-link:focus-visible` → deep blue | cream / tonal | 15.94+; 5.71+ | 3.0 (non-text) | ✅ |
| 11 | `::selection` inside the chapter → cream text on deep blue | deep blue | 6.20 | 4.5 | ✅ |
| 12 | decorative, no text: hairlines `rgba(11,14,20,.12)`; `.skills-dot`; `.skills-item:hover` dashed border; `.work-mode-dot`, `.work-bullets li::before`, `.work-highlight` border-left (all three → `--row-tint-deep-large`, so the yellow slot is olive `#7A6800`, visible, not raw `#E6CC4D` at 1.43); `.work-mode-pill` bg `rgba(11,14,20,.06)`; `.work-highlight` bg `rgba(11,14,20,.04)`; `.pill` bg tonal + hairline border; `.pill:hover` bg `rgba(11,14,20,.06)` + deep-blue border | any | decorative | n/a | ✅ |
| 13 | nav-on-light over tonal cream: link muted on `rgba(245,242,236,.85)`-over-`#EDE9E0` | ≈ cream | ≥ 5.1 | 4.5 | ✅ |
| 14 | tonal cream vs cream adjacency (the Skills edge against the cream sections; `.pill` on cream) | n/a | 1.08 | n/a | ✅ (a tonal step, same role as `#131722` vs `#0B0E14` on dark) |
| 15 | Selected Work caption on the card's white band: name ink `#0B0E14`; subtitle `rgba(11,14,20,.62)` composited on white ≈ `#686A6D`; the `↗` is decorative (`accentDeepLargeFor`) | white `#FFFFFF` | 19.32 / 5.42 | 4.5 | ✅ (rasterised text, not DOM; computed 2026-09-05) |
| 16 | wall cell title, `professional` → ink `#0B0E14`, rasterised onto the wall's cream | cream | 17.29 | 4.5 | ✅ |
| 17 | wall cell title, `freelance` → `#B22B47`; `personal` → `#2A54B5`. Size at the approach's end, from `friezeLegibility.test.ts`: desktop **20.43 px** (1440×900), 24.51 px (1920×1080); phone **17.28 px** (320×568), 19.16 px (390×844). Both hexes clear 4.5 at any size, so the size does not change the verdict; it is recorded because the spec asks for it, and the phone figures are recorded, not asserted (assumption 16) | cream | 5.64 / 6.20 | 4.5 | ✅ |
| 18 | wall cell meta and serial → muted `rgba(11,14,20,.62)` composited on cream ≈ `#646566`, drawn at `CELL_META_WORLD = 0.04`: desktop **13.62 px** (1440×900), 16.34 px (1920×1080); phone **11.52 px** (320×568), 12.77 px (390×844). Wall hover lift → `accentDeepLargeFor`: `#B22B47` / `#2A54B5` / `#7A6800` | cream | 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 19 | stream, visible state: `.stream-title`, `.stream-year-label`, `.workrow-title`, `.stream-row-title` → ink; `.stream-total`, `.stream-year-count`, `.stream-serial`, `.stream-row-meta`, `.workrow-meta` (the origin word), `.stream-row-arrow`, `.workrow-arrow` → muted; hover AND `:focus-within` lift → the deep-large triplet. The title is 17 px, under the 18.67 px large-text line, so the yellow slot takes the 4.5 bar and clears it | cream | 17.29; 5.23; 5.64 / 6.20 / 4.94 | 4.5 | ✅ |
| 20 | stream, hidden state: the focused pill is `var(--text)` on `var(--bg)`, which inside the chapter resolves to ink on cream, with a `var(--hairline)` border and an ink outline; the pill's own `:focus-within` lift takes `.stream-row-title` to `--row-tint-deep-large` on that same cream, at the pill's 14 px; focus rings on the visible state → ink | cream | 17.29; 5.64 / 6.20 / 4.94 | 4.5 (text), 3.0 (ring) | ✅ |

**Row 9 is retired, not renumbered.** It covered the paging button of the section this chapter no longer has;
`.btn--ghost` survives only on the project-detail route, outside this chapter. The numbering is left as it is
so earlier references still resolve.

**Rows 16 to 18 are rasterised text on a canvas, not DOM.** The sizes come from
`tests/unit/friezeLegibility.test.ts`, measured at the END of the approach beat — the moment the reader first
has to read the wall, and the only act-two beat where the camera is square to it, so a pitch-only projection
is exact. The test asserts `|yaw| < 1e-6` at that beat before measuring, so a choreography change fails loudly
instead of reporting a wrong number, and it asserts the 12 px caption floor on the two desktop viewports only
(assumption 16).
