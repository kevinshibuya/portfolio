# Contract — the Selected Work title morph produces slabs, not letters

**Owner of the fix:** a Fable session. **Routed there by Kevin (2026-09-05)** during his manual pass on
PR #7: "this morph title component we are using for this section has a small visual bug when scrolling,
sometimes the text morph end up creating strange artifacts that does not resemble the letters at all …
pass this task to fable through a contract, since it's probably a little too complex."

**Execution model: fable, because** the owner routed it there explicitly — this is a shader/signal-design
problem (what function of scroll fraction produces a *gooey bridge* rather than a merged blob), not a
mechanical edit, and the failure is a design fault in the morph's formulation rather than a bug in its
implementation.

**Branch:** `feat/selected-work-scene`, at or after `096f05a`. Work on that branch; do not open a new one.
PR #7 targets `staging`. `main` is FROZEN (CLAUDE.md).

---

## 1. The defect

Scrubbing the Selected Work corridor between two adjacent projects, the title does not morph from one
name into the other. Around the middle of every transition it collapses into a **solid black slab with a
few arbitrary holes**, spanning the title's whole width, with no letterform structure at all. It then
resolves back into the incoming name. Both endpoints are crisp and correct; only the middle is broken.

### Deterministic repro

Dev server on `:5180` (`npx vite --port 5180`), viewport 1440×900 at dpr 2.

The playhead is `playheadFor(p) = p·4.5 − 1.5`. A segment fraction `s` between card 0 and card 1 is at
scroll progress `(s + 1.5) / 4.5` of `.scene-scroll`. Screenshot at `s = 0.50` and the slab is there
every time. `s = 0.25` and `s = 0.75` are clean.

Frames already captured (do not re-shoot unless you want to):
`/private/tmp/claude-501/-Users-luizarazzera-keki-dev-personal-projects-portfolio/f6cfe9d7-87a8-4db9-93b6-c9574aa769d3/scratchpad/morph-*.png`
— `morph-0.25.png` (clean: "política essencial"), `morph-0.50.png` (**the slab**), plus 0.00/0.15/0.20/
0.30/0.40/0.60/0.70/0.75/0.80/0.85. The script that made them is `node_modules/.smoke/morphshots.mts`
(`SCRATCH=<dir> npx tsx node_modules/.smoke/morphshots.mts`). `node_modules/.smoke/morph.mts` prints the
blur/LOD/opacity table below.

It reproduces on the phone too; Kevin saw it in his own Chrome, so it is not a headless artefact.

## 2. What is actually happening (measured, but VERIFY — this is a lead, not a verdict)

`SceneTitle.tsx` blurs each of the two title coverage masks by sampling a **mip level** (`textureLod`),
adds the two with opacity weights, and cuts the sum at a hard threshold:

```glsl
float a = textureLod(uTexA, uvA, uLodA).a * uOpacityA
        + textureLod(uTexB, uvB, uLodB).a * uOpacityB;
float alpha = smoothstep(uThreshold - w, uThreshold + w, a);   // uThreshold = 0.667
```

`SceneRig.tsx` drives it from `morphValues(frac)` in `sceneMotion.ts`. Measured across a segment
(dpr 2, `texPxPerDevicePx = 1`, `LOD_GAIN = 2.5`, `BLUR_CAP = 180`):

| frac | blur out | blur in | LOD out | LOD in | op out | op in | **sum** |
|---|---|---|---|---|---|---|---|
| 0.00 | 0.0 | 180.0 | 0.00 | 9.81 | 1.00 | 0.00 | 1.00 |
| 0.25 | 0.5 | 136.4 | 1.23 | 9.41 | 0.98 | 0.31 | 1.29 |
| 0.40 | 3.3 | 19.4 | 4.04 | 6.60 | 0.87 | 0.61 | 1.48 |
| **0.50** | **8.0** | **8.0** | **5.32** | **5.32** | **0.76** | **0.76** | **1.52** |
| 0.60 | 19.4 | 3.3 | 6.60 | 4.04 | 0.61 | 0.87 | 1.48 |
| 0.75 | 136.4 | 0.5 | 9.41 | 1.23 | 0.31 | 0.98 | 1.29 |
| 1.00 | 180.0 | 0.0 | 9.81 | 0.00 | 0.00 | 1.00 | 1.00 |

