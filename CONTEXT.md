# Portfolio

Kevin Shibuya's personal developer portfolio, live at kevinshibuya.com. A bilingual EN/PT React single-page site with per-project detail routes, whose centerpiece is a pinned 3D Selected Work scene between two raw-WebGL shader canvases.

Every entry below cites the file it was read from. Nothing here was inferred.

## Language

### Content

**Project**:
A piece of work with its own detail route at `/projects/:slug`, carrying an editorial digest (`pitch`, plus the optional `whatShipped` and `trick`) that the detail page renders when present.
(`src/types/content.ts`, `docs/architecture.md#content-model`)
_Avoid_: case study, portfolio piece, work item

**Embed**:
A day-to-day interactive published on GZH (`gauchazh.clicrbs.com.br`) with no page of its own, shown only inside a filterable gallery. Its title is Portuguese-only, because the source material is editorial.
(`src/types/content.ts`, `src/data/embeds.csv`, `docs/architecture.md#content-model`)
_Avoid_: widget, interactive, article

**Archive item**:
The flattened, date-sorted union of everything the Archive section lists, tagged by `kind`: featured, editorial, personal, oss or freelance.
(`src/types/content.ts`, `src/data/archive.ts`)

**highlightOrder**:
The manual rank across projects. The Selected Work scene carries the projects matching `p.highlight && (p.highlightOrder ?? 99) <= 4`; both predicates count.
(`src/types/content.ts`, `src/data/projects.ts`, `docs/architecture.md#content-model`)
_Avoid_: priority, featured rank

**Bilingual**:
The shape of every reader-facing string, `{ en, pt }`. Copy is authored in both languages from the first commit, not translated afterwards.
(`src/types/content.ts`, ADR 0001)
_Avoid_: i18n string, localized copy

### Surface

**Tricolor**:
The accent set and the only color in the design: pink-red `#E64D66`, blue `#4D80E6`, yellow `#E6CC4D`. Carried by the shaders and by row tints, nowhere else.
(`src/utils/palette.ts`, `docs/architecture.md#palette-and-tokens`)
_Avoid_: brand colors, palette, theme colors

**Row tint**:
A row's accent, taken by index rotation through the tricolor via `accentFor()` and exposed as the `--row-tint` CSS var. Never a per-component color choice.
(`src/utils/palette.ts`, `docs/architecture.md#palette-and-tokens`)

**WorkRow**:
The shared open typographic row that section lists are built from: index, oversized lowercase title, dot-joined meta, arrow, hairline. Reused verbatim by Archive and WorkExperience rather than re-marked-up per section.
(`src/components/ui/WorkRow.tsx`, `docs/architecture.md#workrow`)
_Avoid_: card, list item, table row

**Selected Work scene**:
The page centerpiece: a pinned 3D scene where scroll dollies a camera through a corridor of the top four project cards under a floating, morphing title.
(`src/components/canvas/SelectedWorkScene.tsx`, ADR 0009, `docs/architecture.md#selected-work-scene`)
_Avoid_: stage (kept only in legacy CSS class names), card stack, featured work, projects carousel, bento

**Scene**:
The Selected Work 3D environment as a whole: fog, floor, corridor, camera and title, rendered in the section's own canvas.
(`src/components/canvas/scene/Environment.tsx`, `docs/architecture.md#selected-work-scene`)
_Avoid_: stage, canvas (the canvas is the element the scene renders into). The Contact/Footer stage keeps the word; the avoid is scoped to the scene.

**Corridor**:
The four card positions laid along depth, alternating a lateral offset, that the camera travels past.
(`src/components/canvas/scene/Corridor.tsx`, `docs/architecture.md#selected-work-scene`)
_Avoid_: stack, track, rail

**Slot**:
The settled front position where a card is sharp, in focus and pressable; every integer playhead is a card in the slot.
(`src/utils/sceneMotion.ts`, ADR 0011, `docs/architecture.md#selected-work-scene`)
_Avoid_: front, active card, hero position

**Caption**:
The name, meta line and arrow drawn on a card's body band, in the scene, so the card is one object. The DOM keeps only the skip-link index for keyboard and screen readers.
(`src/components/canvas/scene/Caption.tsx`, ADR 0011, `docs/architecture.md#selected-work-scene`)
_Avoid_: overlay, meta overlay, label, pill

**Approach**:
The 150svh entry beat before card 0 reaches the slot: the overture, then the 50svh in which card 0 surfaces from the fog and the title resolves. Cards are zero-indexed, matching `data-slot`.
(`src/utils/sceneMotion.ts`, `docs/architecture.md#selected-work-scene`)
_Avoid_: intro, lead-in

