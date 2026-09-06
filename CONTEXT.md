# Portfolio

Kevin Shibuya's personal developer portfolio, live at kevinshibuya.com (`README.md:6`). A bilingual EN/PT React single-page site with per-project detail routes, whose centerpiece is a raw-WebGL shader hero and whose performance work is judged by a committed measurement harness rather than by eye (`CLAUDE.md:18`, `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:16`).

Every entry below cites the file it was read from. Nothing here was inferred.

## Language

### Content

**Project**:
A piece of work with its own detail route at `/projects/:slug`, carrying an editorial digest (`pitch`, `whatShipped`, `trick`) that every detail page renders.
(`CLAUDE.md:127`, `src/types/content.ts:36-70`)
_Avoid_: case study, portfolio piece, work item

**Embed**:
A day-to-day interactive published on GZH (`gauchazh.clicrbs.com.br`) with no page of its own, shown only inside a filterable gallery. Its title is Portuguese-only, because the source material is editorial.
(`CLAUDE.md:144`, `CLAUDE.md:156`, `CLAUDE.md:161`, `src/types/content.ts:81-88`)
_Avoid_: widget, interactive, article

**Archive item**:
The flattened, date-sorted union of everything the Archive section lists, tagged by `kind`: featured, editorial, personal, oss or freelance.
(`src/types/content.ts:90-105`)

**highlightOrder**:
The manual rank across projects. The top four (`highlightOrder <= 4`) are the ones the Selected Work scene carries in its corridor.
(`CLAUDE.md:33`, `src/types/content.ts:49`, `src/data/projects.ts`)
_Avoid_: priority, featured rank

**Bilingual**:
The shape of every reader-facing string, `{ en, pt }`. Copy is authored in both languages from the first commit, not translated afterwards.
(`src/types/content.ts:19-22`, `README.md:4`, `CLAUDE.md:14`)
_Avoid_: i18n string, localized copy

### Surface

**Tricolor**:
The accent set and the only color in the design: pink-red `#E64D66`, blue `#4D80E6`, yellow `#E6CC4D`. Carried by the shaders and by row tints, nowhere else.
(`CLAUDE.md:23`, `CLAUDE.md:27`, `src/utils/palette.ts:2`)
_Avoid_: brand colors, palette, theme colors

**Row tint**:
A row's accent, taken by index rotation through the tricolor via `accentFor()` and exposed as the `--row-tint` CSS var. Never a per-component color choice.
(`CLAUDE.md:27`, `src/utils/palette.ts:4-6`)

**WorkRow**:
The shared open typographic row that section lists are built from: index, oversized lowercase title, dot-joined meta, arrow, hairline. Reused verbatim by Archive and WorkExperience rather than re-marked-up per section.
(`CLAUDE.md:35`)
_Avoid_: card, list item, table row

**Selected Work scene**:
The page centerpiece — a pinned 3D scene where scroll dollies a camera through a corridor of the top four project cards under a floating, morphing title.
(`docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/adr/0009-selected-work-scene-is-a-third-canvas-rendered-by-r3f.md`)
_Avoid_: stage (kept only in legacy CSS class names), card stack, featured work, projects carousel, bento

**Scene**:
The Selected Work 3D environment as a whole: fog, floor, corridor, camera and title, rendered in the section's own canvas.
(`docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`)
_Avoid_: stage, canvas (the canvas is the element the scene renders into)

**Corridor**:
The four card positions laid along depth, alternating a lateral offset, that the camera travels past.
(`docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`)
_Avoid_: stack, track, rail

**Slot**:
The settled front position where a card is sharp, in focus and pressable; every integer playhead is a card in the slot.
(`docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`, `docs/adr/0011-the-card-is-the-object.md`)
_Avoid_: front, active card, hero position

**Caption**:
The name, meta line and arrow drawn on a card's body band, in the scene, so the card is one object. The DOM keeps only the skip-link index for keyboard and screen readers.
(`docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md`, `docs/adr/0011-the-card-is-the-object.md`)
_Avoid_: overlay, meta overlay, label, pill

