# Loader KS Vignette Explosion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the loader's six-stain ink-bleed exit with a KS vignette explosion — anticipation contract, then an accelerating zoom-through of the `ks.` mask cutout until the hero is fully revealed.

**Architecture:** The `ks.` glyph paths already live inside the loader's SVG mask as transparent windows. A new wrapper `<g class="loader-ks">` around the positioning group gets a GSAP-driven `transform` (scale about a fixed origin inside the `k` stem, in viewBox coords), re-rasterized per frame so edges stay vector-crisp at 45×. `main.tsx` swaps the stain timeline for anticipation (0.96×, 0.18s, house) → explosion (45×, 1.1s, power4.in), with the gate handoff at ~72% of the explosion. Corner labels become the secondary motion layer (drift+fade via GSAP).

**Tech Stack:** GSAP (one-shot loader lane — no Framer here), SVG mask, Playwright for verification.

**Spec:** `docs/superpowers/specs/2026-07-22-loader-ks-explosion-design.md`

## Global Constraints

- Loader exit is GSAP-only (project animation-lane rule); hero text rise (Framer) is untouched except its trigger time.
- Reduced motion: 200ms dwell + 150ms whole-loader opacity fade, **no explosion** — behavior byte-identical to today.
- 3s hard fallback (`MAX_WAIT_MS`), scroll-lock lifecycle, `data-loader-state` stamps, defensive no-loader/GSAP-throw paths all preserved.
- Loader CSS is duplicated in `index.html` (inline, first-paint) and `src/index.css` — every CSS change lands in BOTH.
- Motion values (from spec, exact): dwell 1200ms · anticipation scale 0.96 dur 0.18s ease house · explosion scale 45 dur 1.1s ease power4.in · label drift ±12px x, +12px y, 0.22s power2.in · handoff fraction 0.72 · origin viewBox (34.35, 49.8).
- Before e2e runs: kill any stale preview on port 4173 (`lsof -ti:4173 | xargs kill` — otherwise Playwright's `reuseExistingServer` serves the old build; known trap).
- Intro e2e specs run `--workers=1` (parallel red = contention, not regression).

## Task → Model

| Task | Model | Rationale |
|---|---|---|
| 0 | verifier-sonnet-low | mechanical baseline gate |
| 1 | implementer-sonnet-medium | fully-specified multi-file edit; needs care on the dual-CSS mirror |
| 2 | opus-4.8 (integrator-opus-high) | visual judgment on the sacred intro + CLAUDE.md craft |

---

### Task 0: Baseline verify

**Files:** none (read-only gate)

- [ ] **Step 1: Kill stale preview, run the full suite**

```bash
cd ~/keki/dev/personal_projects/portfolio
lsof -ti:4173 | xargs kill 2>/dev/null; sleep 1
npx tsc -b
npm run test:unit
npx playwright test --workers=1
```

Expected: tsc clean · 66 unit passed · 44 e2e passed, 2 skipped. Any red here is a pre-existing failure — stop and report before Task 1 (do not fix mid-task).

---

### Task 1: The explosion exit

**Files:**
- Modify: `index.html` (mask structure ~419–448, loader comment ~326–337, loader CSS ~376–393)
- Modify: `src/index.css` (mirrored loader CSS ~385–472)
- Modify: `src/main.tsx` (dwell + exit timeline, ~44–140)
- Modify: `tests/e2e/loader.spec.ts` (titles, `.loader-ks` assertion)

**Interfaces:**
- Consumes: existing `finishLoader()`, `resolveCurtain()`/`resolveEntrance()`, `liftCurtain()` scaffolding in `main.tsx` — unchanged.
- Produces: `<g class="loader-ks">` wrapper in the mask (Task 2's sweep script queries it via `window.__loaderTl`); `window.__loaderTl?: gsap.core.Timeline` test hook.

- [ ] **Step 1: index.html — restructure the mask**

Replace the `<defs>` content (delete the `#loader-stain-rough` filter and the `.loader-stains` group; wrap the positioning group):

```html
        <defs>
          <mask id="loader-mask">
            <rect x="-20" y="-20" width="140" height="140" fill="#fff" />
            <g class="loader-ks">
              <g transform="translate(30.74 39.34) scale(0.02861)" fill="#000">
                <!-- the three existing <path> elements, byte-identical -->
              </g>
            </g>
          </mask>
        </defs>
```

The three `<path d="...">` elements move inside unchanged. Nothing else in the SVG changes.

- [ ] **Step 2: index.html — CSS + comment updates**

a) In the big loader comment (~lines 331–337), replace the last two sentences:

```
         the live hero canvas behind #loader) and grows the mask's stain
         circles via GSAP to dissolve the ink and reveal the settled hero.
```
→
```
         the live hero canvas behind #loader), then GSAP contracts the whole
         ks. cutout slightly (anticipation) and explodes it outward until the
         viewport sits inside a letterform window — ink gone, hero revealed.
```

b) In `.loader-meta`, delete the line `transition: opacity 400ms ease;` (GSAP now drives label opacity/transform — a CSS transition would fight every tween frame).

