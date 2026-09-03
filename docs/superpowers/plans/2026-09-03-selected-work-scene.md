# Selected Work 3D scene implementation plan

**Goal:** Replace the pinned card stack + SVG gooey title with a scroll-driven 3D scene (camera dolly through a corridor of four project cards, in-scene morphing title, cream fog, per-card floor shadows, depth of field, an ambient "breath"), rendered by React Three Fiber in a third canvas.
**Architecture:** `Projects.tsx` keeps the section shell (skip links, eyebrow, SR heading, a `450svh` scroll wrapper with a `100svh` sticky stage) and mounts `SelectedWorkScene`, an R3F `<Canvas>` whose single frame loop reads Framer's `scrollYProgress`/velocity MotionValues and the clock, and writes every visual through pure helpers in `src/utils/sceneMotion.ts`. A DOM overlay (name, meta, `view` link) is positioned each frame inside the front card's white body band from the card's projected pose. `frontIndex` React state flips only at settle midpoints and feeds only non-visual attributes; the frame loop derives its own visual index from the playhead.
**Spec:** `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md` (rows Q5, Q11, Q13, Q15 carry "amended in plan review" notes; this plan is the authority for those four)
**Execution model:** opus
**Branch:** `feat/selected-work-scene` off `staging`; PR into `staging`. `main` is frozen (CLAUDE.md standing rule).
**Review wave (done 2026-09-03):** reviewer/opus (17 findings), reviewer/fable (15), codex-review/sol (8), consolidated into this revision. No second wave.

## Global constraints