**Approach**:
The 150svh entry beat before card 1 reaches the slot: the overture, then the 50svh in which card 1 surfaces from the fog and the title resolves.
(`docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md`)
_Avoid_: intro, lead-in

**Overture**:
The first 100svh of the approach, where a line in Kevin's voice stands in the corridor and the camera passes through it before the cards show.
(`docs/superpowers/specs/2026-09-04-selected-work-scene-round-two.md`)
_Avoid_: intro line, headline, eyebrow

**Playhead**:
Scroll progress through the scene, which is also the camera's position. Scroll owns sequence and position; time owns the ambient breath.
(`docs/adr/0010-scroll-is-the-playhead-time-is-the-breath.md`)
_Avoid_: scrub position, progress value

**FluidWaves**:
The one raw-WebGL shader component, instantiated in a `hero` or a `backdrop` variant. With the Selected Work scene it makes three canvases on the page, at most two live at once.
(`CLAUDE.md:28-30`)

**Tonal section**:
A section painted `--bg-tonal` `#131722` instead of the base `--bg` `#0B0E14`, alternating down the page.
(`CLAUDE.md:38`)

**Entrance**:
The one-shot opening sequence: the loader's `ks.` cutout explodes, then the hero role and name rise out of their clip masks. Gated on `entranceDone`.
(`CLAUDE.md:34`)
_Avoid_: intro, page load animation

**Lane**:
A library's exclusive assignment for a kind of animation. GSAP owns entrance orchestration; Framer Motion owns state-driven and scroll-scrubbed motion. Two lanes never drive the same animation.
(`CLAUDE.md:36`, `CLAUDE.md:62`, `README.md:22`)

### Measurement

**Rig**:
The single Mac every performance number is relative to. Its state is recorded into every report, and a mismatch refuses a baseline update.
(`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:38`, `:53-57`, `perf/run.mjs:17-19`)
_Avoid_: test machine, CI runner

**Layer 1 / Layer 2 / Layer 3**:
The three measurement tiers. Layer 1 hard-asserts exact budgets in the e2e suite, Layer 2 measures controlled in-page scenarios, Layer 3 scores the whole production page in Lighthouse.
(`perf/lighthouse.mjs:7-11`, `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:44-51`)

**Scenario**:
One reproducible symptom, run a fixed number of times and reduced to a median plus a tolerance band. Nothing in a scenario decides whether a number is good, only whether it moved.
(`perf/run.mjs:8-11`)

**Baseline**:
The committed reference numbers in `perf/baseline.json`, under four keys — `rig`, `exact`, `scenarios`, `lighthouse`. Kept wins ratchet it down so later batches cannot give them back.
(`HANDOFF.md:32-34`, `docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:153`)

**Pixel gate**:
The sole visual arbiter over the optimization campaign: committed goldens across fixed seeds, viewports and moments, at antialiasing-level tolerance.
(`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:125-133`)

**Batch**:
One hypothesis, implemented and then kept or reverted on the measurement alone.
(`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:149-152`)

### Records

**Spec**:
An approved design under `docs/superpowers/specs/`. Its `## TODO` checkboxes tick only when the acceptance test passes and review approves.
(`CLAUDE.md:94`, `CLAUDE.md:99`)

**Plan**:
An implementation plan under `docs/superpowers/plans/`. Its step checkboxes are the source of truth for progress and tick as each step lands.
(`CLAUDE.md:94`, `CLAUDE.md:98`)

**Ledger**:
The per-task SDD record at `.superpowers/sdd/<slug>/progress.md`, holding rulings, per-task evidence and findings. It is the source of truth and survives compaction.
(`HANDOFF.md:29-31`)

**HANDOFF**:
The live resume note at the repo root. Superseded ones are renamed `HANDOFF-<slug>.archived.md` and kept.
(`HANDOFF.md:1`, root `HANDOFF-*.archived.md`)

## Invariants

