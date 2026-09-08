# The archive is act two of the Selected Work scene

Kevin asked for the archive (every shipped piece, 171 today) to feel cinematic and three-dimensional like the Selected Work scene, and rejected a flat list. Two rules closed the obvious routes: ADR 0009 forbids a fourth canvas, and ADR 0002 forbids cards outside the scene. So the archive became a second act of the same scene: after the fourth card settles the camera pulls back to a frieze built from every piece, then travels along it year by year, in the scene's own canvas, fog, floor and title object. Pieces are typography on the wall; only the nine case studies keep the card object. A DOM stream of the same data is the accessible twin and the no-WebGL archive.

## Considered options

- **DOM CSS 3D**, a perspective container scrubbed by Framer, no canvas. Rejected: next to a real scene it reads as a trick, and it would put a second 3D vocabulary on the page.
- **A fourth canvas** by amending ADR 0009, mounted only when the scene's canvas unmounts. Rejected: a second GPU context and a broken invariant for nothing the shared canvas cannot do.

## Consequences

- The scene section owns the archive. The pin grows from `550svh` to a height computed from the frieze's column count (about 1250 svh today), and the playhead gains an act.
- The title object shows strings that are not project names ("all work", then years). The Anton fence in `CLAUDE.md` reads "the Selected Work title"; this object is that title, so the fence holds without amendment.
- "Everything is a piece; origin is the only axis." The reader sees no project-versus-editorial split, only `professional`, `freelance` and `personal`. The content types stay separate in the data.
- Per-card canvas textures do not scale to 171. The wall rasterises one alpha-coverage texture per year block and colours it in a shader, the title's technique, not the caption's.
- The build is three pipelines on a chain of stacked branches into one integration branch, landed on `staging` once. Spec: `docs/superpowers/specs/2026-09-08-archive-act-two-design.md`.