**Overture**:
The first 100svh of the approach, where a line in Kevin's voice stands in the corridor and the camera passes through it before the cards show.
(`src/components/canvas/scene/SceneRig.tsx`, `docs/architecture.md#selected-work-scene`)
_Avoid_: intro line, headline, eyebrow

**Playhead**:
Scroll progress through the scene, which is also the camera's position. Scroll owns sequence and position; time owns the ambient breath.
(`src/utils/sceneMotion.ts`, ADR 0010, `docs/architecture.md#selected-work-scene`)
_Avoid_: scrub position, progress value

**FluidWaves**:
The one raw-WebGL shader component, instantiated in a `hero` or a `backdrop` variant. With the Selected Work scene it makes three canvases on the page, at most two live at once.
(`src/components/canvas/FluidWaves.tsx`, `docs/architecture.md#canvases`)

**Tonal section**:
A section painted `--bg-tonal` `#131722` instead of the base `--bg` `#0B0E14`, alternating down the page.
(`src/index.css`, `docs/architecture.md#layout-and-section-flow`)

**Entrance**:
The one-shot opening sequence: the loader's `ks.` cutout explodes, then the hero role and name rise out of their clip masks. Gated on `entranceDone`.
(`src/main.tsx`, `docs/architecture.md#loader-and-entrance`)
_Avoid_: intro, page load animation

**Lane**:
A library's exclusive assignment for a kind of animation. GSAP owns entrance orchestration; Framer Motion owns state-driven and scroll-scrubbed motion. Two lanes never drive the same animation.
(`CLAUDE.md`, `docs/architecture.md#animation-lanes`)

### Records

**Spec**:
An approved design under `docs/superpowers/specs/`. Its `## TODO` checkboxes tick only when the acceptance test passes and review approves.
(`CLAUDE.md`)

**Plan**:
An implementation plan under `docs/superpowers/plans/`. Its step checkboxes are the source of truth for progress and tick as each step lands.
(`CLAUDE.md`)

**ADR**:
A decision with its reasoning, numbered, under `docs/adr/`. It records why a choice was made and what it ruled out, not how the code works today.
(`docs/adr/`)

**Architecture note**:
A section of `docs/architecture.md`: how one surface works today, one section per surface. Current truth only, rewritten rather than appended to.
(`docs/architecture.md`)

**Archive**:
A record of a retired system under `docs/superpowers/archive/`. It was true when written and is never read for current truth.
(`docs/superpowers/archive/README.md`)

**HANDOFF**:
The resume note at the repo root, always present, never tracked. Superseded ones are renamed `HANDOFF-<slug>.archived.md` and kept on disk, ignored.
(`.gitignore`)

## Invariants

- Every reader-facing string exists in both `en` and `pt`, except embed titles (Portuguese only, editorial source) and the loader's two corner labels in `index.html` (English only, painted before i18n loads). (`src/types/content.ts`, `index.html`, ADR 0001)
- No spaced em-dash (` — `) in reader-facing prose; use `·`. Date ranges, code comments and quoted wordmarks are exempt. (`CLAUDE.md`)
- Every animation honours `prefers-reduced-motion`. (`CLAUDE.md`)
- At most two canvases live at once, three mounted (hero, Selected Work scene, backdrop); a fourth is forbidden. Off-screen canvases pause. (ADR 0009, `docs/architecture.md#canvases`)
- GSAP and Framer Motion never drive the same animation. (`CLAUDE.md`, `docs/architecture.md#animation-lanes`)
- Any palette or token change ships with a recomputed AA contrast audit across every affected text/background pair. (`CLAUDE.md`, `docs/contrast.md`)
- The hero text carries a documented, owner-ratified AA exemption; no contrast layer may be reintroduced behind it. (`src/index.css`, ADR 0004, `docs/architecture.md#hero`)
- Spec and plan checkboxes are kept in sync with reality; boxes are never invented, only ticked. (`CLAUDE.md`)
- `npm run preview` is `npm run build && wrangler dev`, not a static preview; it rebuilds first. Lighthouse and ad-hoc preview work use `npx vite preview --port 4173`. (`package.json`, ADR 0008)
- The JSON-LD in `index.html` mirrors `src/data/projects.ts`, with contiguous positions; a test asserts it. (`tests/unit/seo/jsonld-projects.test.ts`)
- Job titles in work experience are historical facts and are not rewritten; only descriptions sync. (`src/data/workExperience.ts`)
- The CV at `~/keki/cv-rebuild` is canonical for personal facts, and `cv-pt.html` is the only current one. (Kevin's rule, outside the repo)
- Production ships from `main` on push through Cloudflare; `main` is frozen. `npm run deploy` ships production directly without a merge and is owner-only. (`package.json`, `CLAUDE.md`)
