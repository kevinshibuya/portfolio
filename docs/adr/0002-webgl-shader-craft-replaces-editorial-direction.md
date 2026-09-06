# WebGL shader craft replaced the editorial/press art direction

The portfolio previously pursued an editorial/newsroom look — warm paper tokens, halftone portrait scenes, a goes-to-press wipe. That direction was dropped after the owner rated it 4/10: the `webgl-pivot` design "**Supersedes:** the editorial/press-revamp direction (`design/work-first-press-revamp`, parked unmerged; owner rated it 4/10)" (`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md:7`).

The replacement is stated plainly: "The editorial/newsroom direction is abandoned. The new target is a modern, designer-grade ("awwwards-grade") portfolio built around advanced WebGL shader craft ... The work leads; biography follows. Done = Kevin rates the shipped page designer-grade" (`:11-14`). The base mood became dark ink sitewide, with colour carried only by a shader tricolor (`:19-21`).

## Consequences

- Every prior MVP-era visual system was retired at once — light cream/sand theme, bento cards, ink-draw hero entrance, the R3F hero accent (`CLAUDE.md:18`, `CLAUDE.md:42`).
- Sections converge on one open typographic row primitive: "no cards/containers ... Projects, embeds, and work experience all use this one row primitive" (`:37-40`).
- The Selected Work card stack is the single sanctioned carve-out from the no-cards rule (`CLAUDE.md:26`).
- The press-revamp vocabulary in `HANDOFF-press-revamp-plan1-exec.archived.md` and `HANDOFF-press-revamp-plan2.archived.md` is historical. Those files are kept for their gotchas, not their design.
- `README.md:19` and `CLAUDE.md:13` still list React Three Fiber as the 3D layer. That is stale — the dependency was removed (`CLAUDE.md:42`) and `package.json` carries neither `three` nor `@react-three/*`.

## Source

`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md:7`, `:11-14`, `:19-21`, `:37-40`, `CLAUDE.md:18`, `CLAUDE.md:26`, `CLAUDE.md:42`
