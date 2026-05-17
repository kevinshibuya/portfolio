# LCP optimization — font subset + deferred 3D import

Two targeted changes that shrink the LCP critical path without touching any visual output.

## TODO

- [x] `public/fonts/PlusJakartaSans-VariableFont_wght.woff2` is a subset woff2 containing only Latin Basic + Latin-1 Supplement + the typographic punctuation actually used in the bundle, preserving the full 200–800 weight axis; file size ≤ 35 KiB (currently 60 KiB)
- [x] `public/fonts/PlusJakartaSans-Italic-VariableFont_wght.woff2` is subset with the same Unicode coverage and weight axis; file size ≤ 38 KiB (currently 65 KiB)
- [x] The three unused `.ttf` files (`PlusJakartaSans-Bold.ttf`, `PlusJakartaSans-Italic-VariableFont_wght.ttf`, `PlusJakartaSans-VariableFont_wght.ttf`) are removed from `public/fonts/`
- [x] EN and PT homepages render every visible glyph correctly in production build (`npm run preview`) with no `□` / `.notdef` placeholders — verified by visual diff of hero, about, work, skills, projects, embeds, contact, and footer in both languages
- [x] `src/components/sections/Hero.tsx` does not start fetching the `HeroAccent3D` chunk until the `entranceDone` promise has resolved; until then, `<HeroAccentSilhouette />` remains mounted (its current fallback behavior)
- [x] Once `entranceDone` resolves, `HeroAccent3D` mounts inside its `<Suspense fallback={<HeroAccentSilhouette />}>` boundary so the silhouette → 3D swap is pixel-identical to today
- [x] Mobile Lighthouse audit on `npm run preview` (simulated 4G, Moto G profile) shows LCP ≤ today's 2.3 s and performance score ≥ today's 96 — recorded as before/after numbers in the retro

## Context

Deployed Lighthouse audit on the live site scores 93 mobile. Critical-path tree pins the longest single resource at the variable font woff2 (499 ms, 65 KiB) and the largest "unused JS at LCP" finding at `HeroAccent3D` (240 KiB chunk, 181 KiB reportedly unused at LCP). The font preload is already present at `index.html:270` and `HeroAccent3D` is already `lazy()`-imported with a Suspense fallback — so the gains here come from making both resources *smaller* (font) or *later* (3D), not from introducing them.

The "hero entrance inviolable" memory rules out any change to the ink-draw + cascade animation itself. This spec works *around* the entrance: the font subset doesn't alter the rendered glyphs at all, and the 3D defer fires *after* `entranceDone`, so the entrance proceeds identically and only the post-entrance 3D swap moves later by a few hundred ms.

## Design — font subset

**Unicode coverage.** A pre-subset scan of all source files (`src/**` + `index.html`) under the spec's draft coverage flagged extra glyphs actually used in the bundle — arrows in both directions (`←`/`→`), subscripts (`₁`/`₂`), `≈`/`≤`/`≥`, `▾`, `★`, and combining diacritical marks in `Archive.tsx`. Katakana characters in `useScramble.ts` are intentionally not added: Plus Jakarta Sans never contained Japanese glyphs, so they fall back to system fonts regardless and subsetting doesn't change that behavior.

Latin Basic (U+0000–U+00FF) covers EN and the PT-BR diacritics (á é í ó ú ã õ ç + caps). Latin Extended-A adds `ı`, `Œ/œ`, `Š/š`, `Ÿ`, `Ž/ž` for safety (cheap, ~30 glyphs). Combining Diacritical Marks (U+0300–U+036F) covers the marks used inline in `Archive.tsx`. General Punctuation (U+2000–U+206F) covers smart quotes, dashes, ellipsis. Subscripts (U+2080–U+2089) for the `₁`/`₂` in `index.css`. Arrows block (U+2190–U+2199) covers `←`, `→`, `↑`, `↓`, `↗`. Mathematical symbols (`≈`, `≤`, `≥`, `−`, `∕`). Misc symbols (`▾`, `★`, `™`, `€`).

Final unicode argument for `pyftsubset`:

```
U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
U+0300-036F, U+2000-206F, U+2074, U+2080-2089, U+20AC, U+2122,
U+2190-2199, U+2212, U+2215, U+2248, U+2264-2265, U+25BE, U+2605,
U+FEFF, U+FFFD
```

**Variable axis preserved.** `--no-hinting --layout-features='*'` and *no* `--axis` flag — the weight axis (200–800) must survive since the bundle uses weights 200, 400, 500, 700 and `font-weight: 700` is the hero face. Subsetting Unicode does not collapse the variable axis.

**Italic file.** Same Unicode set and flags; the italic woff2 is served only by the `<em>` blue accents in section headings and a few inline italic phrases, so the same coverage applies.