- Zero React state per frame. Every per-frame visual = `scrollPose(playhead) + ambient(time)`, pure functions read inside `useFrame`. `frontIndex` state flips only when `settleFrac(frac) >= 0.5` (reduced motion: `Math.round`) and feeds only the overlay `<Link>` content/href, aria, the SR heading and `--row-tint*`. The frame loop never reads `frontIndex`: it derives `visualIndex = frontIndexFor(seg, n, reducedMotion)` itself.
- Lanes: the R3F frame loop reads Framer MotionValues (`useScroll`, `useVelocity`); Framer never animates a three object; GSAP untouched.
- Canvas rules: `dpr={[1, 1.5]}`; `<Canvas flat>` (no tone mapping; the cream must match the section's `#F5F2EC` exactly). Data attributes go on the REAL canvas (`state.gl.domElement`), set in `onCreated` and in the visibility/reduced-motion effects, never as `<Canvas>` props (R3F forwards those to its wrapper div): `data-canvas="selected-work-scene"`, `data-paused="true"` when off screen, `data-static="true"` under reduced motion. `.scene-canvas-wrap` carries `aria-hidden="true"`. IntersectionObserver toggles `frameloop` `'always' ↔ 'never'` (React state that flips on visibility only); reduced motion → `frameloop="demand"` + `invalidate()` on every `progress` change (`useMotionValueEvent`) and on resize. Context loss → permanent DOM fallback. At most two canvases without `data-paused` at any time, three mounted.
- WebGL2 required (three r185 has no WebGL1 path). No WebGL2 → DOM fallback list, no pin. A context loss mid-scroll swaps the `450svh` wrapper for the short list and shrinks the document; that jump is accepted (permanent fallback is the spec's rule).
- Wrapper `450svh`, sticky `100svh`; scrub distance 350svh; playhead `seg = p · 3.5 − 0.5 ∈ [−0.5, 3]`; settle plateaus = middle 70 % of each unit segment (`settleFrac`); the approach (`seg < 0`) has its own zero-slope-at-both-ends ease.
- Colours: clear colour, fog and floor `#F5F2EC` (`--color-surface-light`); card frame `#FFFFFF`; ink `#0B0E14`; halo = `accentFor(i)`; shadow tint = `accentDeepFor(i)` mixed into ink; overlay text follows the Plan B on-light table (name ink, subtitle `--color-ink-on-light-muted`, pill cream on ink, arrow raw `--row-tint`) and sits on the card's white body band. No new hex values. Any custom fragment shader ends with `#include <colorspace_fragment>`.
- Fog must apply to every scene object except the title: cards, halos and shadows use `MeshBasicMaterial` (fogged by default). Rounded corners are cut by GEOMETRY (a rounded-rect `ShapeGeometry` with remapped UVs), never by an alpha mask, so depth is written correctly and no notches appear in the halo behind.
- Anton only on the in-scene title. Lowercase everywhere. No spaced em-dash in reader-facing strings.
- Reduced motion: pin kept, on-demand renders, camera jumps to slot positions, no morph, no ambient, no tilt, no DoF, overlay always fully visible (`settledness ≡ 1`).
- Phone (`aspect < 1`): card ≈ 88 vw, lateral offsets bounded so the card never leaves the frame, tilt and DoF off, shadows on, no grain (ruling: phone grain skipped; the spec allowed either).
- Depth of field and grain post pass: desktop only (`matchMedia('(pointer: fine)')` and `innerWidth >= 768`). Keep `EffectComposer`'s default multisampling (do NOT pass `multisampling={0}`; the yawed card edges need MSAA).
- Dependencies pinned exactly: `three@0.185.1`, `@react-three/fiber@9.7.0`, `@react-three/postprocessing@3.1.1`, `postprocessing@6.39.4`; dev `@types/three@0.185.4`. `@react-three/drei` is NOT added (ruling: per-card blob shadows replace `ContactShadows`, and the camera is R3F's default). They are imported only from files reachable from `src/components/sections/Projects.tsx` (the lazy chunk).
- Frame rate is NOT test-verified: Playwright runs headless (SwiftShader), so rAF timing there is meaningless, and the perf harness is deferred to production (spec Q10). The only per-frame cost gates are the e2e long-task assertion (main thread) and Kevin's rating on the rig with DevTools' FPS meter (PR manual step 10). Design the scene for that: one blob-shadow plane per card instead of a shadow render pass, one post pass on desktop only.
- Plan checkboxes tick immediately after each step lands, never batched. Every commit on the feature branch; no permission needed for commits/pushes/PR creation.
- Verification per task: `npx tsc -b --noEmit`, `npm run lint`, the named tests, and for rendered surfaces a headless browser smoke against the DEV server (`npm run dev` is already running; smokes that read the DEV-only debug hook must run there, since the Playwright webServer is a production build). A smoke that says "card visible" samples the centre pixel of the expected card rect (`frameRects`) and asserts it is not cream.
- Library docs: `use context7` is not available here. Verify every R3F/postprocessing prop name against the installed package's `.d.ts` in `node_modules` before using it; report a mismatch with the plan as `blocked:`, do not guess.

## Geometry contract (all values live in `sceneMotion.ts`; worked numerically for 1440×900, 1920×1080, 1280×720 and 393×851 during plan review)

- Card plane `CARD_W = 1`, `CARD_H = 448 / 620` (the Shadway frame: 12 px-equivalent padding, a `16 / 9.5` cover at the top, a white body band ≈ 70/448 of the height below it; the DOM overlay lives in that band). `CARD_MAX_PX = 620`.
- Hover `HOVER = 0.2 · CARD_H`; card centre `CARD_Y = HOVER + CARD_H / 2` (= 0.7 · CARD_H); floor at `y = 0`.
- `FOV_DEG = 35`. Card width as a fraction of the frame width: `fraction = aspect < 1 ? 0.88 : min(0.46, CARD_MAX_PX / widthPx, 0.5 / (aspect · CARD_H))` (the last term caps the card at half the frame height). Camera distance to the slot `D = CARD_W / (fraction · 2 · tan(FOV/2) · aspect)`.
- Corridor: card `i` at `z = −i · spacing`, `spacing = 1.15 · D`; lateral `x_i = (i % 2 === 0 ? −1 : 1) · lateral`, `lateral = min(0.35 · clamp(aspect / 1.6, 0, 1), 0.9 · (0.5 / fraction − 0.5)) · CARD_W` (the second term keeps an 88 vw card inside the frame: 5.4 vw of offset on a phone, 15 vw at 1440); yaw `= −sign(x_i) · 8°`.
- Camera: `x = 0`, `y = camY = CARD_Y + (aspect < 1 ? 1.0 : 0.61) · CARD_H` (ABOVE the card centre; spec Q13 said below, which put the card on top of the title, so Q13 is amended), pitch `CAM_PITCH_DEG = −8` (down), `z = D − eased · spacing`, `near = 0.05`, `far = D + 4 · spacing`.
- `easedSeg(seg)`: for `seg ≥ 0`, `floor(seg) + settleFrac(seg − floor(seg))`, clamped to `3`; for `seg < 0` (the approach) `−APPROACH_DEPTH · (1 − smoothstep(a))` with `a = (seg + 0.5) / 0.5`, `APPROACH_DEPTH = 1`: the camera starts one spacing behind the slot and eases in with zero slope at the pin edge and at settle. Card 0 is ≈ 40 % fogged at `seg = −0.5`.
- Pass-through fade: `rel = eased − i`; opacity 1 up to `PASS_FADE_START = 0.67`, 0 at `PASS_FADE_END = 0.82`, `visible = false` beyond (the near plane is reached at `rel ≈ 0.85`, so the card is gone before it clips).
- Fog: `near = D + 0.15 · spacing`, `far = D + 2.2 · spacing` (next card ≈ 41 % fogged at settle, the one behind ≈ 90 %, the third gone), both × `(1 + 0.03 · sin(2π t / 9))`.
- Projection of a world point at forward distance `d` (along −z from the camera) and height offset `h = y − camY`, with pitch `φ = 8°`: `f = d·cos φ − h·sin φ`, `u = h·cos φ + d·sin φ`, `ndcY = u / (f · tan(FOV/2))`, `ndcX = x / (f · tan(FOV/2) · aspect)`, frame fraction from top `= 0.5 − 0.5·ndcY`. `frameRects(g)` uses exactly this.
- Title: camera-relative, forward distance `titleDistance = D + 0.25 · spacing`, centred at frame fraction `TITLE_CENTER = 0.24` from the top, cap height `titleCapPx = clamp(56, 0.09 · widthPx, 150)`, up to two lines (wrap at 18ch on a word boundary), line height 0.95, width ≤ 0.9 of the visible width. Its world offset `up = (0.5 − TITLE_CENTER) · 2 · titleDistance · tan(FOV/2)` along the camera's up axis; the rig positions it from the camera's pose every frame (the title is NOT parented to the camera: R3F's default camera is not in the scene graph). Focus distance for DoF = `focusDistance(g) = D`; focal range `≈ 0.5 · spacing` keeps the title crisp.
- Framing invariants (asserted by `frameRects` tests for the four viewports above): title band bottom < settled card top by ≥ 0.01 of the frame; card bottom ≤ 0.95; floor contact point under the card ≤ 1.0; card left ≥ 0.005 and right ≤ 0.995 with the lateral offset. (Worked values, 1440×900: card 33–83 % from top, title 17–31 %, contact 93 %; 393×851: card 42–72 %, title 21–27 %, contact 78 %.)
- Ambient (per card `i`, time `t` s): `y += 0.01 · CARD_H · sin(2π t / T_i + φ_i)`, `yaw += 1.5° · sin(2π t / (1.3 · T_i) + φ_i + 1)`, `pitch += 1.5° · sin(2π t / (0.8 · T_i) + φ_i + 2)`, `haloAlpha = 0.35 · (1 + 0.15 · sin(2π t / T_i + φ_i))`, with `T_i = 4 + 0.75 · i`, `φ_i = 1.7 · i`. Energy `e ∈ [0, 1]` multiplies the three motion amplitudes by `(1 + e)` and adds `−4° · e · sign(velocity)` to every card's yaw. Title float `±3 px` equivalent on `sin(2π t / 6)`.
- Velocity energy: target `= clamp(|v| / 1.2, 0, 1)` (`v` = `useVelocity(scrollYProgress)`, progress units/s); `τ = 0.15 s` rising, `0.6 s` falling: `next = prev + (target − prev) · (1 − exp(−dt / τ))`.
- Pointer tilt (desktop, the settled card only): target `(pitch, yaw) = (pointerNdcY · 6°, pointerNdcX · −6°)`, lerped with `τ = 0.15 s`; the title gets `−0.25 ×` of it. Weight = `settledness(seg)`.
- Settledness: `s = 1 − clamp((|seg − round(seg)| − 0.15) / 0.10, 0, 1)`; reduced motion: `s ≡ 1`.

---

### Task 1: dependencies, allowlist, and the records go into git

**Files:**
- `package.json`, `package-lock.json` — modify: add the four runtime deps and `@types/three` (dev) at the exact pinned versions above.
- `tests/unit/bundle-deps.test.ts` — modify: extend `allowed` with `three`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`.
- `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/superpowers/plans/2026-09-03-selected-work-scene.md`, `docs/adr/*.md` (all eight existing plus 0009 and 0010), `CONTEXT.md` — add to git (currently untracked). `perf/` stays untracked (not this plan's).

**Interfaces:** none produced; later tasks import from these packages.

**Work:** Create the branch from `staging`. `git add` the records listed and commit them first (`docs(scene): spec, plan, ADRs 0009/0010 and the glossary`). Then `npm install --save-exact three@0.185.1 @react-three/fiber@9.7.0 @react-three/postprocessing@3.1.1 postprocessing@6.39.4` and `npm install --save-dev --save-exact @types/three@0.185.4`. Confirm the peer ranges resolve (fiber wants `react >=19 <19.3`; installed React is 19.1.0). Do not add `@react-three/drei` or any other package.

**Acceptance check:** `npx vitest run tests/unit/bundle-deps.test.ts` — red after the install (one failure naming the first unallowed dep; the test throws on the first mismatch), green after the allowlist edit. `npx tsc -b --noEmit` green. `git status` shows the records tracked.

**Boundaries:** no source files, no Vite config.

- [x] **Step 1: branch off `staging`; `git add` the spec, plan, `docs/adr/`, `CONTEXT.md`; commit the records**
- [x] **Step 2: install the five packages at exact versions; `npm ls three @react-three/fiber @react-three/postprocessing postprocessing` shows no peer errors**
- [x] **Step 3: run the allowlist test (red), extend `allowed` (green); typecheck; commit `chore(deps): three + r3f + postprocessing for the selected-work scene`**

---

### Task 2: `sceneMotion.ts` pure helpers (TDD)

**Files:**
- `src/utils/sceneMotion.ts` — create.
- `tests/unit/sceneMotion.test.ts` — create.
- `src/utils/stackMotion.ts`, `tests/unit/stackMotion.test.ts` — NOT touched here (deleted in Task 3).

**Interfaces (produced, exact):**
```ts
export const CARD_COUNT = 4
export const CARD_W = 1
export const CARD_H = 448 / 620
export const CARD_MAX_PX = 620
export const HOVER = 0.2 * CARD_H
export const CARD_Y = HOVER + CARD_H / 2
export const FOV_DEG = 35
export const CAM_PITCH_DEG = -8
export const APPROACH_DEPTH = 1
export const PASS_FADE_START = 0.67
export const PASS_FADE_END = 0.82
export const TITLE_CENTER = 0.24
export const BLUR_CAP = 180
export interface SceneGeometry {
  aspect: number; widthPx: number; heightPx: number; fraction: number
  D: number; spacing: number; lateral: number; camY: number
  titleDistance: number; titleCapPx: number; near: number; far: number
}
export interface Rect { top: number; bottom: number; left: number; right: number }   // fractions of the frame, 0 = top/left
export interface CardPose { x: number; y: number; z: number; yaw: number; opacity: number; visible: boolean }
export interface CameraPose { x: number; y: number; z: number; pitch: number }       // pitch in radians, negative = down
export interface AmbientOffset { y: number; yaw: number; pitch: number; haloAlpha: number }
export function clamp(v: number, lo: number, hi: number): number
export function smoothstep(t: number): number
export function settleFrac(frac: number): number            // 0 on [0,.15], smoothstep across [.15,.85], 1 on [.85,1]
export function playheadFor(progress: number): number       // p·3.5 − 0.5, clamped to [−0.5, 3]
export function easedSeg(seg: number): number               // approach ease for seg<0, plateaus for seg≥0; see the contract
export function segmentFor(seg: number, n: number): { index: number; frac: number }  // index = clamp(floor(seg), 0, n−2), frac = clamp(seg − index, 0, 1); n ≤ 1 → {0,0}; seg<0 → {0,0}
export function frontIndexFor(seg: number, n: number, reducedMotion: boolean): number
export function sceneGeometry(widthPx: number, heightPx: number): SceneGeometry
export function cameraPose(eased: number, g: SceneGeometry): CameraPose
export function cardPose(i: number, eased: number, g: SceneGeometry): CardPose   // y = CARD_Y; ambient added by the caller
export function projectPoint(x: number, y: number, z: number, cam: CameraPose, g: SceneGeometry): { fx: number; fy: number; ahead: number }  // frame fractions (0 top/left), ahead = f (>0 when in front)
export function frameRects(g: SceneGeometry): { card: Rect; title: Rect; floorContactY: number }  // settled card 0 (parity −1), ignoring yaw
export function settledness(seg: number, reducedMotion: boolean): number
export function focusDistance(g: SceneGeometry): number     // g.D
export function morphValues(frac: number): { incoming: { blur: number; opacity: number }; outgoing: { blur: number; opacity: number } }
// f = settleFrac(frac): incoming.blur = min(8/f − 8, BLUR_CAP) (f=0 → BLUR_CAP), incoming.opacity = f^0.4; outgoing mirrors with (1 − f). 8 px each at f = 0.5.
export function ambientOffset(i: number, t: number, energy: number): AmbientOffset
export function velocityEnergy(prev: number, velocity: number, dt: number): number
export function velocityYaw(energy: number, velocity: number): number      // radians
export function fogRange(g: SceneGeometry, t: number): { near: number; far: number }
```

**Work:** Red-green per function. Tests at least: `settleFrac` plateaus and monotonicity; `playheadFor(0) = −0.5`, `playheadFor(1) = 3`; `easedSeg` equals `seg` at every integer ≥ 0, equals `−1` at `−0.5` and `0` at `0`, is monotonic non-decreasing on a 0.01 grid, has a plateau ≥ 0.3 wide around each integer, and its finite-difference slope at `−0.5` and at `0` is < 0.05; `segmentFor` boundaries for n = 4 (seg 3 → index 2, frac 1); `frontIndexFor` flips exactly once per segment at the settle midpoint and `round`s under reduced motion; `sceneGeometry`: fraction 0.43 at 1440×900, 0.323 at 1920×1080, 0.389 at 1280×720, 0.88 at 393×851; `spacing = 1.15·D`; `lateral` at 393×851 ≤ `0.9·(0.5/0.88 − 0.5)·CARD_W`; `cameraPose.z` strictly decreasing in `eased`; `cardPose` alternates the sign of `x`, opacity 1 at `rel ≤ 0.67`, invisible at `rel ≥ 0.82`, continuous at both edges; `frameRects` invariants for the four viewports (title bottom < card top − 0.01, card bottom ≤ 0.95, floorContactY ≤ 1, left ≥ 0.005, right ≤ 0.995); `settledness` is 1 on the plateau, 0 at `|frac| ≥ 0.25`, `≡ 1` under reduced motion; `focusDistance = D`; `morphValues` symmetric 8 px at the midpoint, blur within `[0, BLUR_CAP]`; `ambientOffset`: `y`, `yaw`, `pitch` each have zero mean over THEIR OWN period (`T_i`, `1.3·T_i`, `0.8·T_i`; numeric integration, tolerance 1e-3) and stay within their amplitudes; `haloAlpha` has mean `0.35` over `T_i` and stays within `0.35 ± 0.0525`; energy 1 doubles the motion amplitudes; `velocityEnergy` never leaves `[0, 1]`, rises faster than it falls, decays to < 0.05 within 2 s from 1; `velocityYaw` sign follows the velocity; `fogRange` near < far and card 0 at `seg = −0.5` has a fog factor ≥ 0.35 (`(dist − near)/(far − near)` with `dist = D + APPROACH_DEPTH·spacing`).

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` — red until each helper exists, green at the end. `npx tsc -b --noEmit` and `npm run lint` green.

**Boundaries:** no components, no CSS; do not touch `stackMotion.ts` or its test yet.

- [x] **Step 1: constants, `settleFrac`, `playheadFor`, `easedSeg`, `segmentFor`, `frontIndexFor` (red → green)**
- [x] **Step 2: `sceneGeometry`, `cameraPose`, `cardPose`, `projectPoint`, `frameRects`, `settledness`, `focusDistance` (red → green, including the four-viewport framing invariants)**
- [x] **Step 3: `morphValues`, `ambientOffset`, `velocityEnergy`, `velocityYaw`, `fogRange` (red → green)**
- [x] **Step 4: typecheck, lint; commit `feat(scene): pure motion and framing helpers for the selected-work scene`**

---

### Task 3: section cutover and the scene shell (untextured cards)

**Files:**
- `src/components/canvas/SelectedWorkScene.tsx` — create: WebGL2 probe, `<Canvas>`, real-canvas attributes, IO pause, reduced-motion frameloop, context loss, ready callback; owns `sceneRefs`.
- `src/components/canvas/scene/sceneRefs.ts` — create.
- `src/components/canvas/scene/SceneRig.tsx` — create: the ONE `useFrame` loop (camera + card poses only, in this task).
- `src/components/canvas/scene/Corridor.tsx` — create: four card groups with a plain white `MeshBasicMaterial` frame plane (rectangular in this task; rounded geometry and covers come in Task 4).
- `src/components/sections/Projects.tsx` — modify: new anatomy; removes `GooeyTitle`, `ProjectCardStack`, `stackMotion` imports.
- `src/components/ui/GooeyTitle.tsx`, `src/components/ui/ProjectCardStack.tsx`, `src/utils/stackMotion.ts`, `tests/unit/stackMotion.test.ts`, `tests/e2e/stack-scrub.spec.ts`, `tests/e2e/stack-reduced-motion.spec.ts` — delete.
- `src/index.css` — modify: replace the whole `SELECTED WORK — CARD STACK` block (from its `/* ====` header comment above `.projects-stack-section` through the `@media (prefers-reduced-motion: reduce)` block that ends the file) with the `SELECTED WORK — SCENE` block; retarget the comment near line 2108 that names `.stack-inner` to `.scene-inner`.

**Interfaces:**
- Consumes: `sceneMotion.ts` (Task 2); `useMotion()` → `prefersReducedMotion`; `accentFor`/`accentDeepFor`.
- Produces:
  ```ts
  // sceneRefs.ts
  export interface SceneRefs {
    cards: (THREE.Group | null)[]                 // length CARD_COUNT, Array(CARD_COUNT).fill(null)
    cardMaterials: (THREE.MeshBasicMaterial | null)[]   // frame + cover share opacity via this list of ALL card materials per index (array of arrays is fine: (THREE.MeshBasicMaterial[] )[])
    halos: (THREE.Mesh | null)[]; haloMaterials: (THREE.MeshBasicMaterial | null)[]
    shadows: (THREE.Mesh | null)[]; shadowMaterials: (THREE.MeshBasicMaterial | null)[]
    title: THREE.Group | null; titleMaterial: THREE.ShaderMaterial | null
    energy: { value: number }; tilt: { pitch: number; yaw: number }; pointer: { x: number; y: number }
  }
  export function createSceneRefs(): SceneRefs
  // SelectedWorkScene.tsx
  export interface SceneCard { slug: string; title: string; subtitle: string; art: string; alt: string }
  export interface SelectedWorkSceneProps {
    cards: SceneCard[]; titles: string[]
    progress: MotionValue<number>
    reducedMotion: boolean
    overlayRef: React.RefObject<HTMLDivElement | null>     // positioned each frame from Task 5 on
    pillRef: React.RefObject<HTMLAnchorElement | null>     // pointer-events toggled on the pill itself
    onReady: () => void                                     // fires once when the inner Suspense content has mounted
    onWebglUnavailable: () => void                          // fires once: no WebGL2 at mount, or context lost
  }
  export function SelectedWorkScene(props: SelectedWorkSceneProps): JSX.Element | null
  ```
  `SelectedWorkScene` holds `useRef(createSceneRefs())` and passes it as a prop to `SceneRig`, `Corridor` (and later `SceneTitle`, `Environment`). Each object component registers its objects/materials into the arrays in a layout effect and nulls them on unmount.
- Section DOM (later tasks and the tests depend on these exact hooks): `section#projects.section.projects-scene-section` › `nav.scene-skiplinks` › `a.scene-skiplink`; `div.scene-scroll` (450svh, `useScroll` target) › `div.scene-sticky` › `div.scene-inner` (carries `--row-tint`, `--row-tint-deep`) › `div.scene-canvas-wrap[aria-hidden="true"][data-ready]` (contains `canvas[data-canvas="selected-work-scene"]`), `p.scene-eyebrow` › `span.scene-eyebrow-num`, `h2.scene-title-sr` (visually hidden, current title), `div.scene-meta` (empty in this task). When WebGL is unavailable: `div.scene-fallback` replaces `.scene-scroll` (a plain `<ul>` of the four titles linked to `/projects/:slug` in this task; styled in Task 9).

**Work:**
- `Projects.tsx`: keep the featured selection, `lang`, the `cards` mapping (`art` falls back to `''`), `useScroll` on `.scene-scroll`, and the `useMotionValueEvent` that sets `frontIndex` via `frontIndexFor(playheadFor(p), n, prefersReducedMotion)` with the identical-value guard. `ready` state (from `onReady`) → `data-ready="true"` on `.scene-canvas-wrap`; `webglUnavailable` state → the fallback. `.scene-title-sr` text = `cards[frontIndex].title`.
- `SelectedWorkScene`: probe `document.createElement('canvas').getContext('webgl2')` before rendering the Canvas; null → `onWebglUnavailable` in an effect, render `null`. `<Canvas flat dpr={[1, 1.5]} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }} camera={{ fov: FOV_DEG, near: 0.05, far: <from sceneGeometry> }} frameloop={…} onCreated={({ gl }) => { gl.setClearColor('#F5F2EC'); set data-canvas on gl.domElement }}>`, `<fog attach="fog" args={['#F5F2EC', near, far]} />`, and `<Suspense fallback={null}>` INSIDE the Canvas around `Corridor` (the section's DOM renders immediately; the outer Home Suspense never falls back → CLS 0). A child `ReadySignal` component inside the Suspense calls `onReady` once in an effect. `frameloop`: reduced motion → `'demand'` plus `useMotionValueEvent(progress, 'change', invalidate)` and a resize → `invalidate()`; otherwise `inView ? 'always' : 'never'` from an IntersectionObserver on the wrap. Mirror `data-paused`/`data-static` on `gl.domElement`. `webglcontextlost` on `gl.domElement` → `preventDefault()` is NOT called (fallback is permanent) → `onWebglUnavailable`.
- `SceneRig`: ONE `useFrame((state, delta) => …)`: `p = progress.get()`, `seg = playheadFor(p)`, `eased = reducedMotion ? clamp(round(seg), 0, 3) : easedSeg(seg)`, `g = sceneGeometry(size.width, size.height)` (memo in a ref, recompute when `size` changes; also update `camera.far` and the fog then), `cam = cameraPose(eased, g)` → `camera.position.set(cam.x, cam.y, cam.z)`, `camera.rotation.set(cam.pitch, 0, 0)`; for each card `i`: `pose = cardPose(i, eased, g)` → group position/rotation.y/visible, and `opacity` onto every material in `cardMaterials[i]`. Nothing else in this task.
- `Corridor`: per card a `<group>` with one plane `CARD_W × CARD_H`, `MeshBasicMaterial({ color: '#FFFFFF', transparent: true, fog: true })`; registers group + material into `sceneRefs`.
- CSS: `.projects-scene-section { overflow: visible; background: var(--color-surface-light) }`; `.scene-scroll { height: 450svh; margin-top: 96px }`; `.scene-sticky { position: sticky; top: 0; height: 100svh; overflow: hidden }`; `.scene-inner { position: relative; height: 100% }`; `.scene-canvas-wrap { position: absolute; inset: 0; opacity: 0; transition: opacity .4s var(--ease-house) } .scene-canvas-wrap[data-ready="true"] { opacity: 1 } .scene-canvas-wrap canvas { display: block; width: 100%; height: 100% }`; `.scene-eyebrow` = today's `.stack-eyebrow` rules, absolutely positioned at `top: clamp(64px, 9svh, 104px)` and the container side padding; `.scene-title-sr` = the existing visually-hidden pattern; `.scene-skiplinks`/`.scene-skiplink` = today's `.stack-skiplinks`/`.stack-skiplink` rules renamed. Reduced-motion media block: nothing stack-related remains.

**Acceptance check:** `npx tsc -b --noEmit`, `npm run lint`, `npx vitest run` (old `stackMotion` test gone; `sceneMotion` + `bundle-deps` green); headless smoke on the dev server: `#projects .scene-scroll` height ≈ 4.5 × viewport; exactly one `#projects canvas[data-canvas="selected-work-scene"]`; `.scene-canvas-wrap[data-ready="true"]` appears; at progress 0.15 the centre pixel of `frameRects(g).card` (parity −1) is white, not cream, and at 0.43 the mirrored rect's centre is white; the bottom-centre pixel of the frame is `#F5F2EC` ± 1 (no visible canvas edge); `.scene-title-sr` text differs between 0.15 and 0.43; zero console errors. Red before: the selectors do not exist.

**Boundaries:** no textures, no rounded corners, no title, no overlay content, no environment, no ambient. Do not edit `FluidWaves.tsx`, `Hero.tsx`, `#chapter-light`, or any other section.

- [x] **Step 1: `sceneRefs.ts`; `Corridor.tsx` with plain white planes registering into the refs**
- [x] **Step 2: `SceneRig.tsx` (camera + card poses + opacity; reduced-motion jump)**
- [x] **Step 3: `SelectedWorkScene.tsx` (probe, Canvas `flat`, real-canvas attrs, IO frameloop, RM invalidate-on-scroll, context loss, `ReadySignal`)**
- [x] **Step 4: rewrite `Projects.tsx`; delete the six old files**
- [x] **Step 5: replace the CSS block; retarget the `.stack-inner` comment**
- [x] **Step 6: typecheck, lint, `npx vitest run`, headless smoke (report the pixel checks and the two SR texts in words); commit `feat(scene): r3f scene shell and camera dolly replace the card stack`**

---

### Task 4: card anatomy — rounded geometry, covers, body band

**Files:**
- `src/components/canvas/scene/roundedRect.ts` — create: `roundedRectGeometry(w: number, h: number, r: number, segments = 8): THREE.BufferGeometry` — a `ShapeGeometry` from a rounded-rect `THREE.Shape`, with UVs remapped to `[0,1]` across the rect (ShapeGeometry's default UVs are in shape units).
- `src/components/canvas/scene/Corridor.tsx` — modify: frame = rounded rect `CARD_W × CARD_H`, radius `16/620·CARD_W`; cover = rounded rect inset by `12/620·CARD_W` on the top/left/right, aspect `16/9.5`, radius `10/620·CARD_W`, at `z + 0.002`, `MeshBasicMaterial({ map, transparent: true, fog: true, toneMapped: false })`, texture `colorSpace = SRGBColorSpace`, `anisotropy = min(8, gl.capabilities.getMaxAnisotropy())`, loaded via `useLoader(THREE.TextureLoader, url)` (suspends inside the inner Suspense); the white body band is simply the uncovered lower part of the frame. Missing `art` → frame only.

**Interfaces:** consumes `SceneRefs` (registers the cover material alongside the frame material in `cardMaterials[i]`). No new exports beyond `roundedRectGeometry`.

**Work:** Geometry-cut corners only (no alpha masks). Dispose geometries/textures on unmount. Textures load lazily with the chunk; the first cover may pop in during the fade-in, which the 0.4 s wrap fade covers.

**Acceptance check:** headless smoke at 0.15 and 0.43 on the dev server: the settled card rect's upper-centre pixel is not white (cover present), its lower band pixel (`card.bottom − 0.04` of the frame) is white, corner pixels just inside `card.top/left` are cream (rounded); zero console errors; typecheck, lint.

**Boundaries:** no halo/shadow yet; no overlay.

- [ ] **Step 1: `roundedRect.ts` with remapped UVs**
- [ ] **Step 2: frame + cover meshes, textures, disposal**
- [ ] **Step 3: smoke (cover / band / corner pixels); commit `feat(scene): rounded card frames and covers`**

---

### Task 5: the DOM overlay in the body band, SR heading wiring, and the scrub e2e

**Files:**
- `src/components/sections/Projects.tsx` — modify: fill `div.scene-meta`; pass `overlayRef` and `pillRef`.
- `src/components/canvas/scene/SceneRig.tsx` — modify: per-frame overlay placement and visibility.
- `src/index.css` — modify: `.scene-meta*` rules inside the scene block.
- `tests/e2e/scene-scrub.spec.ts` — create (replaces the deleted `stack-scrub`).
- `tests/e2e/nav-on-light.spec.ts` — modify: the two `.stack-card-link` lines → `.scene-meta-pill`; scroll to the settled fraction `0.15` of the `.scene-scroll` range (same helper as `scene-scrub`) before clicking.

**Interfaces:**
- Consumes: `SceneRefs`, `settledness`, `projectPoint`, `cardPose`, `ambientOffset` (energy 0 until Task 8), `frontIndexFor`.
- Produces DOM: `div.scene-meta` › `div.scene-meta-labels` › `p.scene-meta-name`, `p.scene-meta-subtitle`; `a.scene-meta-pill` (react-router `<Link to="/projects/:slug">`, `ref={pillRef}`) › `span.scene-meta-pill-label` (`t('sections.projects.stack.viewProject')`) + `span.scene-meta-arrow[aria-hidden]` (`↗`).

**Work:**
- Content from `cards[frontIndex]` (state → re-render only on flips). Layout = today's `.stack-card-body`: a flex row, labels left, pill right, sized to the body band. CSS: `.scene-meta { position: absolute; left: 0; top: 0; transform-origin: top left; pointer-events: none; will-change: transform, opacity; display: flex; align-items: center; justify-content: space-between; gap: 14px }`; `.scene-meta-pill { pointer-events: auto }` — and the rig ALSO writes `pill.style.pointerEvents` (`'none'` while `settledness < 0.5`; a parent's `pointer-events: none` does not block a child set to `auto`). Typography: name Jakarta 700 ink `clamp(14px, 1.4vw, 16px)`, subtitle `--color-ink-on-light-muted` 13 px tabular-nums, both ellipsised; pill = today's `.stack-card-pill` (ink bg, cream text, `border-radius: 999px`, 13 px), arrow `var(--row-tint)`; `:focus-visible` ring `outline: 2px solid var(--color-ink-on-light); outline-offset: 3px`. Lowercase.
- In the rig's loop: `vi = frontIndexFor(seg, n, reducedMotion)` (NOT React `frontIndex`); the body band's world rect for card `vi`: card-local `x ∈ [−CARD_W/2 + pad, CARD_W/2 − pad]`, `y ∈ [−CARD_H/2 + pad, −CARD_H/2 + pad + bandH]` where `pad = 12/620·CARD_W`, `bandH = CARD_H − 2·pad − coverH`; transform the band's top-left and bottom-right by the card's pose + ambient y (NOT the tilt or the ambient yaw/pitch), project with `projectPoint`, convert to CSS px in the wrap, ROUND to whole px, and write `overlay.style.transform = translate3d(x, y, 0)`, `overlay.style.width/height`. Opacity = `settledness(seg, reducedMotion)`. Direct DOM writes, no state. Under reduced motion the overlay is always at full opacity and the pill always clickable.
- `scene-scrub.spec.ts`: `scrollToFraction` helper on `#projects .scene-scroll` (absolute Y via `getBoundingClientRect().top + scrollY`, `behavior: 'instant'`, 160 ms wait); wait for `body[data-loader-state="done"]` and `#projects .scene-canvas-wrap[data-ready="true"]`. Test 1: at `0.15` read `.scene-meta-pill` href, `.scene-meta-subtitle` text, `.scene-title-sr` text; `expect(pill).toBeVisible()` and computed opacity of `.scene-meta` is `'1'`; at `0.43` all three differ; back at `0.15` href and title restored. Test 2: at `0.15` the pill href matches `^/projects/` and clicking navigates there. Test 3 (context loss): at `0.15`, `page.evaluate` gets the scene canvas, `getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()`; then `#projects .scene-fallback .scene-fallback-link` count 4, `#projects .scene-scroll` count 0, `#projects canvas` count 0.

**Acceptance check:** `npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/nav-on-light.spec.ts` green on both projects (desktop + Pixel 5). Red before: the selectors do not exist. Plus typecheck, lint.

**Boundaries:** no title, no environment, no ambient beyond reading `ambientOffset` at energy 0 for the band position.

- [ ] **Step 1: overlay markup + CSS; refs passed**
- [ ] **Step 2: per-frame band projection (rounded px), opacity, pill pointer-events**
- [ ] **Step 3: `scene-scrub.spec.ts` (three tests); retarget `nav-on-light.spec.ts`**
- [ ] **Step 4: run the two specs, typecheck, lint; commit `feat(scene): front-card overlay in the body band; scrub and context-loss e2e`**

---

### Task 6: the in-scene morphing title

**Files:**
- `src/components/canvas/scene/titleTexture.ts` — create: `drawTitleTexture(text: string, opts: { dpr: number; maxLinePx: number; fontPx: number }): Promise<{ texture: THREE.CanvasTexture; widthPx: number; heightPx: number; lineCount: number; capPx: number }>` — awaits `document.fonts.load('400 100px Anton')`; wraps at word boundaries so no line exceeds `maxLinePx` (≈ 18ch at `fontPx`), max 2 lines, line height 0.95; draws lowercase WHITE glyphs on transparent (alpha = coverage) with `fontPx = 300`; canvas ≤ 2048 px wide; `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`, `magFilter = LinearFilter`, `premultiplyAlpha = false`. Cap height is constant across titles (same `fontPx`); the plane height scales with `lineCount`.
- `src/components/canvas/scene/SceneTitle.tsx` — create: the title group + plane + `ShaderMaterial`; regenerates textures in an effect when `titles` change (language switch) and swaps uniforms when ready (NOT through Suspense: a suspend here would blank the whole scene for a frame); disposes every replaced texture and the material/geometry on unmount.
- `src/components/canvas/scene/SceneRig.tsx` — modify: title pose from the camera each frame + morph uniforms + float.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: mount `SceneTitle` inside the inner Suspense's sibling (it must not suspend); it registers `title` and `titleMaterial` into `sceneRefs`.

**Interfaces:**
- Consumes: `morphValues`, `segmentFor`, `settleFrac`, `SceneGeometry.titleDistance/titleCapPx`, `TITLE_CENTER`.
- Produces: `SceneTitle` props `{ titles: string[]; reducedMotion: boolean; sceneRefs: SceneRefs }`; `ShaderMaterial` uniforms `uTexA`, `uTexB`, `uLodA`, `uLodB`, `uOpacityA`, `uOpacityB`, `uColor` (ink, linear), `uThreshold` (0.667).

**Work:**
- Pose (in the rig, every frame): `title.position = camera.position + camera.forward · titleDistance + camera.up · up + camera.up · floatOffset`, `title.quaternion = camera.quaternion`, where `up = (0.5 − TITLE_CENTER) · 2 · titleDistance · tan(FOV/2)` and `floatOffset` = 3 px equivalent × `sin(2π t / 6)` (px → world at `titleDistance`: `2 · titleDistance · tan(FOV/2) / heightPx`). Plane size: height = `lineCount · 0.95 · (capPx-to-line ratio from the texture) · titleCapPx / heightPx · 2 · titleDistance · tan(FOV/2)`, width from the texture aspect, capped at `0.9 ×` visible width at that distance (uniform scale-down only for the width cap; the two-line wrap makes it rare).
- Morph mapping: `{ index, frac } = segmentFor(seg, n)`, `uTexA = titles[index]` with `morphValues(frac).outgoing`, `uTexB = titles[index + 1]` (or A again when `index + 1 ≥ n`, with opacity 0) with `.incoming`. Approach (`seg < 0`): `uTexA = titles[0]` with `morphValues(a).incoming` where `a = (seg + 0.5)/0.5` (the title resolves from blur as card 0 surfaces), `uOpacityB = 0`. Reduced motion: `uTexA = titles[clamp(round(seg), 0, n−1)]` crisp, `uOpacityB = 0`.
- LOD: `texPxPerCssPx = texture.widthPx / (plane's projected CSS width)`; `baseLod = max(0, log2(texPxPerCssPx))` (natural minification, so the crisp state does not alias); `lod = max(baseLod, log2(max(blurPx · texPxPerCssPx · LOD_GAIN, 1)))`, `LOD_GAIN = 2.5` as a named tunable (a mip level approximates a box, not a Gaussian; the gain compensates).
- Fragment (`glslVersion: THREE.GLSL3`): `a = textureLod(uTexA, vUv, uLodA).a · uOpacityA + textureLod(uTexB, vUv, uLodB).a · uOpacityB; w = fwidth(a) · 0.75; alpha = smoothstep(uThreshold − w, uThreshold + w, a); if (alpha < 0.02) discard; outColor = vec4(uColor, alpha); #include <colorspace_fragment>`. `transparent: true`, `depthWrite: true` (the DoF pass reads depth: a non-depth-writing title would inherit the far floor's blur), `depthTest: true`, `renderOrder` above the cards so it draws last.
- Acceptance is visual parity with the old gooey morph: at the midpoint the two words bridge with blobs, edges hard, no grey halo; at rest no shimmer under the float. If mip LOD cannot reach parity after tuning `LOD_GAIN`, the sanctioned alternative is 4–5 pre-blurred variants per title via `ctx.filter = 'blur(px)'`, lerping the two nearest; report which shipped.

**Acceptance check:** dev-server smokes at 0.15 (crisp, screenshot), 0.29 (mid-morph, screenshot), 0.43 (crisp next); EN and PT cap heights of the rendered title equal within 3 px (measure the ink extent in the screenshot rows); "painel da reconstrução" renders on two lines at 1440×900; the title band's pixels sit above `frameRects(g).card.top` at rest; language toggle redraws (SR heading + screenshot). `scene-scrub` still green. Zero console errors.

**Boundaries:** no DoF/shadows/halos. The only Anton consumer is this file pair.

- [ ] **Step 1: `titleTexture.ts` (font load, wrap ≤ 2 lines, mipmapped CanvasTexture)**
- [ ] **Step 2: `SceneTitle.tsx` plane + ShaderMaterial (fwidth AA, discard, depthWrite, colorspace include); language regeneration + disposal**
- [ ] **Step 3: title pose from the camera, morph uniforms, LOD with `baseLod`, approach resolve, reduced-motion crisp path**
- [ ] **Step 4: smokes (three fractions, EN/PT cap height, two-line PT title, language switch); `scene-scrub`; commit `feat(scene): in-scene anton title with a mip-lod gooey morph`**

---

### Task 7: environment — floor, blob shadows, halos, depth of field, grain, fog drift

**Files:**
- `src/components/canvas/scene/Environment.tsx` — create: the floor plane, and the desktop-only post pass (`EffectComposer` › `DepthOfField`, `Noise`).
- `src/components/canvas/scene/Corridor.tsx` — modify: per card a halo plane behind and a blob-shadow plane on the floor (`sceneRefs.halos/haloMaterials/shadows/shadowMaterials`).
- `src/components/canvas/scene/gradients.ts` — create: `radialGradientTexture(size = 256, inner = 1, outer = 0): THREE.CanvasTexture` and `roundedBlobTexture(w = 256, h = 192, blurPx = 40): THREE.CanvasTexture` (a blurred white rounded rect on transparent; alpha = shadow density).
- `src/components/canvas/scene/SceneRig.tsx` — modify: fog drift, halo alpha, shadow alpha.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: mount `Environment`; `desktopEffects = matchMedia('(pointer: fine)').matches && innerWidth >= 768` evaluated at mount and on resize crossings.

**Interfaces:** consumes `accentFor(i)`, `accentDeepFor(i)`, `fogRange`, `ambientOffset`, `focusDistance`, `SceneGeometry`.

**Work:**
- Floor: `<mesh rotation-x={−π/2}>` plane `60 × 60` centred under the corridor, `MeshBasicMaterial({ color: '#F5F2EC', fog: true })` — same hex as fog and clear colour, so it has no visible horizon and reads only through the shadows.
- Blob shadow per card: a plane `1.25·CARD_W × 1.25·CARD_H·0.6` lying on the floor (`rotation-x −π/2`, `y = 0.002`, `renderOrder` below the cards), centred under the card's x/z, `MeshBasicMaterial({ map: roundedBlobTexture, color: mix(ink, accentDeepFor(i), 0.25), transparent: true, depthWrite: false, fog: true })`; opacity written per frame `= 0.28 · (1 − 0.4 · ambientBob/amplitude) · pose.opacity` (the shadow lightens as the card rises) and hidden with the card. The title has no shadow by construction. No render pass, no drei.
- Halo per card: a plane `2.2·CARD_W` square at `z − 0.05` behind the card, `MeshBasicMaterial({ map: radialGradientTexture, color: accentFor(i), transparent: true, depthWrite: false, fog: true })`, `renderOrder` below the cards; opacity per frame `= ambientOffset(i, t, energy).haloAlpha · pose.opacity`, hidden with the card (so a passing card's halo never floods the frame).
- Fog: `scene.fog.near/far` from `fogRange(g, t)` each frame (and after a resize).
- Post (desktop only): `<EffectComposer>` (default multisampling) with `DepthOfField` focused at `focusDistance(g)` and `Noise opacity={0.035}` (grain only on desktop; ruling recorded). Prefer world-unit focus props if the installed `postprocessing` `.d.ts` exposes them (`worldFocusDistance`, `worldFocusRange`); otherwise compute the normalised `focusDistance`/`focalLength` from camera near/far, and report which. Focal range ≈ `0.5 · spacing` either side of `D` so the title (0.25 · spacing further) stays crisp; `bokehScale ≈ 2.5`. On phones the composer is not mounted.

**Acceptance check:** dev-server smokes at 0.15 and 0.43, desktop 1440×900: pixels just below the settled card's bottom edge (frame fraction `card.bottom + 0.02`, centre x) are darker than cream (shadow), the floor under the title band (`title.bottom + 0.02` … actually sample `floorContactY − 0.3` at `x = 0.5`) is `#F5F2EC` ± 2 (nothing but cards cast), a pixel just outside the card's side edge shows the card's tint blended toward cream (halo), the next card's rect centre is lighter than the settled card's (fog), the bottom-centre pixel of the frame is `#F5F2EC` ± 1 on desktop AND on Pixel 5 (colour pipeline consistent with and without the composer); Pixel 5: no composer mounted, shadows present; zero console errors; `scene-scrub` green; `npx playwright test tests/e2e/perf-budget.spec.ts` green.

**Boundaries:** no ambient card motion, no tilt (Task 8). No particles, no reflection.

- [ ] **Step 1: `gradients.ts`; floor plane**
- [ ] **Step 2: blob shadows + halos in `Corridor.tsx`; per-frame alpha in the rig**
- [ ] **Step 3: fog drift**
- [ ] **Step 4: `EffectComposer` (DoF + Noise) desktop-gated; verify prop names against the installed `.d.ts`**
- [ ] **Step 5: smokes (desktop + Pixel 5, the pixel checks above), `scene-scrub`, `perf-budget`; commit `feat(scene): cream floor, tinted blob shadows, halos, fog drift, desktop depth of field`**

---

### Task 8: the breath — ambient motion, velocity energy, pointer tilt

**Files:**
- `src/components/canvas/scene/SceneRig.tsx` — modify: `useVelocity(progress)`, the energy accumulator, ambient offsets, the tilt lerp, the DEV debug hook.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: pointer NDC tracking on the wrap (`pointermove` → `sceneRefs.pointer` in `[−1, 1]`, reset on leave; only when `pointer: fine`).

**Interfaces:** consumes `ambientOffset`, `velocityEnergy`, `velocityYaw`, `settledness`, `SceneRefs.energy/tilt/pointer`. No new exports.

**Work:** In the same single `useFrame`: `t = state.clock.elapsedTime`, `v = velocityMV.get()`, `energy = velocityEnergy(prevEnergy, v, delta)` → `sceneRefs.energy.value`; `vi = frontIndexFor(seg, n, reducedMotion)`; `s = settledness(seg, reducedMotion)`; tilt pair lerped toward the pointer target with `k = 1 − exp(−delta / 0.15)`; per card `i`: `pose = cardPose(i, eased, g)`, `amb = ambientOffset(i, t, energy)`, `isFront = i === vi`; `position.y = pose.y + amb.y`; `rotation.y = pose.yaw + amb.yaw + velocityYaw(energy, v) + (isFront ? tilt.yaw · s : 0)`; `rotation.x = amb.pitch + (isFront ? tilt.pitch · s : 0)`. Title gets `−0.25 ×` the tilt (added to its pose from Task 6). The overlay band projection (Task 5) uses `pose.y + amb.y` only. Reduced motion: none of this runs (the reduced branch returns after the static writes; `energy = 0`). DEV hook: `if (import.meta.env.DEV) (window as …).__scene = sceneRefs` once, in an effect.

**Acceptance check:** dev-server smoke (NOT the preview build: the hook is stripped there): at progress 0.15, sample `__scene.cards[0].rotation.y` and `.position.y` at two instants 1 s apart → they differ, and the differences stay below the ambient bounds (`0.01·CARD_H·2` for y, `1.5°·2 + 4°` for yaw); under `reducedMotion: 'reduce'` the two samples are identical. `scene-scrub` and `perf-budget` green. Zero console errors.

**Boundaries:** amplitudes exactly per the Geometry contract; no state per frame; no new libraries.

- [ ] **Step 1: `useVelocity` + energy accumulator + `velocityYaw`**
- [ ] **Step 2: ambient offsets on cards, halos and shadows; visual index in-loop**
- [ ] **Step 3: pointer tracking + tilt lerp (front card, settledness-weighted; title counter-tilt)**
- [ ] **Step 4: DEV hook; smokes (idle drift vs. reduced motion); commit `feat(scene): ambient breath, velocity energy and pointer tilt`**

---

### Task 9: reduced motion, no-WebGL fallback, canvas invariant; full e2e

**Files:**
- `src/components/sections/Projects.tsx` — modify: the real `div.scene-fallback` (four `article.scene-fallback-card`: cover `<img width=1024 height=608 loading="lazy">`, name, subtitle, `a.scene-fallback-link` to the project), rendered instead of `.scene-scroll` when WebGL2 is unavailable or after context loss.
- `src/index.css` — modify: `.scene-fallback*` rules (light-chapter card anatomy: white, 16 px radius, hairline border, 12 px padding; single column, `max-width: 620px`, normal flow, no pin).
- `tests/e2e/scene-reduced-motion.spec.ts` — create.
- `tests/e2e/scene-no-webgl.spec.ts` — create.
- `tests/e2e/contact-waves.spec.ts` — modify: the canvas-count assertion.
- `tests/e2e/reduced-motion.spec.ts`, `tests/e2e/section-enters.spec.ts`, `tests/e2e/light-chapter.spec.ts` — modify ONLY if a selector broke (expect no code change).

**Interfaces:** consumes the DOM from Tasks 3–5.

**Work:**
- `scene-reduced-motion.spec.ts` (`test.use({ contextOptions: { reducedMotion: 'reduce' } })`): at fraction 0.15 → `#projects .scene-sticky` top within 4 px of 0; `#projects canvas[data-canvas="selected-work-scene"]` has `data-static="true"`; no `svg filter` inside `#projects`; `.scene-meta-pill` `toBeVisible()` and `.scene-meta` computed opacity `'1'`; href + bounding box; at 0.18 (same segment) box unchanged within 1.5 px; at 0.30 (mid-segment under RM) the pill is still visible with opacity `'1'` and clickable (`pointer-events` computed `auto`); at 0.43 href differs and the box `y` unchanged within 1.5 px (swap, not flight).
- `scene-no-webgl.spec.ts`: `page.addInitScript` overrides `HTMLCanvasElement.prototype.getContext` to return `null` for `'webgl2'` (WebGL1 untouched, so the hero keeps working and the test isolates the scene's probe); goto `/`, wait for the loader; `#projects .scene-fallback .scene-fallback-link` count 4, `#projects .scene-scroll` count 0, `#projects canvas` count 0, zero console errors.
- `contact-waves.spec.ts`: replace `expect(canvases).toBeLessThanOrEqual(2)` with: total `canvas` count ≤ 3 AND `canvas:not([data-paused])` count ≤ 2 AND `#projects canvas` has `data-paused="true"` while the contact stage is in view.
- Full suite.

**Acceptance check:** `npx playwright test` fully green on `desktop-chromium` and `mobile-chromium`; `npx vitest run` green; typecheck, lint. Red before: the new/changed specs fail on missing selectors / the old `≤ 2` assertion.

**Boundaries:** no scene changes beyond wiring the fallback; do not touch `FluidWaves`.

- [ ] **Step 1: real `.scene-fallback` markup + CSS**
- [ ] **Step 2: `scene-reduced-motion.spec.ts` (incl. the 0.30 sample); green**
- [ ] **Step 3: `scene-no-webgl.spec.ts` via `addInitScript`; green**
- [ ] **Step 4: retarget `contact-waves.spec.ts`; green**
- [ ] **Step 5: full `npx playwright test` + `npx vitest run` + typecheck + lint (paste the summary lines); commit `test(scene): reduced motion, no-webgl fallback and the live-canvas invariant`**

---

### Task 10: records, spec ticks, PR

**Files:**
- `CLAUDE.md` — modify: (1) the **Canvases (max 2 on the page)** bullet → "Canvases (three mounted, at most two live)" and add the scene canvas (`data-canvas="selected-work-scene"`, R3F, lazy chunk, same DPR/IO/context-loss rules, attributes on the real canvas); (2) rewrite the **Selected Work stage** bullet to describe the scene (link the spec and this plan; anatomy: `.scene-*`, corridor, slot, approach, playhead, ambient, overlay in the body band, blob shadows, fallback); (3) **NO** list: replace "a third canvas anywhere on the page" with "a fourth canvas anywhere on the page"; keep "the R3F hero accent"; add "`@react-three/drei`" as not used; (4) **Animations** bullet: the lane rule (R3F frame loop reads Framer MotionValues; Framer never animates a three object); (5) **Tech Stack** R3F line: accurate again, used by the Selected Work scene only; (6) the Loader/GooeyTitle references in the Selected Work bullet go away with the rewrite.
- `README.md` — modify: the 3D-layer line (R3F powers the Selected Work scene; hero/backdrop stay raw WebGL; no drei).
- `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md` — modify: tick each `## TODO` box whose acceptance passed in Tasks 3–9; the last box (Kevin's rating) stays unticked until he says GREEN.
- `docs/adr/0009-selected-work-scene-is-a-third-canvas-rendered-by-r3f.md` — verify the package list matches (no drei); adjust if not.
- `CONTEXT.md` — verify the entries match the shipped names (`.scene-*`); wording only.

**Work:** Edit the documents; push; open the PR against `staging` (never `main`) with: what changed, the manual test steps below, what was verified, and that the three-leg review is Kevin's to trigger. Manual steps: (1) `npm run dev`, open `/`, scroll into Selected Work: the hero dissolves into the cream scene, card 1 surfaces from the fog while the title resolves from blur, settles crisp under the title; (2) scroll slowly through all four: the title morphs at each midpoint, each card's shadow stays under it as the camera travels, the next cards soften ahead; (3) stop scrolling: cards breathe; flick: a small yaw that settles; (4) hover the settled card: tilt; click `view`: the project page; (5) Tab from the top: skip links, then the `view` link with a visible ring; (6) toggle PT: title redraws, "painel da reconstrução" on two lines; (7) phone width: card ≈ 88 vw, no tilt/DoF, shadows on; (8) OS reduced motion: static, instant swaps, overlay always visible; (9) DevTools → Rendering → "WebGL" off, or `chrome://flags`: the fallback list; (10) DevTools → Rendering → Frame Rendering Stats while scrubbing and at idle: report the FPS you see on the rig (no test covers this).

**Acceptance check:** `git diff --stat staging...HEAD` shows only the files this plan names (including the records committed in Task 1); `gh pr view` shows the PR against `staging`; `npx vitest run` and `npx playwright test` green on the final commit (paste the summary lines).

**Boundaries:** no code changes in this task beyond docs. Do not merge.

- [ ] **Step 1: CLAUDE.md edits (the six points)**
- [ ] **Step 2: README line; ADR 0009 package list; CONTEXT.md wording**
- [ ] **Step 3: tick the spec TODO boxes that passed; commit `docs(scene): records for the selected-work scene`**
- [ ] **Step 4: push; open the PR against `staging` with the manual steps; paste the PR URL**

---

## Risks and rulings

- **Chunk evaluation vs. the long-task budget.** three + R3F + postprocessing add roughly 200 KB gzipped to the Projects chunk, evaluated on idle after LCP. If `perf-budget.spec.ts` goes red on the 300 ms long-task assertion and the long task is the chunk's module evaluation, the implementer reports `blocked:` with the measured duration and does not mark the task done; raising the budget or eager-loading is Kevin's call, not the implementer's.
- **Frame rate is unverified by tests** (headless SwiftShader). The scene is designed to be cheap per frame (no shadow render pass, one post pass on desktop only) and Kevin's rating on the rig, with the DevTools FPS meter, is the gate.
- **`postprocessing` DoF prop surface.** Task 7 verifies against the installed `.d.ts` and falls back to normalised values.
- **Mip-LOD blur fidelity.** Task 6 names the sanctioned alternative (pre-blurred variants). Either must pass the visual parity bar; the implementer reports which shipped.
- **Spec deviations made in the review fix pass** (recorded in the spec rows): Q13 camera ABOVE the card centre with an 8° pitch (the approved numbers put the card over the title); Q5/Q15 floor shadows are per-card tinted blob planes, not a `ContactShadows` pass (the pass would cast the title and halos, and costs a full scene render per frame); Q11 `@react-three/drei` dropped; Q16's "cross the title as they grow" is now "rise toward the title band and settle just beneath it" (with the 8° pitch the far cards' tops overlap the band's bottom by 2–4 % while behind the title plane, which is the crossing moment).
- **Context loss mid-scroll** swaps the pinned wrapper for a short list and shrinks the document. Accepted: the fallback is permanent by spec.
