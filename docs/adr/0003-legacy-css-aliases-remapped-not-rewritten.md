# Light-era CSS variable aliases were remapped onto the dark system, not rewritten

When the site flipped from the light palette to dark ink, the old colour variables were kept and pointed at new values instead of being renamed across the stylesheet. The record: the legacy aliases "`--cream`, `--sand`, `--mist`, `--ink`, `--bark`, `--dust`, `--blue-*`, `--periwinkle-*`) remain in `:root`, remapped onto the dark system so the whole light-era stylesheet flips without a rewrite — role names kept their vars, so e.g. `--cream` is now dark (page bg) and `--ink` is now light (text)" (`CLAUDE.md:24`).

The alternative — renaming every usage — was rejected for cost, and the result is logged as debt rather than as a pattern: "the aliases are accepted debt (Plan risk 5), not a pattern to extend" (`CLAUDE.md:24`), carried forward as "Legacy CSS-var aliases remain (Plan risk 5) — future cleanup chore" (`HANDOFF-webgl-pivot-wave1-complete.archived.md:27-28`).

## Consequences

The variable names now lie about their colours. Anyone reading `--cream` and expecting a light value will be wrong. New work reads from the canonical `--color-*` / `--text` / `--bg` names instead (`CLAUDE.md:24`). Do not "correct" an alias by changing what it points at — the whole light-era stylesheet still depends on the remap.

## Source

`CLAUDE.md:24`, `HANDOFF-webgl-pivot-wave1-complete.archived.md:27-28`