c) Delete the `.loader--handoff` rule and its comment:

```css
      /* main.tsx adds .loader--handoff at ~40% of the bleed → labels fade out
         as the hero text rises in, so the loader chrome doesn't snap away. */
      #loader.loader--handoff .loader-meta { opacity: 0; }
```

d) In the reduced-motion comment, `no bleed` → `no explosion`.

- [ ] **Step 3: src/index.css — mirror the same edits**

Same three CSS edits as Step 2 (b/c/d) on the mirrored block (~lines 448–479), plus update the header comment (~385–393): replace `bleeds` in the section title line with `explodes`, and the `grows the mask's stain circles via GSAP to dissolve the ink` sentence with `then GSAP contracts the ks. cutout (anticipation) and explodes it outward until the viewport sits inside a letterform window`.

- [ ] **Step 4: src/main.tsx — dwell + explosion timeline**

a) After the imports, add the test-hook type:

```ts
declare global {
  interface Window {
    // Deterministic verification hook: lets a Playwright sweep pause/seek the
    // loader exit to screenshot exact frames. Harmless in production.
    __loaderTl?: gsap.core.Timeline
  }
}
```

b) Dwell: `const MIN_DWELL_MS = reduceMotion ? 200 : 1200` (comment: savor beat — the live shader visibly drifts inside the ks. windows before the explosion).

c) Update the controller header comment (lines 44–47): `We dissolve the ink with a GSAP stain bleed` → `We exit via the KS vignette explosion (anticipation, then an accelerating zoom-through of the mask cutout)`.

d) Replace everything in `liftCurtain` from the `// Ink bleed:` comment down to the closing `catch { finishLoader() }` (old lines 100–139) with:

```ts
  // Vignette explosion: the ks. cutout contracts slightly (anticipation),
  // then blows outward until the viewport sits entirely inside the k-stem
  // window — ink fully gone, hero revealed. Accelerating ease on the
  // explosion: an inOut's decel tail would play entirely off-screen.
  const ksEl = loaderEl.querySelector<SVGGElement>('.loader-ks')
  const metaBl = loaderEl.querySelector<HTMLElement>('.loader-meta--bl')
  const metaBr = loaderEl.querySelector<HTMLElement>('.loader-meta--br')
  // Scale origin (viewBox coords) sits inside the k stem — glyph-x 60.5–191.75
  // maps to viewBox-x 32.5–36.2, solid fill for viewBox-y 39.0–52.8 — so the
  // blow-through ends fully transparent at any aspect ratio (xMidYMid slice
  // crops what's visible, never the mask geometry). Min clearing scale ≈ 35
  // (right stem edge → far viewport edge at origin-x 34.35); 45 ≈ 28% margin.
  const ORIGIN_X = 34.35
  const ORIGIN_Y = 49.8
  const ANTICIPATION_SCALE = 0.96
  const ANTICIPATION_S = 0.18
  const EXPLOSION_SCALE = 45
  const EXPLOSION_S = 1.1
  // With power4.in the ink clears the lower-left name region at ~72% of the
  // explosion (scale ≈ 15×); the 50% wall-clock midpoint is still ~94% inked.
  const HANDOFF_FRACTION = 0.72
  if (!ksEl) {
    finishLoader()
    return
  }
  // Fire the hero rise while the explosion blows through — no dead gap
  // between "ink clearing" and "text starts". finishLoader still removes the
  // loader at 100%.
  const handoff = (): void => {
    resolveCurtain()
    resolveEntrance()
  }
  const proxy = { s: 1 }
  const applyScale = (): void => {
    ksEl.setAttribute(
      'transform',
      `translate(${ORIGIN_X} ${ORIGIN_Y}) scale(${proxy.s}) translate(${-ORIGIN_X} ${-ORIGIN_Y})`,
    )
  }
  // If GSAP ever throws building the exit, finish immediately rather than
  // stranding the loader (and the scroll lock) on screen.
  try {
    const tl = gsap.timeline({ onComplete: finishLoader })
    tl.to(proxy, { s: ANTICIPATION_SCALE, duration: ANTICIPATION_S, ease: 'house', onUpdate: applyScale }, 0)
    tl.to(proxy, { s: EXPLOSION_SCALE, duration: EXPLOSION_S, ease: 'power4.in', onUpdate: applyScale }, ANTICIPATION_S)
    // Secondary motion layer: corner labels drift outward+down while fading
    // as the explosion launches (accelerate — they exit). Not opacity-only.
    if (metaBl) tl.to(metaBl, { x: -12, y: 12, opacity: 0, duration: 0.22, ease: 'power2.in' }, ANTICIPATION_S)
    if (metaBr) tl.to(metaBr, { x: 12, y: 12, opacity: 0, duration: 0.22, ease: 'power2.in' }, ANTICIPATION_S)
    window.__loaderTl = tl
    // Wall-clock setTimeout rather than a GSAP position callback — GSAP's
    // scheduled callbacks proved unreliable here (see git history).
    window.setTimeout(handoff, (ANTICIPATION_S + EXPLOSION_S * HANDOFF_FRACTION) * 1000)
  } catch {
    finishLoader()
  }
```

Deleted along the way: `stains` query, `ENDS`, `DELAYS`, `STAIN_DURATION`, `STAIN_EASE`, `BLEED_TOTAL`, the `loader--handoff` class-add, and their comments.

- [ ] **Step 5: tests/e2e/loader.spec.ts — rename + wrapper assertion**

- Title: `'loader shows the ks. window mark + corner meta, bleeds away, zero console errors'` → `'loader shows the ks. window mark + corner meta, explodes away, zero console errors'`
- After the 3-path count assertion, add: `await expect(page.locator('#loader mask#loader-mask g.loader-ks')).toHaveCount(1)`
- Comment `// Bleed completes` → `// Explosion completes`; reduced-motion title `(no bleed)` → `(no explosion)`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b` — Expected: clean.

- [ ] **Step 7: Intro e2e serial**

```bash
lsof -ti:4173 | xargs kill 2>/dev/null; sleep 1
npx playwright test loader hero-entrance reduced-motion --workers=1
```

Expected: all pass (new exit total ≈ 2.5s post-paint, under the specs' 5s waits).

- [ ] **Step 8: Commit**

```bash
git add index.html src/index.css src/main.tsx tests/e2e/loader.spec.ts
git commit -m "feat(loader): KS vignette explosion exit replaces the stain bleed"
```

---

### Task 2: Visual verification sweep + doc sync

**Files:**
- Create: `tmp/explosion-sweep.mjs` (gitignored scratch)
- Modify: `CLAUDE.md` (loader/entrance bullet + NO list)
- Modify: `docs/superpowers/specs/2026-07-22-loader-ks-explosion-design.md` (tick TODOs)

**Interfaces:**
- Consumes: `window.__loaderTl` hook and `.loader-ks` wrapper from Task 1.

- [ ] **Step 1: Fresh build + preview**

```bash
lsof -ti:4173 | xargs kill 2>/dev/null; sleep 1
npm run build
npx vite preview --port 4173 &
```

(Preview must be restarted after every build — stale sirv snapshot trap.)

- [ ] **Step 2: Write the sweep script**

`tmp/explosion-sweep.mjs`:

```js
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:4173'
const viewports = [
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'desktop-1600x900', width: 1600, height: 900 },
  { name: 'ultrawide-2100x900', width: 2100, height: 900 },
]
// Timeline progress points (total 1.28s): 0.30 = early creep out of the
// anticipation, 0.76 = the handoff frame (name region must be ink-free),
// 0.95 = near-end (no residual ink sliver at any corner).
const points = [0.3, 0.76, 0.95]