Two things go wrong together, and the leading hypothesis is that it takes both:

1. **The sum overshoots the threshold.** `opacity` is `f^0.4` / `(1−f)^0.4`, which sums to **1.52** at the
   midpoint instead of 1.0. The cut is fixed at 0.667, so the *effective* threshold on the blurred
   coverage falls to `0.667 / 1.52 = 0.44` exactly when the coverage is at its blurriest. Everything with
   any coverage at that mip goes solid — which is precisely a slab with holes where the counters were.
2. **A mip is a box filter on an axis-aligned grid, not a Gaussian.** At the midpoint each slot samples
   LOD 5.32 — a ~51-px-wide mip of a ~2048-px texture. That is already blocky; the further reaches
   (LOD 8–9.8, a 4–8 texel image) are structureless. `LOD_GAIN = 2.5` exists to paper over the box/Gaussian
   mismatch and makes the mismatch worse at the extremes.
3. **Possible aggravator, unconfirmed:** `uvA = (vUv − 0.5)·uScaleA + 0.5` sends uv outside `[0,1]` for
   every title narrower than the plane. `CanvasTexture` clamps to edge; at LOD 0 the edge texel is
   transparent padding and this is harmless, but on a 4×2 mip the "edge texel" is the average of a quarter
   of the image and carries ink, so it smears across the whole out-of-range region. Kevin's own capture
   (his image 5) shows the smear extending well past where the title ever reaches, which is what put this
   on the list. **Check it before acting on it.**

## 3. What the fix must preserve — INVARIANTS, non-negotiable

These are all load-bearing and were paid for in round two. Breaking one is a red.

- **Rest LOD is exactly 0.** Each texture is rasterised at the em it is displayed at
  (`titleCapPx · viewport.dpr · fit`). The rig holds `TitleMetrics.drawnScale` while the computed fit stays
  within `TITLE_REDRAW_TOLERANCE` (1 %) and asks for ONE redraw through `sceneRefs.titleRedraw` when it
  moves. Do not collapse this into a single draw: a two-line title forces a fit below 1 in both languages,
  so a single draw can never rest at LOD 0. Both settled endpoints must stay pin-crisp.
- **The gooey bridge is the design**, not a bug to remove. The two names must *bridge* — blobs meeting and
  separating — not cross-fade. ADR 0011 and the round-two spec
  (`docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md`) are the intent of record. If you
  conclude the effect cannot survive in this form, say so and propose the alternative rather than quietly
  shipping a cross-fade.
- **Zero React state per frame.** ONE `useFrame` in `SceneRig` reads Framer's `scrollYProgress` /
  `useVelocity` and writes every visual through the pure helpers in `sceneMotion.ts`. No scroll-driven
  React state (ADR 0011). A language switch is the only thing that may re-render the scene subtree.
- **No DOM access inside `src/components/canvas/**` beyond `gl.domElement`, and no router access.**
- **The title stays on `TITLE_LAYER` (layer 1)**, which the composer never renders; `TitlePass` in
  `Environment.tsx` draws it after the composer, depth-tested. No fog on it — it is the one object the
  cream fog must not touch.
- **Anton fence:** Anton is the Selected Work title and nothing else on the site.
- **Reversibility:** every integer playhead is a settled state and the whole scrub is exactly reversible.
- **Reduced motion:** `frameloop="demand"`, `invalidate()` on scroll and resize, cards swap instantly, no
  morph. Whatever you add must respect it.
- The morph must stay a **pure function of the segment fraction** — no time-based state, no hysteresis
  that a reversed scrub could land on the wrong side of.

## 4. Acceptance criteria

- [ ] At **every** sampled segment fraction from 0.00 to 1.00 in steps of 0.05, on **both** transitions
      (card 0→1 and 2→3), at 1440×900 and at 390×844, the title reads as letterforms or as blobs derived
      from letterforms. No frame is a slab spanning the title width, and no frame shows ink outside the
      region the two names occupy.
