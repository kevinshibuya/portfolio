# Lighthouse ≥95 across all categories — 2026-05-09

Goal: lift the live portfolio (`kevinshibuya.dev` once registered) to **≥95 Lighthouse on Performance, Accessibility, Best Practices, and SEO**, on both mobile and desktop, without compromising the ink-draw hero entrance or the soft-pastel palette.

Baseline measured today against `npm run preview` build at `127.0.0.1:4173` (Lighthouse 12.8.2, headless Chromium):

| Category | Mobile | Desktop |
|---|---|---|
| Performance | **N/A** | **N/A** |
| Accessibility | 96 | 96 |
| Best Practices | 100 | 100 |
| SEO | 83 | 83 |

Mobile metrics (when computable): FCP 2.7 s (score 59), Speed Index 2.7 s (96), CLS 0 (100). LCP/TBT/TTI all `N/A` because the LCP detector throws `NO_LCP`. Raw reports archived at `/tmp/lh-baseline/`.

---

## Root causes

### Performance N/A — `NO_LCP`
The hero title is rendered as animated SVG paths (`HeroNameDrawing.tsx`) that trace in and ink-fill. The only `<h1>` is `<h1 className="sr-only">` clipped to 1×1 px, which Lighthouse rejects as too small to be an LCP candidate. With no qualifying text or image element painted before the trace ends, the LCP metric throws `NO_LCP`, which cascades into `null` Performance, TBT, and TTI scores.

### Performance — mobile FCP 2.7 s
Lighthouse's mobile profile (4× CPU throttle, slow 4G) is dominated by a single 425.7 KB asset: `/images/projects/fotos-do-ano-2025/mockups/mobile.webp`. It loads eagerly even though it sits well below the hero fold. Three other bento mockup webp's add another 200 KB+. Fonts (60 + 65 KB woff2) are correctly preloaded. No render-blocking requests.

### Accessibility 96
- 17 `color-contrast` failures concentrated on muted text against cream. Sample failing selectors: `header.nav button.nav-lang`, `div.hero-supplementary span.hero-role`, `div.hero-cta a.btn`. Root: `--text-faded #6A8CAA` on `--bg-cream #F6F9FC` measures 3.09 : 1, below WCAG AA's 4.5 : 1 threshold for body text. `--text-muted` (`bark #2A4060`) on cream measures 8.25 : 1 and passes — only `--text-faded` (and any usage of similar pastels on cream/sand) needs nudging.
- 1 `label-content-name-mismatch` on `Hero.tsx:107-109` — the role-cycle span has `aria-label="cycle role"` but its visible text is the role itself ("interactive developer", etc.). Lighthouse requires the accessible name to contain the visible text.

### SEO 83
- No `<meta name="description">` in `index.html`.
- No `public/robots.txt`.
- No canonical URL, no Open Graph, no Twitter Card, no JSON-LD.
- `index.html` references no favicons beyond the default Vite SVG.

### Best Practices 100
Already at 100. The `valid-source-maps` flag is a zero-weight diagnostic and does not drag the score. **No work needed.**

---

## Fix scope

### A. Performance

**A1. Unblock LCP detection** — `src/components/ui/HeroNameDrawing.tsx`, `src/index.css`. Promote the existing `sr-only` `<h1>` to a real, layout-occupying element absolutely positioned to span the `.hero-name-drawing` bounding box, font-size matching the hero `clamp(72px, 13vw, 220px)`, with `color: transparent`. Three things this buys:
- Lighthouse sees a large text element with non-zero rendered area on first paint and classifies it as a text-LCP candidate.
- axe-core's color-contrast rule skips elements whose computed `color` is `transparent` (it has no foreground to measure), so this introduces zero new contrast failures.
- The h1 stays accessible to screen readers as the page heading (no `aria-hidden`, no `visibility: hidden`).

