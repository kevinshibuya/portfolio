# About Storm Cinematic — Design

**Status:** approved
**Date:** 2026-05-21
**Branch:** `feat/about-cinematic-rework` (continuation; replaces the 3-beat implementation merged at HEAD)
**Supersedes:** `2026-05-20-about-cinematic-rework-design.md`

---

## Goal

Replace the rejected 3-beat About cinematic with a pinned scroll experience where a tin-robot dominates the frame and 6 text fragments curve around the camera like the inner wall of a storm — scroll-driven rotation, in-canvas text, sparse one-fragment-at-a-time reveal, with the robot dollying in, disassembling, holding scattered, then reassembling at close.

## Why we are rewriting

The shipped v1 had four design defects that the user rejected on visual review:
1. Robot rendered too small — peaked at ~5% of viewport coverage instead of ~25%.
2. Text used an `eyebrow / title / body` structure inappropriate for the editorial tone wanted — fragments-with-flow, not labeled beats.
3. Text rendered in DOM via Framer Motion → no spatial relationship with the canvas; unreadable on notebook screens at the chosen font sizes.
4. Choreography lacked the "eye of the storm" centerpiece — text floated over the canvas rather than orbiting inside it.

This spec is a clean replacement on the same branch. The GLB pipeline, fonts, posters, Footer attribution, useMediaQuery hook, and About orchestrator pattern survive; the canvas scene graph, choreography, text rendering, fallback content, and unit/e2e tests are rewritten.

## Architecture

300vh outer pinned `<section>` + 100vh sticky inner container — same shell as v1. Inside the sticky container, a full-bleed R3F `<Canvas>` carries the cinematic; a sibling `<p class="sr-only">` provides screen-reader access. The fallback path (mobile + reduced-motion) replaces the canvas branch entirely with a DOM-only `<AboutFallback>` so the R3F chunk never downloads when not needed.

```
<section id="about" class="about-outer">              ← 300vh, scroll target
  <div class="about-sticky">                          ← 100vh, sticky top:0
    <Canvas camera={[0,0,5]} fov=35 alpha dpr=[1,2]>
      <Suspense>
        <BackPlane />                                 ← soft mist-blue backdrop, z=-10
        <ToyModel />                                  ← GLB, choreographed via useFrame
        <StormText fragments={ABOUT_FRAGMENTS} />     ← 6 drei <Text> on a virtual cylinder
        <ambientLight intensity=0.6 />
        <directionalLight position=[3,4,5] intensity=0.8 />
      </Suspense>
    </Canvas>
    <p class="sr-only">{t('sections.about.fallbackParagraph')}</p>
  </div>
</section>
```

The "storm cylinder" is virtual — no cylinder mesh is rendered. It is a layout convention: each fragment sits at `(R·sin θ, yᵢ, −R·cos θ)` with `rotation.y = θ + π` so its glyphs face the camera at origin.

## Choreography timeline

Scroll progress 0→1 across the 300vh pinned section, sourced from `useScroll({ target: outerRef, offset: ['start start', 'end end'] })`.

| Scroll       | Robot pose                                                              | Camera z   | Cylinder Y rotation (ψ) | Reveal in active window |
|--------------|-------------------------------------------------------------------------|------------|-------------------------|--------------------------|
| 0.00         | assembled at rest pose, front-facing (small, distant)                   | 5.0        | 0°                      | (none yet)               |
| 0.00 → 0.25  | continuous Y spin (2π over the phase), eases to 0 (front-facing) at 0.25 | 5.0 → 2.5  | 0° → 60°                | fragment 1               |
| 0.25 → 0.50  | parts scatter outward to bounded positions in [−2,2]×[−2,2]×[−1.5,1.5]   | 2.5        | 60° → 180°              | fragments 2, 3           |
| 0.50 → 0.75  | parts hold scattered; gentle sinusoidal drift (≤0.05u per axis, 0.4 Hz)  | 2.5        | 180° → 240°             | fragments 4, 5           |
| 0.75 → 1.00  | parts converge back to assembled rest pose                              | 2.5        | 240° → 360°             | fragment 6               |