- Every reader-facing string exists in both `en` and `pt`. (`README.md:57`, `CLAUDE.md:14`, `src/types/content.ts:19`)
- No spaced em-dash (` — `) in reader-facing prose; use `·`. Date ranges, code comments and quoted wordmarks are exempt. (`CLAUDE.md:42`, `HANDOFF-content-sync-cv5b.archived.md:86`, `HANDOFF-bento-content-revamp.archived.md:35`)
- Every animation honours `prefers-reduced-motion`. (`README.md:58`, `CLAUDE.md:36`)
- At most two canvases live at once, three mounted (hero, Selected Work scene, backdrop); a fourth is forbidden. Off-screen canvases pause. (`docs/adr/0009-selected-work-scene-is-a-third-canvas-rendered-by-r3f.md`)
- GSAP and Framer Motion never drive the same animation. (`CLAUDE.md:36`, `CLAUDE.md:62`)
- Any palette or token change ships with a recomputed AA contrast audit across every affected text/background pair. (`CLAUDE.md:43`)
- The hero text carries a documented, owner-ratified AA exemption; no contrast layer may be reintroduced behind it. (`src/index.css:383-391`, `CLAUDE.md:31`, `docs/adr/0004-hero-text-aa-exemption.md`)
- Tailwind source scanning is an explicit allow-list. Markup outside `src/` or `index.html` needs its own `@source` line or it renders unstyled with no error. (`CLAUDE.md:10`)
- Spec and plan checkboxes are kept in sync with reality; boxes are never invented, only ticked. (`CLAUDE.md:94-102`)
- Performance numbers are rig-relative. A run on a mismatched or busy rig never updates a baseline. (`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:57`, `perf/lib/load.mjs:1-17`)
- `npm run preview` is `wrangler dev`, not a static preview. Lighthouse and ad-hoc preview work use `npx vite preview --port 4173`. (`package.json:14`, `HANDOFF-press-revamp-plan1-exec.archived.md:62`, `HANDOFF-bento-content-revamp.archived.md:90`)
- The JSON-LD in `index.html` mirrors `src/data/projects.ts`, with contiguous positions; a test asserts it. (`HANDOFF-content-sync-cv5b.archived.md:81-82`)
- Job titles in work experience are historical facts and are not rewritten; only descriptions sync. (`HANDOFF-content-sync-cv5b.archived.md:69`)
- The CV at `~/keki/cv-rebuild` is canonical for personal facts, and `cv-pt.html` is the only current one. (`HANDOFF-bento-content-revamp.archived.md:60`, `HANDOFF-content-sync-cv5b.archived.md:28-30`)
- Deploys are manual and owner-run; `npm run deploy` is fenced. (`HANDOFF-content-sync-cv5b.archived.md:23`, `:89-90`)

## Where the records live

| What | Where |
| --- | --- |
| Working rules, design direction, current NO list | `CLAUDE.md` |
| Stack and getting started | `README.md` |
| Current state, blockers, next action | `HANDOFF.md` |
| Closed efforts, kept for their gotchas | `HANDOFF-*.archived.md` (five) |
| Approved designs | `docs/superpowers/specs/` |
| Implementation plans | `docs/superpowers/plans/` |
| Retrospectives | `docs/superpowers/retros/` |
| Per-task evidence and rulings | `.superpowers/sdd/<slug>/progress.md` |
| Performance decisions and their derivations | `perf/decisions.md` |
| Committed performance reference numbers | `perf/baseline.json` |
| Decisions with their reasoning | `docs/adr/` |

## Known contradictions in the records

Recorded rather than resolved, because resolving them means editing source docs.

- `README.md:19` lists React Three Fiber (`@react-three/fiber`, `drei`, `three`) as the webgl/3D layer, and `CLAUDE.md:13` repeats it. Not true at HEAD (`CLAUDE.md:42` records the removal; `package.json` carries none of the packages), but ADR 0009 brings R3F back for the Selected Work scene, so the line becomes true once that ships. The hero and backdrop shaders stay raw WebGL (`CLAUDE.md:29`).
- `README.md:59` credits a CC-BY 3D model in the footer. The footer was rewritten during the WebGL pivot (`CLAUDE.md:40`).
- `HANDOFF-press-revamp-plan1-exec.archived.md` and `HANDOFF-press-revamp-plan2.archived.md` describe a warm-paper/sand visual system with halftone scenes. `CLAUDE.md:18` records that every prior MVP-era visual system was retired by the `webgl-pivot` plan, so that vocabulary is historical.
