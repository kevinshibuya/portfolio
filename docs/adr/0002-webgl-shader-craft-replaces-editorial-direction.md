# WebGL shader craft replaced the editorial/press art direction

The portfolio previously pursued an editorial/newsroom look — warm paper tokens, halftone portrait scenes, a goes-to-press wipe. That direction was dropped after the owner rated it 4/10: the `webgl-pivot` design "**Supersedes:** the editorial/press-revamp direction (`design/work-first-press-revamp`, parked unmerged; owner rated it 4/10)" (`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md`).

The replacement is stated plainly: "The editorial/newsroom direction is abandoned. The new target is a modern, designer-grade ("awwwards-grade") portfolio built around advanced WebGL shader craft ... The work leads; biography follows. Done = Kevin rates the shipped page designer-grade". The base mood became dark ink sitewide, with colour carried only by a shader tricolor.

## Consequences

- Every prior MVP-era visual system was retired at once — light cream/sand theme, bento cards, ink-draw hero entrance, the R3F hero accent (`docs/superpowers/plans/2026-07-19-webgl-pivot.md`).
- Sections converge on one open typographic row primitive: "no cards/containers ... Projects, embeds, and work experience all use this one row primitive" (`docs/architecture.md#workrow`).
- Selected Work is the single sanctioned carve-out from the no-cards rule; its framed cards are now the scene's, not a stack (`docs/architecture.md#layout-and-section-flow`, ADR 0009).
- The press-revamp vocabulary on the branch `design/work-first-press-revamp` is historical. It is kept for the record, not its design.
- React Three Fiber was removed with this pivot, then returned for the Selected Work scene only (ADR 0009); the hero and backdrop stay raw WebGL.

## Source

`docs/superpowers/specs/2026-07-19-webgl-pivot-design.md`, `docs/superpowers/plans/2026-07-19-webgl-pivot.md`, `docs/architecture.md#palette-and-tokens`