**Verification.** After subsetting, run `npm run build && npm run preview`, open `/` and `/?lng=pt` (or wherever the language toggle lands), and visually scan every section header + body block in both languages. Failure mode: a missing glyph renders as `□` or as the fallback `system-ui` face only for that char. Pay special attention to the contact section (mailto link arrow), the embed gallery (`↗` per row), the footer ghost text, the about pills, and any PT-only diacritic-heavy copy (e.g. "redação", "geração").

## Design — defer `HeroAccent3D`

**Today.** `Hero.tsx:10` declares `const HeroAccent3D = lazy(() => import('../canvas/HeroAccent3D'))`. The `<Suspense>` at `Hero.tsx:146` immediately tries to render `<HeroAccent3D />`, which kicks off the dynamic import on mount. The `<HeroAccentSilhouette />` fallback shows while the chunk loads. This means three.js fetch + parse + WebGL init happens during the LCP window.

**After.** Hold the `lazy()` factory in state, initialized to `null`. In an effect, await the `entranceDone` promise (from `MotionContext`) and only then `setHeavy(lazy(() => import('../canvas/HeroAccent3D')))`. While `Heavy === null`, render `<HeroAccentSilhouette />` directly (no Suspense needed — there's nothing async to fall back from). Once `Heavy` is set, render `<Suspense fallback={<HeroAccentSilhouette />}><Heavy /></Suspense>` — same Suspense boundary as today, so the dynamic-import-pending state still shows the silhouette.

**Visual identity.** Today: silhouette → (chunk loads during entrance) → 3D appears, sometimes mid-entrance. After: silhouette → entrance completes → silhouette stays mounted → (chunk starts loading, takes ~100–300 ms) → 3D swaps in. Both paths show the silhouette during the entrance and the 3D after; the swap-in moment shifts later by the chunk load time. The "without any visual change" requirement is met for the entrance itself (inviolable) and for the steady-state hero (3D ends up rendered in both worlds). The only diff is *when* the silhouette → 3D transition happens — currently sometimes during entrance, now always strictly after.

**Edge cases.**
- If `entranceDone` rejects (it shouldn't, but the existing `.catch(() => {})` in Hero.tsx:27 suggests we treat rejection as "skip the cascade"), we still need to load the 3D eventually. Mirror that pattern: `entranceDone.then(load).catch(load)` — on any settlement, load the chunk. Don't leave the silhouette stuck forever.
- `prefers-reduced-motion` already short-circuits parts of the entrance via `useMotion()`. Verify the reduced-motion code path still resolves `entranceDone` synchronously enough that the 3D loads promptly — if not, we accept a slight delay in reduced-motion mode (still no visual change, just timing).

## Verification

1. `npm run build && npm run preview`.
2. Local Lighthouse mobile run via `npx lighthouse http://localhost:4173/ --form-factor=mobile --throttling-method=simulate --preset=perf --output=json --output-path=/tmp/lh-mobile-after.json --chrome-flags="--headless=new"`.
3. Compare LCP, FCP, performance score against today's baseline (mobile 96 / LCP 2.3 s, desktop 100 / LCP 0.5 s).
4. Open `/` and `/?lng=pt` in a real browser, scroll the whole page in both languages, confirm no missing glyphs.
5. Watch the hero entrance specifically — confirm the ink-draw + cascade is pixel-identical and the silhouette → 3D swap happens *after* the entrance completes.
6. Commit the change.

## Out of scope

- Inlining the bundled CSS (tier-2 win, separate spec if needed after measuring).
- Auditing the 13 non-composited animations (tier-2 win).
- Cloudflare beacon cache TTL (not ours).
- Any change to `HeroNameDrawing`, `MotionContext.entranceDone`, or the ink-draw timing.
- Adding new font weights or a new typeface.

## Rollback

- Font: keep a copy of the pre-subset woff2 files (commit them in a separate prior commit so a `git revert` restores them, or stash them in `/tmp` for the duration of the change). The subset is a destructive replace, so the rollback path is "git revert the subset commit."
- 3D defer: trivial — revert the `Hero.tsx` change. No data, no migrations, no flags.

## Risks

- **Missing glyph in PT copy** that isn't covered by the Unicode set. Mitigation: scan all `src/i18n/locales/pt.json` (or wherever PT strings live) for chars outside the subset before shipping.
- **CV link / external font fallback.** The site's CVs are PDFs, not HTML — they don't share fonts. No risk.
- **3D never loads.** If `entranceDone` neither resolves nor rejects in some code path (e.g. JS error during the ink-draw), the silhouette would stay forever. Mitigation: add a timeout fallback (e.g. 5s) that force-loads the chunk regardless. Decide during implementation whether to include this belt-and-suspenders.
