# Selected work scene, round two: the card is the object — design spec

**Date:** 2026-09-04
**Branch:** `feat/selected-work-scene` (PR #7 → `staging` stays open and absorbs this round; the
three-leg review runs once, at the end, on the final PR; `main` is frozen)
**Follows:** `2026-09-03-selected-work-scene-design.md` (the scene shipped; Kevin's review of it on
the running app is the input here). Its geometry contract, corridor, camera, morph and breath stay
in force except where a line below says otherwise.
**Supersedes, in part:** the 2026-09-03 spec's Q5 (halo half), Q6, Q7 (touch half), Q15, Q17; the
CLAUDE.md sentences that describe the halo, the DOM overlay and the eyebrow as current.

## Intent

Kevin's review, verbatim, is in `HANDOFF.md` and reduces to one sentence: **the card should be the
whole object.** Its name, meta and link live on it, in the scene, not on a DOM plane recomputed over
it; nothing glows around it; the pointer can press it; nothing in the section wears a label. Around
that: a must-fix flicker, a title that goes soft and climbs under the nav, and a new opening beat
where a line in Kevin's voice introduces the corridor.

Emotional target unchanged: confident, controlled, premium. Awake, not restless.

## Decisions (grilling, Kevin 2026-09-04)

| # | decision |
|---|---|
| Q1 | The scene loses all DOM chrome: the eyebrow `01 · selected work` and the `view` pill go. Site-wide pills (Archive chips, tags, fallback links) are untouched. |
| Q2 | The halo is removed entirely. The blob shadow keeps its deep-accent tint as the scene's one whisper of tricolor; the caption's arrow carries the deep row tint. No glow of any kind. |
| Q3 | **Caption card.** Name, `year · tech · tech` and an arrow are drawn on the card's existing body band, in the scene, one texture per card, rasterised with Jakarta on a 2D canvas at the band's on-screen size, rebuilt on language switch. The card is one object: it tilts, bobs, lifts and blurs as a unit. |
| Q4 | The accessible path is the existing visually-hidden-until-focused skip-link `nav` (four `<Link>`s to `/projects/:slug`), always present. No DOM element tracks the settled card; the SR `h2` becomes static. |
| Q5 | Hover on the settled card: pointer cursor, a small lift toward the camera on top of the ≤ 6° tilt, the arrow slides. Any hit card shows the pointer cursor; only the settled card lifts. Click on the settled card navigates; click on any other card scrolls the page so that card comes to the slot. Tap = click. The tilt stays fine-pointer only. |
| Q6 | The title band gets a **nav-aware ceiling** (below the fixed nav plus a margin) and keeps its card-top floor; a title that does not fit scales down until it does. Width cap tightened from 90 % to 80 % of the visible width. |
| Q7 | **Overture.** A Jakarta line in Kevin's voice stands in the corridor ahead of the camera during a new 100svh beat before the existing approach; the camera dollies toward it and passes through it, and it is gone the moment the cards first show in the distance. Wrapper 450svh → 550svh. |
| Q8 | The title's softness is the texture being minified ~1.6× at rest (rest mip LOD ≈ 0.7) plus the desktop depth-of-field pass; not the halo. Fix: rasterise the title at its displayed size so rest LOD is exactly 0, and render the title **outside the composer** (no grain, no DoF), matching "the one object the fog never touches". |
| Q9 | Reduced motion: the overture line shows as a static frame at the start and is swapped out instantly at the first settle. Caption and skiplinks are static anyway. |
| Q10 | Caption composition: name (ink, Jakarta ~600) top-left, subtitle (ink-muted) under it, a bare `↗` on the right in the deep row tint. No "view" word. |
| Q11 | Phone legibility. Hard rule: **the caption name never renders under 12 px on screen** on any viewport ≥ 320 px wide, so the card is never narrower than 287 px; the card fraction derives from that rule. (Correction after grilling: portrait phones already get 88 vw cards from `sceneGeometry`; the rule binds on landscape phones, e.g. 844×390 where the fraction rises from 0.32 to 0.34, and on 320 px portrait, 0.88 → 0.897.) |
| Q12 | Overture copy: `a few things i've built` / `algumas coisas que construí`. |
| Q13 | Overture line: monumental (≈ 70 % of the visible width at its rest distance), horizontally centred and standing on the camera's eye line (the upper third of the frame under the −8° pitch, where the title later stands; the only placement that is a true pass-through), upright, facing the camera; it carries the ambient breath (bob + velocity lean) like the cards. Off under reduced motion. |
| Q14 | **Section numbering goes site-wide.** No `01 ·`…`05 ·` anywhere. |
| Q15 | ADR 0011 records the caption decision and `frontIndex` leaving React state. |
| Q16 | The whole eyebrow line goes from every section (Archive, Work Experience, Skills, Contact, and Stats' unnumbered `selected metrics`). The section title is the only heading. `SectionHeading` loses `index`/`label`. |
| Q17 | Contact's `01`–`04` row ordinals stay: list ordinals, decorative, `aria-hidden`, same job as the WorkRow index. |

## What changes, by surface

### The card (Q3, Q10, Q11, Q5)

- Geometry unchanged: `CARD_W`/`CARD_H`/`CARD_RADIUS`, cover plane, and the body band (`BAND_TOP_Y`/`BAND_BOTTOM_Y` in `cardAnatomy.ts`) already exist; the caption paints into the band.
- **Caption texture**: one transparent 2D-canvas texture per card, sized to the band's projected pixel size at the slot × DPR (DPR ≤ 2), so it is not minified at rest. Jakarta from the same `FontFace` the page loads (wait for `document.fonts`). Sizes in card units (620 px card): name 26 px / 600, subtitle 14 px / 500, arrow 22 px. Colours: name `--color-ink-on-light`, subtitle `--color-ink-on-light-muted`, arrow `accentDeepLargeFor(i)` (white card face; all ≥ 5:1, decorative arrow exempt). Rebuilt on `lang` change and on resize when the projected band size crosses a DPR bucket.
- **Arrow is its own small plane** in the band (not baked into the text texture) so hover can slide it without re-rasterising.
- **Phone framing**: the framing function gains the legibility rule. Name on-screen px = `26 · cardPx / 620 ≥ 12` ⇒ `cardPx ≥ 287`, so on every viewport the card fraction becomes `max(current, 287 / width)` capped at `0.92`; the lateral offset already derives from the fraction and must keep alternating cards inside the frame.
- **Pointer**: R3F pointer events on the card group (`onPointerOver`/`Out`/`Click`), cursor `pointer` on any hit card. Settled card: lift (toward the camera by ≈ 3 % of card width, scale ≈ 1.02, 0.2 s lerp, additive to tilt and breath), arrow slides ≈ 2 px on screen. Non-settled cards: cursor only.
- **Click**: settled card → `navigate('/projects/:slug')`. Any other card → smooth scroll to that card's integer playhead (instant under reduced motion). A touch scroll gesture must not count as a tap (down/up distance threshold).
- **DOM**: `.scene-meta*` markup, its per-frame projection block in `SceneRig`, `.scene-eyebrow*`, `--row-tint`/`--row-tint-deep` on `.scene-inner`, `stageStyle`, and the `projects.index` / `projects.label` keys are deleted. `h2.scene-title-sr` becomes the static section name. The skip-link `nav` is unchanged and is the a11y contract.

### No scroll-driven React state (Q4, item 4)

- `frontIndex` is deleted. Nothing in `Projects` or the canvas subtree re-renders on scroll. `featured`/`cards`/`covers`/`titles` are memoised on `lang` so a language switch is the only re-render, and the Corridor registration effect runs once per mount and once per language.
- The frame loop writes two **imperative, non-visual** attributes on the real canvas element (`gl.domElement`, where `data-paused`/`data-warm` already live) when they change (not per frame): `data-slot="0|1|2|3"` at settle midpoints and `data-overture="true|false"`. They exist for tests and for nothing else; no React reads them.
- Corridor also writes `data-registrations="<n>"` on the canvas from its registration effect. The must-fix bug's acceptance test asserts it stays `1` across a full scrub.

### The halo (Q2)

Halo mesh, `radialGradientTexture`, `sceneRefs.halos`/`haloMaterials`, the per-frame halo alpha, `ambientOffset().haloAlpha` and its unit tests are removed. Shadows unchanged.

### The title (Q6, Q8)

- Texture rasterised at displayed size: em px = `titleCapPx · min(dpr, 2)`, wrap width from the 80 % cap, 2048 px canvas cap kept as a ceiling that should no longer bind on ≤ 1440 px at DPR 1.5. Rest `uLod` is exactly 0; the morph blur still rides the LOD.
- Rendered after and outside the `EffectComposer` (its own render pass, no clear), so grain and depth of field never touch it; it keeps depth test against the cards.
- Band ceiling: `top ≥ (navHeight + 16 px) / visibleH`, with `navHeight` read from the `.nav` element on resize (fallback 66 px). Floor unchanged (card top − clearance). A title taller than the band scales down. Width cap 0.8.

### The overture (Q7, Q12, Q13, Q9)

- `.scene-scroll` 450svh → **550svh**; `playheadFor(p) = clamp(p · 4.5 − 1.5, −1.5, 3)`. The overture is `seg ∈ [−1.5, −0.5)`; the title resolve still keys on `[−0.5, 0)`; cards `[0, 3]` unchanged. The camera is **one continuous ease across the whole 150svh approach**, zero slope only at the ends, so it never stops at −0.5. Its start depth is DERIVED, not tuned: at `−0.5` the camera is exactly one spacing behind card 0, the frame the shipped scene showed at the top of its approach and the one Kevin pointed at as "the cards in the distance"; that puts the camera ≈ 3.86 spacings back at `−1.5`, beyond the fog's far edge, so card 0 is invisible behind the line at the top and begins to read near `−0.8` while the line fades.
- The line is a Jakarta text plane (same rasteriser as the caption, one texture, bilingual) standing in the corridor at the point the camera reaches at `seg = −0.5`, facing the camera, ink, **fog-free and composer-free** like the title. At `seg = −1.5` it fills ≈ 70 % of the visible width, centred.
- Camera: monotonic, one ease, strictly moving at `seg = −0.5` (no stop-and-restart between the overture and the approach).
- Exit: pass-through. The line grows as the camera nears (it fills the frame near `−1.07` and overflows it after); its alpha fades over the last `0.35` of the overture so the overflow reads as a fly-past rather than a pop, and it is fully gone at `seg = −0.5`, the frame where card 0 stands one spacing away in the fog. Reversing scroll brings it back exactly.
- Breath: bob + velocity lean at the cards' amplitudes; none under reduced motion, where the line is a static frame for `seg < −0.5` and absent after.

### Eyebrows, site-wide (Q14, Q16, Q17)

- `SectionHeading` drops `index` and `label` and the `.section-index` element. Callers in Archive, WorkExperience, Skills and Contact stop passing them; Contact's composed `{index} · {label}` span goes; Stats' `.stats-eyebrow` goes.
- CSS removed: `.section-index` (+ `.section--contact .section-index`, `.chapter-light .section-index`), `.stats-eyebrow`, `.scene-eyebrow*`, `.scene-meta*`.
- i18n keys removed in `en` and `pt`: `projects.index`, `projects.label`, `archive.index`, `work.index`, `skills.index`, `contact.index`, `contact.label`, `stats.eyebrow`. `projects.stack.indexLabel` stays (it names the skiplinks). New keys: `projects.overture`, `projects.heading` (the static SR heading).
- `.contact-num` stays. `projects.stack.viewProject` stays too: the WebGL fallback list still renders it.
- CLAUDE.md contrast tables: the `.section-index` and `.stats-eyebrow` rows are struck (not recomputed). A new row for the caption on the white card face is added.

## Lanes

Unchanged: the R3F frame loop reads Framer MotionValues and writes three objects; Framer never animates a three object; GSAP stays entrance-only. R3F pointer events are the sanctioned way the pointer reaches a card; the existing window-level tilt listener may fold into them or stay, plan's call.

## Accessibility

- Keyboard and screen readers: the skip-link `nav` (four links, visible on focus) and the static `h2`. The canvas stays `aria-hidden`. Nothing in the DOM tracks scroll.
- Pointer users: the card is the control; `cursor: pointer` is the affordance on any hit card, the lift confirms it on the settled one.
- Contrast: caption name ink on white ≥ 15:1; subtitle ink-muted on white ≥ 5.5:1; arrow decorative. Overture and title: ink on cream ≥ 15:1 at rest.
- Reduced motion: Q9; plus no lift, no tilt, instant scroll on non-settled click.

## Tests

- **Unit** (`tests/unit/sceneMotion.test.ts` and new files): playhead range `[−1.5, 3]` and the overture/approach/card segmentation; camera monotonic and C¹ at `−0.5`; overture alpha 1 through `−0.65`, 0 at `−0.5`, reversible; title ceiling below a given nav height and the scale-down; width cap 0.8; caption legibility rule (`cardPx ≥ 286` on every viewport width ≥ 320); halo tests deleted; non-settled click → scroll target for each playhead.
- **E2E**: `scene-scrub.spec.ts` rewritten around `data-slot` and mesh clicks (click at the settled card's projected centre navigates; a click at a distant card's centre changes `data-slot` after scroll settles); `data-registrations === 1` across a full scrub (the must-fix acceptance); `data-overture` true at the top, false once the approach starts, true again on reverse; `nav-on-light.spec.ts` navigates through a skiplink instead of the pill; `scene-reduced-motion.spec.ts` gains the static overture frame; no spec references `.scene-meta*`, `.scene-eyebrow*` or `.section-index`.
- **Smoke** per slice (loads, root renders, zero console errors). Real-hardware checks (title crispness at rest, no blank frame at any midpoint, hover lift, phone caption size) are Kevin's manual pass, listed in the plan.

## Out of scope

Cover art replacement (Kevin's, later), a light theme, the hero, `perf/`, the site-wide pill language, any change to the Archive/Work/Skills row markup beyond the heading.

## Records to update

- New `docs/adr/0011-the-card-is-the-object.md`.
- `CONTEXT.md`: **Caption**, **Overture** added; **Approach** redefined; **Slot** wording keeps "interactive" and now means it literally.
- `CLAUDE.md`: Selected Work scene bullet (anatomy, DOM layer, halo, `frontIndex`, playhead formula), Canvases bullet (title outside the composer), Nav/section bullets (no section index), the NO list (+ "a section eyebrow or number", + "a DOM element that tracks the settled card", + "a halo or glow around a card"), the Contact/Footer and Plan B contrast tables.
- The 2026-09-03 spec: a header line pointing here; its last TODO box (Kevin's rating) is answered by this round.

## TODO

- [ ] No DOM chrome in the scene: eyebrow and `view` pill gone; no `.scene-meta*`; the skiplinks and a static SR heading are the a11y path.
- [ ] Every card carries its caption in the scene (name, meta, tinted arrow), crisp at rest, bilingual, and the name is ≥ 12 px on screen on every viewport.
- [ ] No halo; shadows keep their tint.
- [ ] `frontIndex` is gone; `data-registrations` stays `1` across a full scrub; no card, shadow or frame blanks at any settle midpoint (Kevin's manual pass).
- [ ] Hover on the settled card lifts it and slides the arrow; any hit card shows a pointer; click on the settled card navigates; click on another card scrolls it into the slot; tap works the same.
- [ ] The title is crisp at rest (LOD 0, outside the composer), never sits under the nav, scales down when it must, and fills at most 80 % of the width.
- [ ] The overture line stands in the corridor, breathes, is passed through, and is gone exactly when the cards first show; reversible; static under reduced motion; wrapper 550svh.
- [ ] No section eyebrow or number anywhere on the site; Contact's row ordinals remain.
- [ ] ADR 0011, CONTEXT.md, CLAUDE.md and the 2026-09-03 spec updated; contrast tables amended.
- [ ] Kevin's manual pass is GREEN; then the three-leg review on PR #7.