The `.hero-name-drawing` SVG container renders in normal flow underneath, animation untouched, no z-index gymnastics required (the absolute h1 stacks above static siblings by default; transparent text means the SVG below shows through pixel-for-pixel).

**A1-fallback** — verified during Batch 3 re-audit. If `color: transparent` still produces `NO_LCP` (Chrome's LCP observer may exclude transparent text on some heuristics), the next escalation is to ungate the `hero-desc` paragraph in `Hero.tsx` so it renders from `t=0` instead of waiting for `entranceDone`. The paragraph is already real text with substantial rendered area and will register as LCP. Visual cost: hero description appears immediately rather than fading in after the SVG ink-fill — small entrance-cascade tweak.

**A2. Lazy-load all project bento images** — `src/components/sections/Projects.tsx`. The Projects section sits well below the hero (Hero → About → WorkExperience → Skills → Projects, several screens deep), so every bento `<img>` is below-fold on every viewport. Add `loading="lazy"`, `decoding="async"`, plus explicit `width` and `height` attributes on every project image. The 425 KB `fotos-do-ano-2025/mockups/mobile.webp` stops being a render-path cost. Width/height attributes also lock the image aspect ratio so the lazy-load doesn't introduce CLS.

**A3. Font-display tuning** — `src/index.css`. Add `font-display: swap` to all `@font-face` declarations for Plus Jakarta Sans (Lighthouse currently scores `font-display: 50`).

**A4. Bundle review (conditional)** — only execute if Performance is still <95 after A1–A3. Investigate whether `react-router-dom` route components (`Resume`, `/projects/:slug`) can be `lazy()`'d, and whether `i18next` is eager-importing both EN and PT translation JSONs upfront. Trim the 498 KB / 163 KB-gzip main chunk only if the data demands it.

### B. Accessibility

**B1. Palette nudge** — `src/index.css`. Darken `--text-faded` from `#6A8CAA` to roughly `#4A6A88` (target ≥ 4.6 : 1 on cream). Verify all 17 failing selectors clear after the global change; any holdout (e.g., `dust` on `sand`) gets an inline swap to `--text-muted`.

**B2. aria-label match** — `src/components/sections/Hero.tsx`. Change `aria-label="cycle role"` to a dynamic `` `cycle role — currently ${activeRole}` `` so the accessible name contains the visible text.

### C. SEO

Mirror the hotmart-bunde blueprint, adapted for a personal portfolio. Domain: `kevinshibuya.dev`. Asset files (favicon set, og.png, web manifest icons) are referenced by path but the binary files are deferred — user will drop them into `public/` later.

**C1. `index.html` head expansion**:
- `<meta name="description">` — bilingual editorial pitch (interactive developer; data viz, scrollytelling, infographics, R3F).
- `<meta name="keywords">`, `<meta name="author">`, `<meta name="robots">`, `<meta name="googlebot">`, `<meta name="format-detection">`, `<meta http-equiv="X-UA-Compatible">`.
- `<link rel="canonical" href="https://kevinshibuya.dev/" />`.
- `<meta name="theme-color" content="#F6F9FC">` and `<meta name="color-scheme" content="light">`.
- Favicon set — `/favicon.ico`, `/favicon.svg`, `/favicon-96x96.png`, `/apple-touch-icon.png`, `/site.webmanifest`. **Paths only** (asset files deferred to user).
- Apple/Microsoft mobile meta block (`apple-mobile-web-app-*`, `application-name`, `msapplication-*`).
- Open Graph: `og:type=profile`, `og:locale=en_US`, `og:locale:alternate=pt_BR`, `og:title`, `og:description`, `og:url`, `og:image=/og.png` with `og:image:width=1200`, `og:image:height=630`, `og:image:alt`. **Paths only.**
- Twitter Card: `summary_large_image` with title, description, image, image:alt.
- JSON-LD `<script type="application/ld+json">`:
  - `Person` — name, jobTitle, url, image, sameAs (GitHub, LinkedIn, etc., sourced from existing `src/data` socials).
  - `WebSite` — siteName, url, inLanguage `en` with PT alternate, publisher → Person.
  - `WebPage` / `ProfilePage` — primaryImageOfPage = `/og.png`, isPartOf → WebSite.

**C2. `public/robots.txt`** — `User-agent: *` / `Allow: /` / `Sitemap: https://kevinshibuya.dev/sitemap.xml`.

**C3. `public/sitemap.xml`** — root `/` plus `/resume` plus each `/projects/:slug` route. Generate from `src/data/projects.ts` if cheap, otherwise hand-roll (the slug list rarely changes).

**C4. `public/site.webmanifest`** — referenced by `index.html`; minimal content with name/short_name/description/start_url/theme_color/icons referencing the deferred 192/512 PWA icons.

---

## Sequencing

Six batches, re-audit between each so we see the score climb and catch regressions immediately.

| # | Batch | Files | Expected delta |
|---|---|---|---|
| 1 | SEO + manifest | `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/site.webmanifest` | SEO 83 → 100 |
| 2 | A11y | `src/index.css` (token nudge), `src/components/sections/Hero.tsx` (aria-label) | A11y 96 → 100 |
| 3 | LCP unblock | `src/components/ui/HeroNameDrawing.tsx`, `src/index.css` | Perf N/A → real number |
| 4 | Image lazy + font-display | `src/components/sections/Projects.tsx`, `src/index.css` | Mobile FCP ≤ 1.5 s |
| 5 | Bundle review *(conditional)* | route-level `lazy()`, i18n import audit | Only if Perf < 95 after batch 4 |
| 6 | Final verification + retro | desktop + mobile audits to `/tmp/lh-final/` | Confirm targets |

Per project rules each batch ticks its TODO box only after Lighthouse re-audit confirms the expected delta.

---

## Working branch

1. Merge `feat/skills-tablet-2col` (the unmerged skills 3→2→1 columns work) into `main` with `--no-ff`.
2. Discard `Header.tsx` working-tree formatter noise — single→double quote and trailing-semicolon churn, no logic change. `git checkout -- src/components/layout/Header.tsx`.
3. Branch `feat/lighthouse-95` off freshly-merged `main`.

All Lighthouse work commits land on `feat/lighthouse-95`.

---

## TODO

Acceptance criteria per batch. Tick only when the corresponding Lighthouse re-audit confirms the delta AND code review approves.

- [x] **Batch 1 (SEO)**: mobile + desktop SEO scores reach 100. `index.html` contains description, canonical, OG, Twitter, JSON-LD; `public/robots.txt` and `public/sitemap.xml` are valid.
- [x] **Batch 2 (A11y)**: mobile + desktop Accessibility scores reach 100. Lighthouse `color-contrast` audit reports zero failing elements; `label-content-name-mismatch` audit passes.
- [x] **Batch 3 (LCP)**: Lighthouse runs without `NO_LCP`. Performance category produces a numeric score on both mobile and desktop. Hero ink-draw entrance visually unchanged (manual browser check at desktop + iphone-12).
- [x] **Batch 4 (FCP)**: mobile FCP ≤ 1.5 s and Performance ≥ 95 on mobile. CLS stays at 0. No visible regression to bento layout.
- [ ] **Batch 5 (bundle, conditional)**: only ticked if executed — main JS chunk ≤ 350 KB raw / 110 KB gzip after route-level splitting.
- [ ] **Batch 6 (final)**: mobile Lighthouse: Perf ≥ 95, A11y ≥ 95, BP = 100, SEO ≥ 95. Desktop: same four. Reports archived at `/tmp/lh-final/`.
- [ ] **All**: `npm run build` passes; no console errors on `npm run dev`.
- [ ] **All**: spec checklist boxes ticked as each batch lands; no batched-at-end ticks.