**Peak robot size.** At scroll 0.25 the robot occupies ~25% of a 1440×900 viewport (height ~50% viewport, width ~25%). Achieved by dollying camera z from 5.0 → 2.5 while the model stays at unit scale. The target is the rendered size matching "1/4 of desktop view" from the user feedback screenshot.

**Front-facing pose.** The model starts front-facing (Y = 0) at scroll 0.0 and spins one full revolution (2π) around Y between scroll 0.0 and 0.25, landing back at front-facing at exactly progress 0.25. Easing function: `cubic-bezier(0.22, 1, 0.36, 1)` consistent with the rest of the site.

**Disassembly + reassembly.** Each mesh has a cached `assembledRest` position (captured on first useFrame after mount, stored in `mesh.userData`) and a deterministic `scatterTarget` position (from `scatterOffset(index)` — bounded LCG; same pure utility we keep from v1). Lerp between `assembledRest` and `scatterTarget` keyed on progress through phases B and D.

**Hold drift.** During phase C, each part's position = `scatterTarget + Vector3(0.05·sin(t·2.5 + φ_x), 0.05·sin(t·2.5 + φ_y), 0.05·sin(t·2.5 + φ_z))` where `φ_*` are per-mesh phase offsets baked into `mesh.userData` to break unison.

**Allocation discipline.** A module-scoped `_tmp = new Vector3()` reused inside `useFrame` — no per-frame allocations.

## Storm cylinder

**Layout.** Radius R = 6 world units, axis along world Y. Six fragments at base angles `θᵢ = i · (2π/6)` for `i ∈ [0..5]`. Scroll-driven rotation ψ added uniformly: `θᵢ + ψ`. Final position for fragment i:

```
position = (R · sin(θᵢ + ψ), yᵢ, −R · cos(θᵢ + ψ))
rotation = (0, θᵢ + ψ + π, 0)
```

`yᵢ` per-fragment vertical jitter: `[0, 0.4, −0.3, 0.2, −0.4, 0.1]` so fragments don't all sit on the robot's eye-line.

**Active-fragment opacity.** Only the fragment closest to camera-front (angle 0 relative to camera) is visible at full opacity. Smooth crossfade in a ±10° window around the boundary:

```
front_angle_i(progress) = wrapPi(θᵢ + progress·2π − π)
opacity_i               = smoothstep(30°, 20°, abs(front_angle_i))
                       // 1.0 when |angle| ≤ 20°, 0.0 when |angle| ≥ 30°
```

`wrapPi(x)` wraps an angle into `[−π, π]`. `smoothstep(edge0, edge1, x)` is the standard 3·t² − 2·t³ ramp.

With 60° spacing and a total cylinder rotation of 2π over the section, exactly six clean reveal events happen in scroll-order. The crossfade window prevents popping.

**Text rendering.** drei `<Text>` (SDF via Troika). Font: `/fonts/PlusJakartaSans-VariableFont_wght.ttf` (already in `public/`, TTF chosen specifically because Troika's Typr.js doesn't decode WOFF2 — lesson carried from v1). Parameters:

| Property      | Value                  |
|---------------|------------------------|
| `fontSize`    | 0.55 (world units)     |
| `maxWidth`    | 8                      |
| `letterSpacing` | 0.02                 |
| `lineHeight`  | 1.05                   |
| `color`       | `#111822` (ink)        |
| `anchorX`     | `center`               |
| `anchorY`     | `middle`               |
| `fillOpacity` | bridged from MotionValue (see below) |

**Opacity bridge.** Each `<Text>` subscribes to its `opacity_i` MotionValue using the same pattern from v1's BeatText: `useEffect` registers `motionValue.on('change', v => { mat.opacity = v; mat.needsUpdate = true })` with a 0.005 threshold to skip imperceptible updates. Cleanup unsubscribes on unmount.

## Content

Six fragments, EN + PT, authored in i18n. Phrasing below is the **starting draft** — wording can be refined during implementation without re-approving this spec. Counts (6 fragments, ≤8 words each), phase mapping, and i18n shape are locked.

