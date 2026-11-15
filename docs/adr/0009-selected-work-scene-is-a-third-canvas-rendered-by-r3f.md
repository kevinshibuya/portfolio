# The Selected Work scene is a third canvas, rendered by React Three Fiber

**Status:** accepted (grilling, 2026-09-03)

The Selected Work section became a real 3D environment: a camera dolly through a corridor of project cards, with floor shadows, fog and depth of field (`docs/superpowers/specs/2026-09-03-selected-work-scene-design.md`). That needs a WebGL canvas of its own, which breaks the literal "at most two canvases on the page" rule set at the WebGL pivot (`CLAUDE.md`, ADR 0002), and it needs shadows and a post pass, which rule out hand-written raw WebGL in the style of `FluidWaves`. We decided: a third canvas is mounted, the invariant becomes **at most two canvases live at once, three mounted**, and the scene is rendered by **React Three Fiber** (`three`, `@react-three/fiber`, `@react-three/postprocessing`, `postprocessing`; no `drei`), loaded only in the section's lazy chunk.

## Considered options

- **CSS 3D** (`perspective` + DOM planes): no canvas, no dependency, but no fog, light or shadow — it reads as cards on a perspective plane, not a place. Rejected.
- **Raw WebGL** like `FluidWaves`: no dependency, but soft floor shadows and depth of field mean writing a shadow pass and a post pipeline by hand, and `FluidWaves` has no shared helper to build on. Rejected once the environment was decided to carry shadows and DoF.
- **Vanilla `three` in one effect**: fewer packages than R3F, but every piece of plumbing (texture loading, shadow pass, post pass) hand-wired. R3F's declarative scene and Suspense textures won.

## Consequences

- The invariant's purpose (GPU cost) is preserved by the existing IntersectionObserver pause: a canvas off screen halts its loop. The hero and the scene overlap only across the hero's dissolve band.
- The dependency allowlist in `tests/unit/bundle-deps.test.ts` grows by four packages, all confined to the lazy chunk; the NO list keeps forbidding the old R3F *hero accent*, not R3F.
- `README.md` and the `CLAUDE.md` stack list, which still named R3F as the 3D layer after its removal, are true again; the contradiction recorded in `CONTEXT.md` is resolved in that direction.
- A fourth canvas is forbidden.
