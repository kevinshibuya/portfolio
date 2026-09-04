# Scroll is the playhead for Selected Work, and no React state drives a frame

**Status:** superseded in part by ADR 0010 (2026-09-03): the "pure function of scroll alone" half is relaxed by an ambient time-driven layer; the zero-state rule stands.

The Selected Work stage is scrubbed by scroll rather than played on a clock: "a **pinned, scroll-scrubbed stage** where the top-4 featured projects cycle through an **animated card stack** ... Scroll position IS the playhead — fully reversible, holds mid-morph" (`docs/superpowers/specs/2026-07-22-selected-work-card-stack-design.md:11-14`). The component-vault originals were time-driven and were deliberately not reused as-is: "the vault versions are time-driven (AnimatePresence springs / rAF clock) and are NOT copied verbatim" (`:16-17`).

The stricter half of the decision is that every per-frame visual is a pure function of one continuous scroll channel, with zero React state in the loop: "Every visual is a deterministic function of `seg` via `useTransform` MotionValues at leaf components — **zero React state per frame** (re-render-kills-entrance lesson)" (`:55-58`). The `frontIndex` state still exists but flips only at segment midpoints and feeds only non-visual attributes — the interactive link, aria, meta text, `--row-tint` — "so its frame-lag can never tear the card/title flight" (`CLAUDE.md:33`).

## Consequences

- Frozen invariants carried forward: "single visual channel `segCont` ... every per-frame visual a pure function of it; `frontIndex` state feeds ONLY non-visual attrs" (`docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md:62-64`).
- Entrance variants live on containers, scrub transforms on leaves, never both on one element (`card-stack:55-58`).
- Reduced motion keeps the pin and removes all animation — static slots, instant swaps, no SVG filter (`CLAUDE.md:33`).
- No scroll-jacking (`card-stack:83`).

## Source

`docs/superpowers/specs/2026-07-22-selected-work-card-stack-design.md:11-14`, `:16-17`, `:55-58`, `:82`, `docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md:62-64`, `CLAUDE.md:33`