| # | Phase | EN (draft) | PT (draft) |
|---|-------|-----------|-----------|
| 1 | A (zoom in)    | i build interactive things.                  | construo coisas interativas.                    |
| 2 | B (disassemble) | as a kid i took my toys apart.              | quando criança eu desmontava meus brinquedos.   |
| 3 | B (disassemble) | to see how they worked.                     | pra ver como funcionavam.                       |
| 4 | C (hold)        | seven years shipping. data, real-time, ai.  | sete anos entregando. dados, tempo real, ia.    |
| 5 | C (hold)        | brazilian. porto alegre. a team of one.     | brasileiro. porto alegre. um time de um.        |
| 6 | D (reassemble)  | thinking-with-ai daily. still curious.      | pensar-com-ia todo dia. ainda curioso.          |

**Data shape** (`src/data/aboutFragments.ts`):

```ts
export interface AboutFragment {
  id: 'curiosity' | 'kid-toys' | 'how-it-worked' | 'present' | 'place' | 'future'
  i18nKey: string  // e.g. 'sections.about.fragments.curiosity'
}

export const ABOUT_FRAGMENTS: readonly AboutFragment[] = [
  { id: 'curiosity',     i18nKey: 'sections.about.fragments.curiosity' },
  { id: 'kid-toys',      i18nKey: 'sections.about.fragments.kid-toys' },
  { id: 'how-it-worked', i18nKey: 'sections.about.fragments.how-it-worked' },
  { id: 'present',       i18nKey: 'sections.about.fragments.present' },
  { id: 'place',         i18nKey: 'sections.about.fragments.place' },
  { id: 'future',        i18nKey: 'sections.about.fragments.future' },
] as const
```