const browser = await chromium.launch()
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(BASE)
  await page.waitForFunction(() => window.__loaderTl !== undefined, null, { timeout: 10000 })
  await page.evaluate(() => window.__loaderTl.pause())
  for (const p of points) {
    await page.evaluate((pr) => window.__loaderTl.progress(pr), p)
    await page.screenshot({ path: `tmp/explosion-shots/${vp.name}-p${String(p).replace('.', '')}.png` })
  }
  await page.close()
}
await browser.close()
console.log('sweep done → tmp/explosion-shots/')
```

- [ ] **Step 3: Run the sweep and judge the frames**

Run: `node tmp/explosion-sweep.mjs` then inspect all 9 screenshots.

Pass criteria: p0.3 — cutout visibly larger than rest but screen still mostly ink (the creep reads); p0.76 — lower-left name region fully clear of ink at all three widths; p0.95 — no ink sliver at any corner/edge at all three widths. If p0.76 fails, raise `HANDOFF_FRACTION` (or soften the ease to `power3.in`); if p0.95 fails, raise `EXPLOSION_SCALE`. Re-run tsc + the sweep after any constant change, and re-commit.

- [ ] **Step 4: Watch the real thing once**

Reload `http://localhost:4173` in a headed browser (or `npx playwright open http://localhost:4173`) and watch the full sequence at natural speed: savor beat reads, anticipation reads as a gather not a glitch, explosion accelerates without a stall after the crouch, text rise overlaps with no dead gap. This is a feel-check; constants are Kevin's to fine-tune live afterwards.

- [ ] **Step 5: CLAUDE.md sync**

a) Rewrite the `**Loader + entrance ...**` bullet: title `(bleed reveals the shader, then the text rises)` → `(the ks. vignette explodes, then the text rises)`; delete the `plus a stain <g> grown by GSAP` clause; replace the exit sentence (`after React paints + ~600 ms dwell ... grows six stains at duration 1.3 house-ease over ~1.8 s to dissolve the ink (slow, eased spread), then removes the loader`) with:

> after React paints + a ~1.2 s savor dwell (reduced-motion 200 ms, 3 s hard fallback), it contracts the whole `ks.` cutout to 0.96× (0.18 s, house — anticipation) then explodes it to 45× (1.1 s, `power4.in` — accelerating; an inOut's decel tail would play off-screen) about a fixed origin inside the k stem (viewBox 34.35, 49.8), so the viewport ends inside a letterform window — ink gone, hero revealed; corner labels drift 12 px outward+down while fading (0.22 s) at launch, and the handoff (`resolveCurtain()` + `resolveEntrance()`) fires at ~72% of the explosion (wall-clock setTimeout), when the ink has cleared the name region

Also update `no bleed` → `no explosion` in the reduced-motion sentence, and the hero-rise sentence's `(at bleed completion)` → `(at the ~72% handoff)`.

b) NO list: append `, the six-stain ink-bleed loader exit (stain circles + the feTurbulence roughen filter — replaced by the ks. vignette explosion)`.

- [ ] **Step 6: Full verification suite**

```bash
npx tsc -b
npm run test:unit
lsof -ti:4173 | xargs kill 2>/dev/null; sleep 1
npx playwright test --workers=1
```

Expected: clean · 66 passed · 44 passed, 2 skipped (the new `.loader-ks` assertion lives inside an existing test — test count unchanged).

- [ ] **Step 7: Tick spec TODOs + commit**

Tick every satisfied `- [ ]` in the spec's TODO section (all nine if green), then:

```bash
git add CLAUDE.md docs/superpowers/specs/2026-07-22-loader-ks-explosion-design.md docs/superpowers/plans/2026-07-22-loader-ks-explosion.md
git commit -m "docs(loader): sync CLAUDE.md + spec/plan boxes for the KS explosion exit"
```

---

## Pre-execution protocol (global rules)

1. Plan review before Task 1: fresh-context Opus pass over this plan (runtime/boot assumptions, forward-compat traps) + one codex-review cross-vendor pass. Findings fix the PLAN first.
2. Task 0 is the mandated full-suite baseline (includes every e2e spec named here).
3. No numeric perf budgets are set by this plan (timings are design values, not measured budgets) — n/a.
