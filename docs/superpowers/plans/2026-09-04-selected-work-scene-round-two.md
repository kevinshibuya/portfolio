# Selected work scene, round two: the card is the object — implementation plan

**Goal:** Make the Selected Work card the whole object (caption on the card, pressable, no halo, no DOM chrome), remove the scroll-driven React state that flickers the scene, sharpen and cap the title, add the overture beat, and strip section numbering site-wide.
**Architecture:** The R3F scene keeps ONE frame loop (`SceneRig`) that reads Framer MotionValues and writes three objects; this round deletes `frontIndex` so nothing re-renders on scroll, moves the card's meta into a per-card canvas texture on its body band, adds R3F pointer events that call back into the React Router root through a prop, and renders the Anton title in a post-composer pass. Pure helpers in `sceneMotion.ts` stay the single source of every number, unit-tested first.
**Spec:** `docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md` (Q1–Q17). Prior contract still in force where unchanged: `docs/superpowers/plans/2026-09-03-selected-work-scene.md`.
**Execution model:** opus
**Branch / PR:** `feat/selected-work-scene`, PR #7 → `staging` stays open and absorbs every commit here. `main` is frozen. No merge until Kevin's manual pass is GREEN and the three-leg review has run on the final PR.

## Global constraints

- `main` is frozen; everything lands on `feat/selected-work-scene`; commits and pushes need no permission; the merge does.
- Zero React state driven by scroll. The frame loop reads `progress` (MotionValue) and writes three objects and, when a value CHANGES, three data attributes on the real canvas element (`gl.domElement`): `data-slot`, `data-overture`, `data-registrations`. Nothing in React reads them.
- Lanes: R3F loop reads Framer MotionValues; Framer never animates a three object; GSAP entrance-only. R3F pointer events are the only way the pointer reaches a card; navigation happens in the React Router root via a callback prop, never inside the Canvas (R3F's Canvas is a separate React root; router context does not cross it).
- Canvas rules unchanged: DPR ≤ 1.5, `data-paused`/`data-static` on the real canvas, `frameloop` toggling, `data-warm` idle warm-up, context-loss fallback, at most two live canvases.
- Reduced motion: no breath, no lift, no tilt, instant swaps, on-demand renders; the overture is a static frame for `seg < −0.5` and absent after.
- Perf budget in `tests/e2e/perf-budget.spec.ts` stays at 300 ms; do not raise it.
- Anton is used by the title and nothing else; Jakarta (already loaded `FontFace`, `Plus Jakarta Sans`) is the caption and overture face.
- Colours: caption name `#0B0E14`, subtitle `rgba(11,14,20,0.62)`, arrow `accentDeepLargeFor(i)` (`src/utils/palette.ts`), card face white. Overture and title ink `#0B0E14` on cream. No new hex.
- Scroll mapping: `.scene-scroll` is **550svh**; `playheadFor(p) = clamp(p · 4.5 − 1.5, −1.5, 3)`; overture `[−1.5, −0.5)`, approach `[−0.5, 0)`, cards `[0, 3]`. Playwright fraction for settled card k is `(k + 1.5) / 4.5` (card 0 → `0.3333`, card 1 → `0.5556`; approach start → `0.2222`).
- Caption legibility: the caption name is drawn at `26 / 620` of the card width; it must be ≥ 12 px on screen on every viewport ≥ 320 px wide, so the card is never narrower than **287 px**.
- Title: rest mip LOD exactly 0; rendered after the composer; band ceiling `(navHeightPx + 16) / visibleH` with `navHeightPx` read from `header.nav` (fallback 66); width cap `0.8`.
- Records discipline: tick each `- [ ]` step in THIS file the moment its command lands, before the next step. Never tick a spec TODO on a hunch.
- Test commands: `npx vitest run` (unit), `npx tsc -p tsconfig.app.json --noEmit` (typecheck), `npm run lint`, `npx playwright test <spec>` (e2e; the webServer builds and serves on 4173, so allow ~2 min). Dev server for smokes is on `:5180` (`npx vite --port 5180`, already running; do not start a second one).

## Task order and why

1 (site-wide eyebrows) and 2 (pure helpers + scroll mapping) are independent and land first because everything later reads the new mapping. 3 (halo removal) is small and de-risks 4. 4 deletes the DOM chrome and `frontIndex` (the must-fix). 5 adds the shared text rasteriser and the captions. 6 adds pointer interaction on top of 5. 7 is the overture (needs 2 and the rasteriser from 5). 8 fixes the title. 9 updates records. 10 is the whole-tree verification and the PR rundown.

---

### Task 1: Section numbering and eyebrow lines go site-wide (Q14, Q16, Q17)

**Files:**
- `src/components/ui/SectionHeading.tsx` — modify: drop `index`/`label` props and the `.section-index` span; keep `title` and `description`.
- `src/components/sections/Archive.tsx`, `src/components/sections/WorkExperience.tsx`, `src/components/sections/Skills.tsx` — modify: stop passing `index`/`label` to `SectionHeading` (lines 146–147, 18–19, 23–24).
- `src/components/sections/Contact.tsx` — modify: delete the `.section-index` span at line 69 (and the `{index} · {label}` composition); keep `.contact-num` (line 100) untouched.
- `src/components/sections/Stats.tsx` — modify: delete the `.stats-eyebrow` span at line 100.
- `src/index.css` — modify: delete rules `.section-index` (669), `.section--contact .section-index` (922), `.stats-eyebrow` (1140), and the `.chapter-light .section-index` selector at 2141 (leave the other selectors in that rule).
- `src/i18n/locales/en.json`, `src/i18n/locales/pt.json` — modify: delete keys `stats.eyebrow`, `sections.archive.index`, `sections.archive.label`, `sections.work.index`, `sections.work.label`, `sections.skills.index`, `sections.skills.label`, `sections.contact.index`, `sections.contact.label`. Leave every `sections.projects.*` key for Task 4.
- `tests/unit/SectionHeading.test.tsx` — modify: replace the three index tests with: renders the title HTML; renders the description when given; renders no `.section-index` ever.
- `tests/e2e/light-chapter.spec.ts` — modify: delete the two assertions at lines 103 and 109 (`#archive .section-index`, `#stats .stats-eyebrow`); keep the rest of that test.

**Interfaces:**
- Produces: `SectionHeading({ title, description? })`.

**Work:** Pure removal. Do not restyle the `.section-header` block; the title becomes the first child and inherits the existing margin. Grep `section-index|stats-eyebrow|\.index'|\.label'` across `src/` and `tests/` after editing; the only survivors must be `sections.projects.*`, `contact-num`, Archive's toolbar `label=` props, `Tag label=`, and `projects.stack.indexLabel`.

**Acceptance check:** `npx vitest run tests/unit/SectionHeading.test.tsx` red before (old tests reference `index`), green after. `npx tsc -p tsconfig.app.json --noEmit` clean. `npx playwright test tests/e2e/light-chapter.spec.ts` green. Smoke on `:5180`: `#archive .section-index` and `#stats .stats-eyebrow` count 0; zero console errors.

**Boundaries:** Nothing in `Projects.tsx`, the scene, or `.scene-*` CSS. Do not touch `.contact-num`, the WorkRow index, or the Archive toolbar labels. If an i18n key is read somewhere the grep did not show, stop and report `blocked: <key> still read at <file:line>`.

- [ ] **Step 1: Rewrite `SectionHeading.tsx` and its unit test; run the unit test (green).**
- [ ] **Step 2: Remove the props at the four callers and the Stats/Contact spans; typecheck clean.**
- [ ] **Step 3: Delete the CSS rules and the 18 i18n keys (both locales); grep proves no survivors.**
- [ ] **Step 4: Update `light-chapter.spec.ts`; run it green; smoke on :5180; commit `feat(sections): no section numbering or eyebrow lines`.**

---

### Task 2: Pure helpers for round two, and the 550svh mapping (Q6, Q7, Q11, item 4 groundwork)

**Files:**
- `src/utils/sceneMotion.ts` — modify: the scroll mapping, the approach camera curve, the legibility rule in `sceneGeometry`, new overture and title-band and scroll-target helpers; remove `haloAlpha`.
- `tests/unit/sceneMotion.test.ts` — modify: update and add tests as below.
- `src/index.css` — modify: `.scene-scroll { height: 550svh }` (line 2219 block).
- `tests/e2e/scene-scrub.spec.ts`, `tests/e2e/scene-effects.spec.ts` (line 71), `tests/e2e/scene-reduced-motion.spec.ts` (lines 24, 58) — modify: fractions `0.15 → 0.3333`, `0.43 → 0.5556`, and the comment in `scene-scrub` that explains the mapping.
- `src/components/canvas/scene/SceneRig.tsx` — modify ONLY the `haloAlpha` default in the reduced-motion ambient object (line ~164) so it still compiles; the halo itself is Task 3.

**Interfaces (Produces, exact):**
```ts
export const OVERTURE_START = -1.5          // playhead where the scene begins
export const APPROACH_START = -0.5          // first frame the cards read in the distance
export const CORRIDOR_DEPTH = 2             // spacings the camera starts behind card 0
export function playheadFor(progress: number): number          // clamp(p*4.5 - 1.5, -1.5, 3)
export function easedSeg(seg: number): number                   // see Work
export interface OverturePose { alpha: number; visible: boolean }
export function overturePose(seg: number, reducedMotion: boolean): OverturePose
export function overtureDistance(g: SceneGeometry): number      // world z of the line, see Work
export function overtureWidth(g: SceneGeometry): number         // world width so it fills 0.7 of the visible width at seg = -1.5
export const CAPTION_NAME_PX = 26                               // in 620-px card units
export const CAPTION_MIN_NAME_PX = 12
export const CARD_MIN_PX = 287                                  // ceil(620 * 12 / 26)
export function titleBand(cardTopFrac: number, navPx: number, visibleH: number, clearance: number): { top: number; bottom: number }
export const TITLE_WIDTH_CAP = 0.8
export function scrollTargetFor(index: number, wrapperTop: number, wrapperHeight: number, viewportHeight: number): number
export interface AmbientOffset { y: number; yaw: number; pitch: number }   // haloAlpha removed
```

**Work:**
- `playheadFor`: `clamp(progress * 4.5 - 1.5, OVERTURE_START, 3)`.
- `easedSeg` for `seg < 0`: ONE ease over the whole approach so the camera never stops at `−0.5`: `a = (seg − OVERTURE_START) / (0 − OVERTURE_START)`; return `−CORRIDOR_DEPTH · (1 − smoothstep(a))`. Slope is zero at `−1.5` and at `0` and strictly positive between. (This supersedes the prior "50svh approach has zero slope at both ends"; the spec's "approach shape unchanged" is amended to "camera is one continuous ease across the approach"; the card-0 fog surfacing and the title blur still key on `seg ∈ [−0.5, 0)` in the rig and are unchanged.) `APPROACH_DEPTH` is deleted; grep its readers (the rig comment and tests) and update.
- `overturePose`: `visible = seg < APPROACH_START`; `alpha = 1` for `seg ≤ APPROACH_START − 0.15`, `1 − smoothstep((seg − (APPROACH_START − 0.15)) / 0.15)` between, `0` at and after `APPROACH_START`. Under reduced motion: `alpha = seg < APPROACH_START ? 1 : 0`. Pure and exactly reversible.
- `overtureDistance(g)`: the line stands where the camera is at `seg = APPROACH_START`, i.e. `easedSeg(APPROACH_START) · g.spacing` in the same z convention `cameraPose` uses (camera z = `eased · spacing` offset; check `cameraPose` and return the z the LINE should have so the camera reaches it exactly at `−0.5`). `overtureWidth(g)`: distance from the camera at `seg = −1.5` to the line is `(easedSeg(−0.5) − easedSeg(−1.5)) · g.spacing`; visible width there is `2 · d · tan(FOV/2) · aspect`; return `0.7 ·` that.
- `sceneGeometry`: after computing `fraction`, apply `fraction = max(fraction, CARD_MIN_PX / widthPx)` then `fraction = min(fraction, 0.92)`. This binds on landscape phones (e.g. 844×390 gives 0.32 → 0.34). `lateral` already derives from `fraction`; verify it keeps the card inside the frame at 844×390 (assert `lateral + CARD_W/2 ≤ CARD_W/(2·fraction)`).
- `titleBand`: `top = (navPx + 16) / visibleH`, `bottom = cardTopFrac − clearance`; both frame fractions from the top; the caller (Task 8) scales the title to fit `bottom − top`.
- `scrollTargetFor(index, wrapperTop, wrapperHeight, viewportHeight)`: the document `scrollY` at which `playheadFor` returns exactly `index`: `wrapperTop + ((index + 1.5) / 4.5) · (wrapperHeight − viewportHeight)`.
- `ambientOffset`: drop `haloAlpha` from the interface and the return.
- Tests (TDD, write first, watch red): `playheadFor` maps 0 → −1.5, 0.2222 → −0.5, 0.3333 → 0, 1 → 3; `easedSeg` is identity at 0..3, equals `−2` at `−1.5`, is non-decreasing, has |slope| < 0.02 at both ends and slope > 0.5 at `−0.75`; `overturePose` alpha 1 at −1.5 and −0.65, 0 at −0.5 and 0, monotonic between, reduced-motion step; `overtureWidth` ≈ 0.7 × visible width at −1.5 for 1440×900; `sceneGeometry` gives `fraction · widthPx ≥ 287` for widths 320, 390, 844, 1024, 1440 at both orientations and `lateral` keeps the card in frame; `titleBand` for `navPx = 66, visibleH = 900` returns `top ≈ 0.0911`; `scrollTargetFor` round-trips through `playheadFor`; halo tests at lines 450–473 deleted. Update the e2e fraction constants and comments.

**Acceptance check:** `npx vitest run tests/unit/sceneMotion.test.ts` red on the new tests before, green after. `npx tsc -p tsconfig.app.json --noEmit` clean. `npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/scene-effects.spec.ts` green with the new fractions (the DOM overlay still exists at this point, so those specs still pass as written).

**Boundaries:** No visual code except the two-line `SceneRig` compile fix and the CSS height. No Corridor, Environment, Projects changes. If `cameraPose`'s z convention makes `overtureDistance` ambiguous, stop and report `blocked: cameraPose z sign` with the two candidate formulas.

- [ ] **Step 1: Write the new/updated unit tests; run, confirm red.**
- [ ] **Step 2: Implement the mapping, `easedSeg`, `overturePose`, `overtureDistance`, `overtureWidth`, legibility rule, `titleBand`, `scrollTargetFor`; drop `haloAlpha`; unit tests green.**
- [ ] **Step 3: CSS 550svh; update the three e2e specs' fractions; run those three specs green; commit `feat(scene): 550svh mapping, overture and title-band helpers, caption legibility rule`.**

---

### Task 3: Remove the halo (Q2)

**Files:**
- `src/components/canvas/scene/Corridor.tsx` — modify: delete the halo mesh (lines 171–189), `halos`/`haloMaterials` refs, `haloTexture` and its dispose, the registration lines for halos.
- `src/components/canvas/scene/gradients.ts` — modify: delete `radialGradientTexture`; keep `roundedBlobTexture`.
- `src/components/canvas/scene/sceneRefs.ts` — modify: delete `halos`, `haloMaterials` from `SceneRefs` and `createSceneRefs`.
- `src/components/canvas/scene/SceneRig.tsx` — modify: delete the halo block in the card loop (lines ~176–180) and the reduced-motion `haloAlpha` field.
- `tests/e2e/scene-effects.spec.ts` — modify only if it asserts on halos (grep `halo`); otherwise untouched.

**Interfaces:** `SceneRefs` no longer has `halos`/`haloMaterials`; `gradients.ts` exports only `roundedBlobTexture`.

**Work:** Pure removal. Shadows, their tint and `SHADOW_ALPHA` are untouched. `grep -rn halo src tests` must return nothing afterwards.

**Acceptance check:** `npx tsc -p tsconfig.app.json --noEmit` clean; `npx vitest run` green; `grep -rn -i halo src tests` empty. Smoke on `:5180`: `window.__scene.halos === undefined`, and at the settled fraction a pixel sample 40 px outside the card's right edge is cream (`245,242,236` ± 3) at rest.

**Boundaries:** Nothing else in the rig. No shadow changes.

- [ ] **Step 1: Delete the halo from Corridor, gradients, sceneRefs, rig; typecheck and unit tests green.**
- [ ] **Step 2: grep empty; smoke on :5180 (cream outside the card); commit `feat(scene): no halo`.**

---

### Task 4: The DOM chrome and `frontIndex` go; the canvas reports its state imperatively (Q1, Q4, item 4)

**Files:**
- `src/components/sections/Projects.tsx` — modify: delete `frontIndex`/`setFrontIndex`, `useMotionValueEvent` import if unused, `overlayRef`/`pillRef`, `stageStyle`, `front`, the `.scene-eyebrow` block (117–121), the `.scene-meta` block (127–140), `--row-tint*`; memoise `featured`, `cards` (and therefore `covers`/`titles`) with `useMemo` keyed on `lang`; make `h2.scene-title-sr` render `t('sections.projects.heading')`; pass `cards` down (see Interfaces).
- `src/components/canvas/SelectedWorkScene.tsx` — modify: props become `{ cards: SceneCard[]; progress; reducedMotion; onReady; onWebglUnavailable }`; derive `covers`/`titles` inside with `useMemo` on `cards`; drop `overlayRef`/`pillRef` plumbing.
- `src/components/canvas/scene/SceneRig.tsx` — modify: props drop `overlayRef`/`pillRef`; delete the overlay projection block (lines ~199–233) and `cardRect`; add the `data-slot` writer.
- `src/components/canvas/scene/Corridor.tsx` — modify: registration effect deps become `[sceneRefs]` (covers are consumed by `useLoader`, which is keyed by URL, so identity no longer matters); write `data-registrations` on the canvas from that effect.
- `src/index.css` — modify: delete `.scene-eyebrow`, `.scene-eyebrow-num`, and every `.scene-meta*` rule (2251–2262, 2285–2342); delete `--row-tint` usage in `.scene-inner` if any.
- `src/i18n/locales/en.json`, `pt.json` — modify: delete `sections.projects.index`, `sections.projects.label`, `sections.projects.stack.viewProject`; add `sections.projects.heading` = `"selected work"` / `"trabalhos selecionados"`.
- `tests/e2e/scene-scrub.spec.ts` — modify: rewrite around `data-slot` (see Work); delete `clickPill`; the navigation test uses the first `.scene-skiplink` (focus it with keyboard, press Enter) until Task 6 adds the mesh click.
- `tests/e2e/nav-on-light.spec.ts` — modify: lines 79–81 navigate by focusing `#projects .scene-skiplink` first and pressing Enter; the rest is unchanged.
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: replace `.scene-meta*` assertions (39–54) with `data-slot` assertions (`"0"` at 0.3333, `"1"` at 0.5556, back to `"0"`).
- `tests/unit/sceneMotion.test.ts` — no change (`frontIndexFor` stays; the rig uses it for `data-slot`).

**Interfaces:**
- Consumes: `SceneCard` (already exported from `SelectedWorkScene.tsx`: `{ slug, title, subtitle, art, alt }`), `frontIndexFor`.
- Produces: `SelectedWorkSceneProps = { cards: SceneCard[]; progress: MotionValue<number>; reducedMotion: boolean; onReady: () => void; onWebglUnavailable: () => void }`. Data attributes on `gl.domElement`: `data-slot` ∈ `"0".."3"`, `data-registrations` = decimal count.

**Work:**
- The imperative writer, verbatim shape (in the rig's `useFrame`, after `frontCard` is computed):
  ```ts
  // Non-visual, test-only. Written when it CHANGES, never per frame.
  if (frontCard !== lastSlot.current) {
    lastSlot.current = frontCard
    state.gl.domElement.dataset.slot = String(frontCard)
  }
  ```
  `lastSlot` is a `useRef(-1)`. Corridor's registration effect increments a `useRef(0)` counter and writes `gl.domElement.dataset.registrations = String(count)` (get `gl` via `useThree`). Reduced motion: the same writer runs on the on-demand frames, so `data-slot` still updates on scroll.
- Language switch is the ONLY thing that may re-render the scene subtree; `cards` is memoised on `lang` so that is the only identity change. Add a comment in `Projects.tsx` saying so and pointing at ADR 0011.
- The scene keeps `aria-hidden` on the wrap; the skip-link `nav` is unchanged and is the a11y path; the `h2` is static.
- `scene-scrub.spec.ts` after the rewrite: (1) `data-slot` is `"0"` at 0.3333, `"1"` at 0.5556, `"0"` again on reverse; (2) `data-registrations` is `"1"` after scrolling through fractions `0, 0.2222, 0.3333, 0.4444, 0.5556, 0.6667, 0.7778, 0.8889, 1` and back to `0.3333` (this is the must-fix acceptance); (3) the context-loss test unchanged; (4) navigation via the skiplink lands on `/projects/<slug>`.
- Smoke script on `:5180` (in `node_modules/.smoke/`, per the handoff's note that the repo root makes Vite reload): scroll through the same fractions and assert `document.querySelector('[data-canvas="selected-work-scene"]').dataset.registrations === '1'`.

**Acceptance check:** `npx tsc -p tsconfig.app.json --noEmit` clean; `npx vitest run` green; `npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/scene-reduced-motion.spec.ts tests/e2e/nav-on-light.spec.ts` green; the `data-registrations === "1"` test is red if you temporarily restore `[sceneRefs, covers]` as the effect deps (prove it once, then restore). `grep -rn 'scene-meta\|scene-eyebrow\|frontIndex\b\|overlayRef\|pillRef\|viewProject' src tests` empty except `frontIndexFor`.

**Boundaries:** No caption, no pointer events, no title changes. Do not touch the skiplinks' markup or CSS. Do not add any new React state. If a spec relies on the SR heading changing per card, rewrite it to `data-slot`; do not restore per-card DOM text.

- [ ] **Step 1: Rewrite `scene-scrub.spec.ts` and `scene-reduced-motion.spec.ts` around `data-slot`/`data-registrations`; run, confirm red (attributes absent).**
- [ ] **Step 2: Projects.tsx: delete frontIndex/overlay/eyebrow/stageStyle, memoise `cards`, static h2, new props; SelectedWorkScene props; rig: delete overlay block, add the slot writer; Corridor: deps + registrations writer.**
- [ ] **Step 3: CSS and i18n deletions + `projects.heading`; typecheck, vitest green; grep empty.**
- [ ] **Step 4: `nav-on-light.spec.ts` skiplink navigation; run the three e2e specs green; prove the registrations test goes red with the old deps once; smoke on :5180; commit `fix(scene): the settled index leaves react state; no dom chrome (ADR 0011)`.**

---

### Task 5: The caption on the card (Q3, Q10, Q11)

**Files:**
- `src/components/canvas/scene/textTexture.ts` — create: the shared Jakarta rasteriser.
- `src/components/canvas/scene/Caption.tsx` — create: one caption per card (text plane + arrow plane) mounted inside the card group.
- `src/components/canvas/scene/Corridor.tsx` — modify: props become `{ cards: SceneCard[]; sceneRefs }`; mount `<Caption>` inside each card group; register `sceneRefs.captionMaterials[i]` (text + arrow materials) so the rig can drive opacity with the card.
- `src/components/canvas/scene/sceneRefs.ts` — modify: add `captionMaterials: THREE.MeshBasicMaterial[][]`, `arrows: (THREE.Mesh | null)[]`.
- `src/components/canvas/scene/SceneRig.tsx` — modify: include `captionMaterials[i]` in the per-card opacity write.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: pass `cards` to `Corridor`.
- `src/components/canvas/scene/cardAnatomy.ts` — modify: add `CAPTION_Z = 0.003`, `ARROW_W`, and the caption inset constants (12 px card units each side).
- `tests/unit/textTexture.test.ts` — create: pure sizing math tests (see Work).

**Interfaces:**
```ts
// textTexture.ts
export interface TextLine { text: string; fontPx: number; weight: number; color: string }
export interface DrawTextOptions { lines: TextLine[]; dpr: number; maxWidthPx: number; align: 'left' | 'center'; lineHeight?: number; padPx?: number }
export interface TextTexture { texture: THREE.CanvasTexture; widthPx: number; heightPx: number }
export function measureText(options: DrawTextOptions): { widthPx: number; heightPx: number }   // pure, no canvas needed beyond measureText; testable in jsdom with a stub
export function drawTextTexture(options: DrawTextOptions): TextTexture
export function captionScale(cardPx: number): number   // texture px per card unit so the name is CAPTION_NAME_PX * cardPx / 620 on screen
```
- Consumes: `SceneCard`, `BAND_TOP_Y`/`BAND_BOTTOM_Y`/`BAND_H`, `CARD_W`, `accentDeepLargeFor`, `CAPTION_NAME_PX` (Task 2).

**Work:**
- Rasteriser: waits for `document.fonts.load('600 26px "Plus Jakarta Sans"')` before the first draw (the page already loads the face; if `document.fonts` is absent, draw immediately). Canvas sized to `ceil(needW · dpr) × ceil(needH · dpr)`, DPR capped at 2, `generateMipmaps = true`, `minFilter = LinearMipmapLinearFilter`, `magFilter = LinearFilter`, `anisotropy = min(8, gl max)`, `SRGBColorSpace`, premultiplied alpha OFF and the material `transparent`, `depthWrite: false`, `fog: true` (the caption belongs to the card and fogs with it). Internal structure is yours.
- Caption composition (card units, 620-px card): name `26 px / 600 / #0B0E14`, subtitle `14 px / 500 / rgba(11,14,20,0.62)` 4 px under it, both left-aligned at `x = CARD_PAD`, vertically centred in the band; arrow `↗` `22 px / 600 / accentDeepLargeFor(i)` right-aligned at `x = CARD_W − CARD_PAD`, its OWN plane and material (Task 6 slides it). Long names ellipsise to one line at `maxWidthPx = band width − arrow width − gap`; never wrap.
- Sizing: the texture's px per card unit comes from the card's projected width at the slot: `cardPx = g.fraction · g.widthPx` (from `sceneGeometry`), so at rest the caption is not minified. Rebuild when `lang` changes or when `cardPx · dpr` changes by more than 25 % (resize bucket); dispose the old texture.
- Legibility: `captionScale` guarantees the name is `≥ CAPTION_MIN_NAME_PX` on screen given `CARD_MIN_PX` from Task 2; unit-test `measureText`/`captionScale` for widths 320..1440 with a stubbed `measureText` (jsdom has no canvas text metrics; stub `CanvasRenderingContext2D.prototype.measureText` to `{ width: text.length * fontPx * 0.55 }`).
- The rig writes caption opacity = card opacity every frame (same loop as `cardMaterials`).
- Fallback list (`.scene-fallback`) is unchanged; it already shows name/subtitle/link.

**Acceptance check:** `npx vitest run tests/unit/textTexture.test.ts` red before, green after. Typecheck and lint clean. Smoke on `:5180` at 1440×900 and 844×390: `window.__scene.captionMaterials[0].length === 2`; a screenshot of the settled card shows the name/subtitle/arrow in the band; in the 844×390 shot the name's cap height measures ≥ 9 px (≈ 12 px em). Switch language (the nav toggle) and the caption text changes without `data-registrations` exceeding `"2"`. `npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/perf-budget.spec.ts` green.

**Boundaries:** No pointer events, no hover. No changes to the title or to `titleTexture.ts` (Task 8 refactors it onto this rasteriser only if trivial; otherwise they stay separate). No DOM text.

- [ ] **Step 1: Write `textTexture.test.ts` (measure + captionScale); run red.**
- [ ] **Step 2: Implement `textTexture.ts`; unit tests green.**
- [ ] **Step 3: `Caption.tsx`, cardAnatomy constants, sceneRefs fields, Corridor mount + registration, rig opacity; typecheck/lint clean.**
- [ ] **Step 4: Smoke on :5180 at both viewports (screenshots to the scratchpad; report cap-height measurement); language switch check; e2e scrub + perf green; commit `feat(scene): caption on the card`.**

---

### Task 6: The card is pressable (Q5)

**Files:**
- `src/components/canvas/scene/Corridor.tsx` — modify: `onPointerOver`/`onPointerOut`/`onClick` on each card group; write `sceneRefs.hover` and call `onCardClick(i)`.
- `src/components/canvas/scene/sceneRefs.ts` — modify: add `hover: { index: number; amount: number }` (index −1 when none; `amount` is the lerped 0..1 lift).
- `src/components/canvas/scene/SceneRig.tsx` — modify: lift and arrow slide in the card loop.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: new prop `onCardClick: (index: number) => void`; pass through to `Corridor`; set `cursor: pointer` on `gl.domElement` while `hover.index >= 0` (a `useFrame`-free approach: toggle in the pointer handlers).
- `src/components/sections/Projects.tsx` — modify: implement `handleCardClick(index)` with `useNavigate` and `scrollTargetFor`.
- `src/utils/sceneMotion.ts` — modify: add `export const HOVER_LIFT = 0.03 * CARD_W`, `HOVER_SCALE = 1.02`, `HOVER_TAU = 0.2`, `ARROW_SLIDE_PX = 2`.
- `tests/e2e/scene-scrub.spec.ts` — modify: the navigation test clicks the canvas at the settled card's projected centre; add a test that clicking the distant card 1 changes `data-slot` to `"1"`.

**Interfaces:**
- Consumes: `frontIndexFor`, `scrollTargetFor`, `sceneGeometry`, `frameRects`, `projectPoint`, `cardPose` (all exported from `sceneMotion.ts`; Playwright imports them from `../../src/utils/sceneMotion` — the module is pure).
- Produces: `SelectedWorkSceneProps.onCardClick(index: number): void`.

**Work:**
- Click semantics live in `Projects.tsx` (the Router root): if `index === frontIndexFor(playheadFor(scrollYProgress.get()), 4, reducedMotion)` → `navigate('/projects/' + cards[index].slug)`; else `window.scrollTo({ top: scrollTargetFor(index, wrapperTop, wrapperRef.current.offsetHeight, window.innerHeight), behavior: reducedMotion ? 'instant' : 'smooth' })` where `wrapperTop = wrapperRef.current.getBoundingClientRect().top + window.scrollY`.
- A scroll gesture must never count as a tap. R3F reports `event.delta` (px moved between down and up) on click events; ignore the click when `event.delta > 6`. If your R3F version does not populate `delta`, implement the same threshold from `onPointerDown`/`onPointerUp` coordinates; state which in the commit body.
- Hover: any hit card sets `hover.index = i` and `cursor: pointer`; leaving sets `−1` and `cursor: ''`. The rig lerps `hover.amount` toward `(hover.index === frontCard && settledNow > 0.5) ? 1 : 0` with `HOVER_TAU`, then for the front card adds `amount · HOVER_LIFT` along the camera's forward axis (toward the camera) and scales the group `1 + amount · (HOVER_SCALE − 1)`; the arrow mesh gets `x += amount · ARROW_SLIDE_PX · worldPerPx`, `y += amount · ARROW_SLIDE_PX · worldPerPx` (up-right, like `.workrow-arrow`). Reduced motion: `amount = 0` always (no lift), cursor and click still work.
- Touch: R3F's pointer events already fire on touch; tap = click via the same path.
- The existing window-level tilt listener stays.
- E2E: compute the settled card's centre from `frameRects(sceneGeometry(vw, vh)).card` (frame fractions → px), `page.mouse.click(x, y)`; assert URL. Distant card: `projectPoint` of `cardPose(1, 0, g)` → click → wait until `data-slot === "1"` (smooth scroll; allow 1.5 s).

**Acceptance check:** `npx playwright test tests/e2e/scene-scrub.spec.ts` green including both new click tests; both are red before this task (clicks on the canvas do nothing). Typecheck/lint clean; `npx vitest run` green. Smoke on `:5180`: hover over the settled card sets `document.querySelector('[data-canvas="selected-work-scene"]').style.cursor === 'pointer'` and `window.__scene.hover.amount > 0.9` after 0.5 s.

**Boundaries:** No router imports inside `src/components/canvas/**`. No new React state in the scene. Do not touch the title.

- [ ] **Step 1: Add the two click e2e tests; run red.**
- [ ] **Step 2: sceneRefs.hover, Corridor pointer handlers with the delta threshold, cursor toggling, `onCardClick` plumbing, `handleCardClick` in Projects.**
- [ ] **Step 3: Rig lift/scale/arrow slide with reduced-motion off; typecheck/lint/vitest green.**
- [ ] **Step 4: e2e green; smoke on :5180 (cursor + hover amount); commit `feat(scene): the card is pressable`.**

---

### Task 7: The overture (Q7, Q12, Q13, Q9)

**Files:**
- `src/components/canvas/scene/Overture.tsx` — create: the line's plane, built with `drawTextTexture` (Task 5), registered as `sceneRefs.overture`/`overtureMaterial`.
- `src/components/canvas/scene/sceneRefs.ts` — modify: add `overture: THREE.Mesh | null`, `overtureMaterial: THREE.MeshBasicMaterial | null`.
- `src/components/canvas/SelectedWorkScene.tsx` — modify: prop `overture: string` (the localised line); mount `<Overture>`.
- `src/components/sections/Projects.tsx` — modify: pass `t('sections.projects.overture')`.
- `src/components/canvas/scene/SceneRig.tsx` — modify: per-frame overture pose/alpha and the `data-overture` writer; under reduced motion, hide the title while the overture is visible.
- `src/i18n/locales/en.json`, `pt.json` — modify: add `sections.projects.overture` = `"a few things i've built"` / `"algumas coisas que construí"`.
- `tests/e2e/scene-scrub.spec.ts` — modify: add an overture test on `data-overture`.
- `tests/e2e/scene-reduced-motion.spec.ts` — modify: `data-overture` is `"true"` at fraction 0 and `"false"` at 0.3333.

**Interfaces:**
- Consumes: `overturePose`, `overtureDistance`, `overtureWidth`, `ambientOffset`, `velocityYaw` (Task 2), `drawTextTexture` (Task 5).
- Produces: `data-overture` ∈ `"true" | "false"` on `gl.domElement`.

**Work:**
- Plane: Jakarta `weight 650`, ink, single line, centred, `fog: false`, `depthWrite: false`, `transparent`; NOT rendered through the composer (Task 8 introduces the post pass and the layer; until then it renders in the main scene — acceptable for one commit). World width `overtureWidth(g)`; texture drawn at the on-screen px it will have at `seg = −1.5` (`0.7 · g.widthPx · dpr`, dpr ≤ 2). Position: `x = 0`, `y = g.camY` (eye height, so it is centred vertically in the frame), `z = overtureDistance(g)`; faces the camera (rotation `x = CAM_PITCH`). Rebuilt on `lang` and on resize.
- Per frame (not reduced motion): `pose = overturePose(seg, false)`; `mesh.visible = pose.visible`; `material.opacity = pose.alpha`; breath: `amb = ambientOffset(CARD_COUNT, t, energy)` (a fifth phase, so it does not move in step with card 0) → `y += amb.y`, `rotation.y = amb.yaw + leanYaw`, `rotation.x = CAM_PITCH + amb.pitch`.
- Reduced motion: `pose = overturePose(seg, true)`; when visible, place the line camera-relative at `g.titleDistance` in front of the camera, centred (the camera sits at slot 0 in reduced motion, so the corridor position would be behind it), and set `sceneRefs.title.visible = false`; otherwise hide the line and let the title show.
- `data-overture` writer: same "write when it changes" shape as `data-slot`.

**Acceptance check:** `npx playwright test tests/e2e/scene-scrub.spec.ts tests/e2e/scene-reduced-motion.spec.ts` green; the new assertions are red before. Smoke on `:5180`: at fraction 0 a screenshot shows the line centred and crisp; at 0.2 it is larger and fading; at 0.2222 `data-overture === "false"` and the cards read in the distance; scrolling back to 0 restores it. Zero console errors. `perf-budget.spec.ts` still green.

**Boundaries:** Do not change the approach camera (Task 2 owns it). No DOM text. No GSAP.

- [ ] **Step 1: i18n keys; e2e overture assertions; run red.**
- [ ] **Step 2: `Overture.tsx`, sceneRefs, scene mount, rig pose/alpha/breath/reduced-motion and the writer.**
- [ ] **Step 3: Typecheck/lint/vitest; e2e green; smoke screenshots at 0, 0.2, 0.2222 to the scratchpad; commit `feat(scene): the overture`.**

---

### Task 8: The title is crisp, capped below the nav, and outside the composer (Q6, Q8)

**Files:**
- `src/components/canvas/scene/titleTexture.ts` — modify: size the texture from the DISPLAYED em (`titleCapPx · min(dpr, 2)`) and the width cap, not from a fixed 300 px.
- `src/components/canvas/scene/SceneTitle.tsx` — modify: accept `capPx`/`maxLinePx` from the rig's geometry; put the title mesh on layer 1; rebuild textures on resize buckets.
- `src/components/canvas/scene/SceneRig.tsx` — modify: nav-aware band via `titleBand`, `TITLE_WIDTH_CAP`; assert rest `uLod === 0`; expose `sceneRefs.navPx` refresh on resize.
- `src/components/canvas/scene/Environment.tsx` — modify: the post-composer title pass (verbatim shape below); the overture mesh joins layer 1 too.
- `src/components/canvas/scene/Overture.tsx` — modify: `layers.set(1)`.
- `tests/unit/sceneMotion.test.ts` — no change (`titleBand` tested in Task 2).
- `tests/e2e/scene-effects.spec.ts` — modify: add an assertion that the title still renders with the composer mounted (a pixel sample in the title band is ink-ish `< 60` luminance at the settled fraction).

**Interfaces:**
- Consumes: `titleBand`, `TITLE_WIDTH_CAP` (Task 2); `DrawTitleOptions.fontPx` becomes the displayed em.
- Produces: `sceneRefs.navPx: { value: number }`.

**Work:**
- Texture size: `fontPx = round(g.titleCapPx · min(dpr, 2))` (this is the em the retired CSS rule used, so on-screen size is unchanged), `maxLinePx = TITLE_WIDTH_CAP · g.widthPx · min(dpr, 2)`; keep the 2048 ceiling as a guard and log once in DEV if it binds. Rest: `texPxPerCssPx === 1` ⇒ `baseLod === 0`; keep the morph's `blurLod` path.
- Band: `{ top, bottom } = titleBand(cardTopFrac, sceneRefs.navPx.value, visibleH, TITLE_CLEARANCE)`; `available = bottom − top`; scale down when `tallestFrac > available`; the bottom anchor is unchanged. `navPx` is read on resize from `document.querySelector('header.nav')?.getBoundingClientRect().height ?? 66` in `SelectedWorkScene` (DOM access belongs outside the loop).
- **Post-composer pass, verbatim shape** (in `Environment.tsx`, only when `desktopEffects`; without the composer the title renders in the main pass on layer 1 with `camera.layers.enable(1)` and nothing else changes):
  ```tsx
  // Before the composer (priority 0): hide layer 1 so DoF/grain never see the title.
  useFrame(({ camera }) => { camera.layers.disable(1) }, 0)
  // After the composer (priority 2): depth-only occluders, then the title, on the screen buffer.
  useFrame(({ gl, scene, camera }) => {
    gl.autoClear = false
    gl.clearDepth()
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.layers.isEnabled(1)) { const m = (o as THREE.Mesh).material as THREE.Material; m.colorWrite = false } })
    camera.layers.enableAll()
    gl.render(scene, camera)
    scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { const m = (o as THREE.Mesh).material as THREE.Material; m.colorWrite = true } })
    camera.layers.set(0)
  }, 2)
  ```
  Keep the traversal allocation-free (cache the mesh list once per registration; do not `traverse` per frame in the final version). Depth stays honest: a card passing the lens still occludes the title. `EffectComposer`'s own `renderPriority` is 1 by default; confirm in the installed version and set it explicitly.
- Software-GPU / phones: no composer, no post pass; the title stays on layer 1 and the main camera has layer 1 enabled.

**Acceptance check:** Smoke on `:5180` at 1440×900 (hardware GPU, Kevin's machine or a `--use-gl=angle` Chromium): `window.__scene.titleMaterial.uniforms.uLod.value === 0` at the settled fraction; a crop of the title from a screenshot has edge sharpness at least 2× the pre-task crop (compare Laplacian variance, script in the scratchpad); the PT title `painel da reconstrução` at 1024×768 has its top ink ≥ `navPx + 16` from the top of the frame. `npx playwright test tests/e2e/scene-effects.spec.ts tests/e2e/perf-budget.spec.ts tests/e2e/scene-scrub.spec.ts` green. Typecheck/lint/vitest green.

**Boundaries:** No change to the morph shader. Do not raise the perf budget; if the occluder pass pushes `perf-budget` over 300 ms on the local rig, stop and report `blocked: post pass cost <ms>` with the measurement rather than trimming the budget.

- [ ] **Step 1: Texture sizing from the displayed em; rest LOD 0 verified via `__scene` on :5180.**
- [ ] **Step 2: `navPx` plumbing, `titleBand`, width cap 0.8; PT two-line title verified clear of the nav at 1024×768 and 1440×900 (screenshots to the scratchpad).**
- [ ] **Step 3: Layer 1 + post-composer pass; `scene-effects` assertion; perf-budget green; Laplacian comparison recorded.**
- [ ] **Step 4: Typecheck/lint/vitest/e2e green; commit `fix(scene): the title is crisp, below the nav, outside the composer`.**

---

### Task 9: Records (spec "Records to update")

**Files:**
- `CLAUDE.md` — modify: the **Selected Work scene** bullet (anatomy: no eyebrow/meta; caption; `data-slot`/`data-overture`/`data-registrations` on the real canvas; playhead `p·4.5 − 1.5 ∈ [−1.5, 3]`; the 150svh approach with the overture; no halo; pointer events; the title on layer 1 after the composer), the **Canvases** bullet (title outside the composer), the **Nav**/section wording that mentions `.section-index` or `01 ·`, the **NO** list (+ "a section eyebrow or number anywhere", "a DOM element that tracks the settled card", "a halo or glow around a card", "router or DOM access inside `src/components/canvas/**`"), the Contact/Footer table (strike the `.section-index (contact)` row) and the Plan B table (strike `.section-index`, `.stats-eyebrow` mentions in rows 4; add a row: caption name ink on white 17.4:1 ✅, subtitle ink-muted on white ≈ 5.7:1 ✅, arrow decorative).
- `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md` — modify: a `**Superseded in part by:**` header line pointing at the round-two spec; tick its last TODO box with the note "answered by round two".
- `docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md` — modify: amend Q7/"Approach" wording to "the camera is one continuous ease across the 150svh approach" (Task 2's deviation), and nothing else without Kevin.
- `README.md` — modify only if it mentions the overlay or the eyebrow (grep `overlay|eyebrow|01 ·`).
- `HANDOFF.md` — delete (the trail is consumed; PR #7 is the record).

**Work:** Every sentence changed must describe the tree as it is after Task 8; cite file paths that exist. Contrast numbers: ink `#0B0E14` on white `#FFFFFF` = 17.4:1; `rgba(11,14,20,.62)` composited on white ≈ `#5F6165` → ≈ 5.7:1 (compute and state the exact figure).

**Acceptance check:** `grep -n 'scene-meta\|scene-eyebrow\|halo\|frontIndex\|section-index\|stats-eyebrow\|450svh\|3\.5 − 0\.5\|APPROACH_DEPTH' CLAUDE.md README.md CONTEXT.md docs/adr/*.md` returns only historical mentions inside ADR 0011's context paragraph and the 2026-09-03 spec/plan (which are records, untouched beyond the header line).

**Boundaries:** No code. Do not tick any round-two spec TODO here; that happens after Kevin's GREEN (Task 10).

- [ ] **Step 1: CLAUDE.md bullets, NO list, both contrast tables.**
- [ ] **Step 2: Spec headers/amendments, README grep, delete HANDOFF.md; grep check; commit `docs(scene): round-two records`.**

---

### Task 10: Whole-tree verification, PR #7 update, manual-pass rundown

**Files:** none new. `docs/superpowers/plans/2026-09-04-selected-work-scene-round-two.md` (this file) gets its boxes ticked; the PR body is edited with `gh pr edit 7`.

**Work:**
1. Run, in this order, and paste the summary lines into the PR comment: `npx tsc -p tsconfig.app.json --noEmit`; `npm run lint` (0 errors; the 4 pre-existing warnings are known); `npx vitest run`; `npx playwright test` (full suite; `perf-budget` may retry twice under contention, that is configured).
2. Headless smoke on `:5180`: loads, `#projects canvas[data-warm="true"]` appears, zero console errors across a full scrub (fractions 0 → 1 → 0.3333).
3. `gh pr edit 7 --body` with: the round-two summary (one paragraph), what changed per task (one line each), what was verified by machine (the outputs), and the **manual pass for Kevin**, verbatim:
   - Load `/` on the desktop at 1440×900. Scroll into Selected Work slowly. Expect: the line `a few things i've built` stands centred in cream, breathing; it grows as you scroll and passes the camera; the cards appear in the distance exactly as it is gone; no `01 · selected work` anywhere.
   - Keep scrolling through all four cards. Expect: no card, shadow or frame blinks at any point; the title is crisp at every rest; the title never touches the nav (check PT `painel da reconstrução` by toggling to PT).
   - Hover the settled card. Expect: pointer cursor, the card lifts slightly toward you, the arrow nudges up-right; the name, `year · tech · tech` and the arrow are on the card itself. Click it: the project page opens.
   - Scroll back so card 1 is distant; click it. Expect: the page scrolls smoothly until card 1 is settled.
   - No coloured glow around any card. Shadows under cards are faintly tinted.
   - Toggle PT: captions and the overture line switch language.
   - Phone (or DevTools 390×844 and 844×390): captions legible (name ≥ 12 px), tap the settled card opens the project, tap a distant card scrolls to it.
   - Reduced motion on: the overture is a still frame at the top, gone once the cards show; no lift, no breath; captions present.
   - Elsewhere: no `02 ·`, `03 ·`, `04 ·`, `05 ·` or `selected metrics` lines above Archive, Work, Skills, Stats, Contact. Contact rows still show `01`–`04`.
4. Stop. The three-leg review is Kevin's to trigger after his GREEN.

**Acceptance check:** All four commands green in the same turn, outputs quoted in the PR comment; every step box in Tasks 1–9 ticked; `git status` clean except `perf/`.

**Boundaries:** Do not merge. Do not run the review. Do not tick spec TODOs until Kevin says GREEN.

- [ ] **Step 1: Typecheck, lint, vitest, full Playwright; record outputs.**
- [ ] **Step 2: Headless smoke on :5180; record.**
- [ ] **Step 3: `gh pr edit 7` with the rundown; push; report to Kevin and stop.**