**i18n keys** (replace v1's `sections.about.beats[]`):

```jsonc
"about": {
  "label": "about kevin — storm of work",
  "fragments": {
    "curiosity":     "i build interactive things.",
    "kid-toys":      "as a kid i took my toys apart.",
    "how-it-worked": "to see how they worked.",
    "present":       "seven years shipping. data, real-time, ai.",
    "place":         "brazilian. porto alegre. a team of one.",
    "future":        "thinking-with-ai daily. still curious."
  },
  "fallbackParagraph": "i build interactive things. as a kid i took my toys apart to see how they worked. seven years later i ship interactive work across data, real-time systems, and ai — a brazilian team of one in porto alegre, thinking-with-ai daily."
}
```

`fallbackParagraph` is authored independently (not auto-concatenated) so the prose reads naturally — connective tissue, proper capitalization, no double periods.

## Fallback

`src/components/ui/AboutFallback.tsx` — fully rewritten from v1's beat-stack:

```
<section id="about" class="about-fallback">
  <small class="about-fallback__label">{t('sections.about.label')}</small>
  <picture>
    <source type="image/webp" srcset="/images/about-toy-poster.webp" />
    <img src="/images/about-toy-poster.png" alt="" class="about-fallback__poster" />
  </picture>
  <p class="about-fallback__paragraph">{t('sections.about.fallbackParagraph')}</p>
</section>
```

- No animation other than a quiet fade-in (CSS opacity transition) on first paint.
- Poster: ~600px width on desktop fallback, ~100% width on mobile, `aspect-ratio` preserved.
- Paragraph: editorial type, max-width ~36ch, line-height 1.4. Font size scales from 22px (mobile) to 32px (≥768px).
- `alt=""` because the paragraph already states the same idea — the image is decorative in this context.

## Accessibility

- `<Canvas>` carries `aria-hidden="true"`.
- Sibling `<p class="sr-only">` (canvas branch only) holds `t('sections.about.fallbackParagraph')` — same string the fallback shows visibly, so the canonical content is identical regardless of branch.
- Fallback branch is native DOM text — no extra sr-only needed.
- `useReducedMotion() !== false` coerces null (first-render) to "reduced" so the R3F lazy chunk does not download for reduced-motion users (carried from v1 fix).
- `useMediaQuery('(max-width: 900px)')` routes mobile to the fallback before the lazy import is evaluated.

## Reuse vs rewrite (branch continuation)

The branch continues on top of v1's 30 commits. Inventory:

**Keep as-is** (touched only if breaking changes force it):
- `public/models/about-toy.glb` (162 KB, Sketchfab Vintage Toy Robot, CC-BY 4.0)
- `public/fonts/PlusJakartaSans-VariableFont_wght.ttf`
- `public/images/about-toy-poster.{webp,png}` — **re-capture required**: v1 peak pose was smaller than the new ~25%-viewport target, so the fallback poster needs to be re-shot from the new scene at progress 0.25.
- `src/hooks/useMediaQuery.ts`
- `src/components/layout/Footer.tsx` (CC-BY attribution markup)
- `scripts/capture-about-poster.mjs` (poster capture flow)
- `src/components/sections/About.tsx` (orchestrator pattern — lazy + Suspense + reduced-motion + media-query)

**Adapt** (kept but modified):
- `src/components/canvas/AboutScene/scatterMath.ts` — `scatterOffset(index)` reused as-is; `spreadDirection` no longer needed (no spread phase) and is removed
- `src/components/canvas/AboutScene/useAboutProgress.ts` — replaces `beatOpacityRange` exports with `fragmentOpacityAtAngle` + per-fragment MotionValues derived from `scrollYProgress`
- `src/index.css` — replace `.about-fallback__beat*` rules with `.about-fallback__{label,poster,paragraph}` rules; keep `.about-outer`, `.about-sticky`, `.sr-only`

**Replace** (new files / total rewrites):
- `src/components/canvas/AboutScene/AboutScene.tsx` — new camera + outer ref + scroll wiring
- `src/components/canvas/AboutScene/Scene.tsx` — new graph (BackPlane + ToyModel + StormText + lights)
- `src/components/canvas/AboutScene/ToyModel.tsx` — new choreography (spin + dolly + scatter + hold-drift + reassemble)
- `src/components/canvas/AboutScene/StormText.tsx` — replaces `BeatText.tsx`; cylindrical layout + scroll rotation + per-fragment opacity bridge
- `src/components/ui/AboutFallback.tsx` — new content shape (poster + condensed paragraph)
- `src/data/aboutFragments.ts` — replaces `src/data/aboutBeats.ts`
- i18n keys in `src/i18n/locales/{en,pt}.json` — delete `sections.about.beats[]` (kept temporarily during transition); add `sections.about.{label, fragments.*, fallbackParagraph}`

**Delete**:
- `src/data/aboutBeats.ts`
- `src/components/canvas/AboutScene/BeatText.tsx`
- v1 unit tests for beats (`tests/unit/data/aboutBeats.test.ts`, `tests/unit/canvas/BeatText.test.tsx`, etc.)
- v1 e2e for 3-beat choreography (`tests/e2e/about-cinematic.spec.ts` rewritten)

## Testing

Unit (Vitest + jsdom):
- `aboutFragments`: exactly 6 entries, each with a unique `id` and a resolvable `i18nKey`.
- `useAboutProgress`: opacity at scroll 0.0 → fragment 0's `opacity_0` ≈ 1.0, others ≈ 0.0; opacity at scroll 0.5 → fragment 3 (or its neighbor depending on bookkeeping) ≈ 1.0; opacity at scroll 1.0 → fragment 5 ≈ 1.0.
- `AboutFallback`: renders the label, a single `<picture>`, and the `fallbackParagraph` text. No animation timers running.
- `About` orchestrator: returns `<AboutFallback />` when `useReducedMotion()` is `true` or `null`; returns `<Suspense>` boundary when normal.
- `wrapPi` + `smoothstep` math helpers: boundary cases (−π, 0, π), monotonicity within the crossfade window.

E2E (Playwright):
- Desktop: scroll to about, assert canvas mounted, scroll incrementally and read which fragment text node is fully opaque at each stop; verify exactly one is visible per scroll position (sparse mode).
- Desktop: assert the robot bounding-box (computed from canvas snapshot) reaches ~25% viewport coverage at scroll 0.25.
- Mobile: assert fallback paragraph is present, R3F chunk did not download (`network` filter).
- Reduced-motion: same as mobile.

Visual sweep (Playwright + sharp, in `scripts/`):
- 9 captures at progress 0.0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1.0. Saved as PNG to `tmp/about-storm-sweep/` for manual inspection. Re-runnable via `npm run sweep:about`.

## Performance

- 6 `<Text>` meshes + ~32 sub-meshes from the GLB = ~40 meshes. Below the threshold where R3F frame cost becomes a concern on integrated GPUs at fov=35.
- `dpr={[1, 2]}` caps device pixel ratio for retina screens — prevents 4× cost on 4K displays.
- Frameloop runs only while the pinned section is in view (existing IntersectionObserver pattern from v1).
- Material disposal in `useEffect` cleanup on unmount.
- Lazy-loaded canvas: `import('../canvas/AboutScene')` only after orchestrator decides canvas branch is appropriate. R3F bundle stays out of the LCP path.
- Lighthouse target: Performance ≥ 90 against `npm run preview` (port 4173) — same as v1.

## Risks + open items

- **Text legibility at notebook resolutions.** R=6 + fov=35 + fontSize=0.55 is the design target; verify visually at 1440×900 and 1366×768 during implementation. If the active fragment reads smaller than ~28px equivalent, drop R to 5 (text effectively scales up) or raise fontSize to 0.65.
- **Robot peak size verification.** "1/4 of desktop view" is interpreted as ~25% viewport area. Verify at progress 0.25 via Playwright capture. If under-sized, adjust camera dolly endpoint from z=2.5 to z=2.2 (smaller = closer = bigger).
- **Sparse mode means stretches of empty canvas.** Between fragments there are moments where no text is visible. This is intentional (breathing room, "in the eye of the storm"). User has approved the sparse pattern.

## Out of scope (v2; can be follow-ups)

- Wire-segment effects connecting scattered parts (visual "the toy is still one entity")
- Particle dust during the hold phase
- Camera shake / DoF
- Audio
- Per-fragment color/typography accents (e.g., italic on one specific word)
- Mobile fallback animation beyond fade-in

## TODO (acceptance criteria — ticked during implementation)

- [x] Pinned 300vh outer + 100vh sticky container renders, scroll progress maps 0→1 cleanly.
- [x] Robot reaches ~25% viewport coverage at scroll 0.25 (verified via Playwright capture).
- [x] Robot completes one full Y revolution between scroll 0.00 and 0.25, settling at front-facing pose.
- [x] Robot dolly: camera z = 5.0 at scroll 0.0, z = 2.5 at scroll 0.25, stays at 2.5 through 1.0.
- [x] Disassembly fully unfolds between scroll 0.25–0.50; each mesh interpolates from rest to its `scatterOffset(index)` target.
- [x] Hold phase (0.50–0.75) shows sinusoidal drift ≤ 0.05u per axis at 0.4 Hz; per-mesh phase offsets break unison.
- [x] Reassembly fully completes between scroll 0.75–1.00; robot returns to rest pose at progress 1.0.
- [x] 6 fragments are rendered as drei `<Text>` meshes positioned on the virtual cylinder (R=6, 60° spacing, jittered Y).
- [x] Cylinder rotates 360° as scroll progresses 0→1.
- [x] Active-fragment opacity is 1.0 when |angle| ≤ 20°, 0.0 when |angle| ≥ 30°, crossfaded smoothstep between.
- [x] At any scroll position, exactly 0 or 1 fragments are fully opaque (sparse invariant).
- [x] `<Text>` rendering uses Plus Jakarta Sans TTF (not WOFF2); fontSize 0.55, color ink, anchor center/middle.
- [x] Canvas `<canvas>` has `aria-hidden="true"`; sr-only `<p>` sibling carries `fallbackParagraph`.
- [ ] Reduced-motion + max-width:900px route to `<AboutFallback>`; R3F chunk does not download on those branches (verified via network filter).
- [x] `AboutFallback` renders label + poster + single `fallbackParagraph`.
- [x] `aboutFragments.ts` exports exactly 6 entries with the documented `id`s.
- [x] i18n: EN + PT have `sections.about.{label, fragments.*, fallbackParagraph}`; no orphan `sections.about.beats*` keys remain.
- [x] Footer CC-BY 4.0 attribution unchanged (carried from v1).
- [ ] Unit tests: aboutFragments shape, useAboutProgress opacity boundaries, AboutFallback DOM, About orchestrator branching.
- [ ] E2E tests: desktop sparse-reveal at 6 scroll stops, robot peak-size assertion at 0.25, mobile fallback present + no R3F chunk, reduced-motion fallback present.
- [ ] `npm run build` clean; `npm run lint` 0 errors; `npm run test:unit` 100% pass; `npx playwright test` 100% pass.
- [x] Lighthouse Performance ≥ 90, Accessibility ≥ 95 against `npm run preview`.
