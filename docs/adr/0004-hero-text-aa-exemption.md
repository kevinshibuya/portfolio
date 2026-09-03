# The hero text ships a documented WCAG AA exemption

The hero name, role and dark-context nav render plain cream directly on raw shader paint, with nothing between the text and the paint — "no scrim, no text-shadow halo, no shader-side darkening of any kind" (`src/index.css:383-391`). This deliberately fails AA over the brightest paint.

Softer remedies were tried and measured before being rejected: "soft treatments proved unsatisfiable: ~1.8–2.3:1 over worst-case yellow; a worst-pixel 4.5:1 needs a near-opaque halo, rejected aesthetically" (`src/index.css:387-389`). The owner ratified the tradeoff on 2026-07-23. The canonical record is the `.hero-zone` comment block in `src/index.css`; `CLAUDE.md:31` points at it.

## Consequences

- Do not reintroduce a contrast layer behind the hero text. The old `.hero-scrim` and the interim "ink aurora" text-shadows are both retired (`CLAUDE.md:31`).
- The one sanctioned exception is an opt-in `@media (prefers-contrast: more)` layer for users whose OS asks for more contrast. The default presentation stays untouched (`src/index.css:390-391`, `CLAUDE.md:31`).
- This exemption is local to the hero. It does not license low contrast anywhere else — the Contact/Footer stage over the dimmed backdrop carries its own audited table where every always-visible pair clears 4.5:1 (`CLAUDE.md:44-59`), and the card stack's `view project` bar keeps its own ink gradient (`CLAUDE.md:33`).
- The standing rule that any token change ships with a recomputed AA audit still applies (`CLAUDE.md:43`).

## Source

`src/index.css:383-391`, `CLAUDE.md:31`, `CLAUDE.md:43`, `CLAUDE.md:44-59`