- [ ] `s = 0.00` and `s = 1.00` are pixel-crisp: the redraw handshake still rests at LOD 0. Prove it with
      the `drawnScale` / `emPx` readout, not by eye.
- [ ] The transition still bridges. Show the frames; a straight cross-fade does not pass.
- [ ] PT and EN both pass, including the two-line "painel da reconstrução".
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` — 0 errors, and **still exactly 4 warnings** (`SmoothScroll.tsx`, `MotionContext.tsx`,
      react-refresh only). A fifth warning is a red.
- [ ] `npx vitest run` — all pass. Add unit coverage in `tests/unit/sceneMotion.test.ts` for whatever
      replaces `morphValues` (at minimum: the endpoints, and whatever invariant replaces "the sum is 1.52").
- [ ] `npx playwright test` — all pass (79 passed / 1 skipped is the current baseline; the skip is
      `scene-effects.spec.ts` on mobile).
- [ ] `perf-budget.spec.ts` still passes at its 300 ms budget without being moved. If your fix samples the
      texture more than twice per slot, measure the cost and say what it is.
- [ ] Zero console errors on a full headless scrub.

## 5. Process

- **The design gate is Kevin's, in chat, before implementation** (CLAUDE.md). Report the diagnosis you
  verified and the fix you propose, and stop for his approval. Do not implement first and ask after.
- Report findings as evidence with the command output that proves them, run in the same turn.
  "Should pass" is not evidence.
- Keep the commit on `feat/selected-work-scene` and push it; do not merge anything.
- If the fix changes the documented anatomy, update the **Title** bullet in `CLAUDE.md` in the same commit.
- Bulk output (full test runs, long logs) goes to a `scout` and comes back as a summary.

## 6. Map

| file | what it owns |
|---|---|
| `src/components/canvas/scene/SceneTitle.tsx` | the morph shader, the material, the redraw handshake |
| `src/components/canvas/scene/titleTexture.ts` | rasterises a name to a coverage mask; wrap, padding, ink rows, `emPx`/`capPx` |
| `src/components/canvas/scene/SceneRig.tsx` | the one `useFrame`; `setSlot` computes `uLod*` from `blur`, `dpr`, `emPx`, `capScale`; `LOD_GAIN` lives here |
| `src/utils/sceneMotion.ts` | `morphValues`, `morphBlur`, `BLUR_CAP`, `settleFrac`, `segmentFor`, the geometry |
| `src/components/canvas/scene/Environment.tsx` | `TitlePass` — the post-composer, depth-tested draw of layer 1 |
| `tests/unit/sceneMotion.test.ts` | the pure-helper contract |
| `tests/e2e/scene-scrub.spec.ts` | the scrub, the settled slots, `data-registrations` |

## 7. Facts inherited — do not re-derive

- On the **dev server** `data-registrations` reads `"2"`, never `"1"`: `main.tsx` wraps the app in
  StrictMode and dev double-invokes layout effects. The production build the e2e uses reads `"1"`. Not a bug.
- **The composer never mounts headless** — SwiftShader is a software rasteriser, and depth of field + grain
  mount on hardware GPUs only. `scene-effects.spec.ts` spoofs a hardware renderer string to cover that path.
  So a headless screenshot of the title is the *no-composer* path; that is fine here, because the title is
  drawn outside the composer either way, but do not conclude from headless that the composer path is clean.
- **A Laplacian-variance "sharper" check on the title cannot pass by construction** — the threshold shader
  hardens edges at any LOD, so edge energy barely moves. Judge glyph shape in crops, not edge energy.
- **Probing e2e fractions on exact playhead boundaries** (0.4444, 0.2222) flips on a one-pixel scroll
  rounding on the mobile project. Existing specs sit at 0.44 / 0.5 / 0.23 for that reason.
- All four featured titles and subtitles are **identical in EN and PT**; only the overture line switches
  words. A language switch therefore redraws the title textures but not the captions.
- `sceneGeometry` runs on the **canvas** size. Since `096f05a` the stage is full-bleed, so the canvas is now
  the full viewport width (it used to be 160 px narrower on desktop, 40 px on a phone).
