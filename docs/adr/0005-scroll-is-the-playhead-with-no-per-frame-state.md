# Scroll is the playhead for Selected Work, and no React state drives a frame

**Status:** superseded in part by ADR 0010 (2026-09-03): the "pure function of scroll alone" half is relaxed by an ambient time-driven layer; the zero-state rule stands.

The Selected Work stage is scrubbed by scroll rather than played on a clock: "a **pinned, scroll-scrubbed stage** where the top-4 featured projects cycle through an **animated card stack** ... Scroll position IS the playhead — fully reversible, holds mid-morph" (`docs/superpowers/archive/specs/2026-07-22-selected-work-card-stack-design.md`). The component-vault originals were time-driven and were deliberately not reused as-is: "the vault versions are time-driven (AnimatePresence springs / rAF clock) and are NOT copied verbatim".

The stricter half of the decision is that every per-frame visual is a pure function of one continuous scroll channel, with zero React state in the loop: "Every visual is a deterministic function of `seg` via `useTransform` MotionValues at leaf components — **zero React state per frame** (re-render-kills-entrance lesson)". The `frontIndex` state still exists but flips only at segment midpoints and feeds only non-visual attributes — the interactive link, aria, meta text, `--row-tint` — "so its frame-lag can never tear the card/title flight" (`docs/superpowers/archive/plans/2026-07-22-light-chapter-plan-a.md`).

## Consequences

- Frozen invariants carried forward: "single visual channel `segCont` ... every per-frame visual a pure function of it; `frontIndex` state feeds ONLY non-visual attrs" (`docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md`).
- Entrance variants live on containers, scrub transforms on leaves, never both on one element.
- Reduced motion keeps the pin and removes all animation — static slots, instant swaps, no SVG filter (`docs/architecture.md#selected-work-scene`).
- No scroll-jacking.

## Source

`docs/superpowers/archive/specs/2026-07-22-selected-work-card-stack-design.md`, `docs/superpowers/specs/2026-07-22-selected-work-light-chapter-design.md`, `docs/architecture.md#selected-work-scene`
