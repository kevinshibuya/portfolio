# Mobile audit findings — 2026-05-08 (verified)

Animation-settled Playwright audit at `iphone-12` (390×844), `iphone-se` (375×667), `small` (320×568) across `/`, `/projects/painel-da-reconstrucao`, `/projects/fotos-do-ano-2025`. All probes wait for every animated element to reach `transform: none` and `opacity ≥ 0.999` before measuring, so numbers match DevTools.

Interactions exercised at iphone-12: every work-history accordion toggle (open + close), archive search (typed `fotos`), every archive filter dropdown (5), archive "show more", language toggle (EN→PT and back), project-detail route-list expand.

Screenshots: `/tmp/mobile-audit-v3/` · raw probe data: `/tmp/mobile-audit-v3/findings.json`.

---

## Verified problems (to fix)

### V1. Archive: 96 px gap between filter counter and the list (`#archive`)
- Settled measurement: `.archive-list` top is 96 px below `.archive-count` ("169 items") at every tested viewport.
- Confirmed visually in steady state and after typing in the search field — the gap stays constant (`iphone-12__home__archive.png`, `iphone-12__home__archive-search.png`).
- User-confirmed: "the archive list margin top makes the list too far away from the rest of the content."
- Cause: `.archive-list` carries a `section-spacing-content` margin that's tuned for desktop.
- Fix sketch: tighten the `.archive-list` top spacing on mobile (target ~32 px to the counter).

### V2. Project detail: route-list grid doesn't fit at 320 px (`.project-detail-route-list-items`)
- 19 instances of `.project-detail-route-label` overflow the right edge by **39 px** on `/projects/painel-da-reconstrucao` at the 320 viewport. No page-level horizontal scroll (the body clips), but the labels visually clip.
- Cause: `grid-template-columns: 240px 1fr`. On a 280 px content width (320 − 2×20 padding), the 240 px first column leaves ~24 px for the label.
- Verified non-issue at 375 (~79 px label column — labels wrap but don't overflow) and 390 (`iphone-12__detail-painel-da-reconstrucao__routes-open.png`).
- Fix sketch: collapse the grid to a single column (`grid-template-columns: 1fr`) below ~480 px, so path and label stack vertically.

### V3. Tap targets below the 44×44 px minimum (Apple HIG / WCAG 2.5.5)
Probed every `<button>`, `<a>`, `<summary>`, `<input>` on every page/viewport. Violations found across the site (sizes are width × height in px):

**Critical — drastically under-sized:**
- `.nav-lang` button (the "PT" / "EN" toggle): **16 × 25** — tiny target in the top-right corner. The text alone has no padding; the click area is just the glyph.
- `.project-detail-back` link ("← back to projects"): **121 × 18** — only 18 px of clickable height.
- `.project-detail-route-list-summary` ("19 ROUTES" expander): **350 × 17** — wide but only 17 px tall.

**Medium — a few px short:**
- `.archive-search` text input: 38 px tall (6 px short).
- `.archive-dropdown-trigger` (5 buttons: kind / type / editorial / year / sort): 36 px tall (8 px short).
- `.nav-brand` link (logo + "kevin shibuya"): 30 px tall (14 px short).

**Marginal — within rounding:**
- `.hero-role hero-role--clickable` (the cycling role text): 42 px tall (2 px short).

Fix sketch: bump padding / line-height on each violator until rect ≥ 44×44. The chips and search can keep their visual size if we use `padding` + `min-height: 44px` rather than visible borders.

---

## Things that turned out fine (verified)

| Area | Result |
|---|---|
| Document horizontal scroll | None on any viewport (`hasHorizontalPageScroll: false`). |
| Console errors / pageerror events | None across the run. |
| Work-history accordion (open / close, all 5 rows) | No overflow, transitions clean. |
| Archive search input typing ("fotos" → 4 results) | List filters correctly, layout intact. |
| Archive filter dropdowns (kind / type / editorial / year / sort, all opened) | Panels position under their trigger. They overlay sibling chips when open — standard popover behavior, dismissing by tap-outside works. |
| Archive "show more" | Renders next batch in single column, no overflow. |
| Language toggle EN ↔ PT | Layout remains stable in both languages; no broken wrap. |
| Project detail mockup blocks (desktop + mobile variants) | Correct sizes, animation fade-ups complete. |
| Project detail route-list expand at 390 | Path/label grid fits cleanly. |
| Bento cards (single + dual md, lg → sm collapse below 720) | Render correctly at all 3 viewports; mockups visible. |
| Contact "let's build." title | Doesn't overflow at any viewport (340/335/280 px wide). Wraps to two lines on ≤ 375 by design. |
| Stats (`.stats-item`) | 342 / 327 / 272 px wide — fits within section gutters. |
| Hero `padding-top` | 120 px (matches design intent). |

---

## Why earlier numbers were inflated

The first audit measured `getBoundingClientRect()` ~800 ms after navigation, while Framer Motion `whileInView` reveals were still in flight. Mid-animation `transform` made stats items appear 393 px wide instead of 342, the contact title bounding box appear 403 px instead of 350, and so on. The verified pass uses a `waitForAnimationsToSettle` helper that polls every 100 ms until every targeted element reports identity transform and opacity ≥ 0.999, then measures. Numbers from that pass match the user's DevTools readings exactly.

---

## Proposed fix scope

Three real findings, in order of impact:

1. **V3 — tap targets** (highest user-facing impact; affects every interaction on the site). Touches `src/index.css` only. Six rules to update; ~25 lines of CSS.
2. **V1 — archive counter→list gap**. CSS-only, 1 rule, ~3 lines.
3. **V2 — route-list grid at 320**. CSS-only, 1 media query, ~6 lines.

Total: one file (`src/index.css`), ~35 lines of CSS, no component or test changes. Visual re-audit (the v3 script) is a natural verification gate — run it after the edits and confirm the offender count goes to zero.

---

## TODO

Acceptance criteria for each verified problem. Tick only when its corresponding playwright re-probe passes AND visual inspection at iphone-12 + iphone-se + small confirms the fix.

- [x] **V3-a (a11y critical)**: `.nav-lang` button reaches ≥ 44 × 44 px hit area on every mobile viewport.
- [x] **V3-a (a11y critical)**: `.project-detail-back` link reaches ≥ 44 px height on every mobile viewport.
- [x] **V3-a (a11y critical)**: `.project-detail-route-list-summary` reaches ≥ 44 px height on every mobile viewport.
- [x] **V3-b (HIG polish)**: `.archive-search`, `.archive-dropdown-trigger` (×5), `.nav-brand` all reach ≥ 44 px height on every mobile viewport.
- [x] **V1**: `.archive-list` top sits ≤ 40 px below `.archive-count` on every mobile viewport (currently 96 px).
- [x] **V2**: zero `.project-detail-route-label` elements report `right > viewport-width` at the 320 viewport (currently 19).
- [x] **All**: `npm run build`, `npm run test:unit`, and `npm run lint` pass after the edits.
- [x] **All**: full re-run of `/tmp/mobile-audit/audit3.mjs` shows zero overflow offenders and zero tap-target violations across home + both detail pages × 3 viewports.
