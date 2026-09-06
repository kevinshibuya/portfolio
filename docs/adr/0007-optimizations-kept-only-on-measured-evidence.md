# Optimizations are kept only on measured evidence, with the pixel gate as sole visual arbiter

**Note:** the harness this ADR describes lives on the `perf/hero-harness` branch and is not in this tree. The paths below are relative to that branch.

Perf work on this repo used to be guesswork: "Measurement today is ad-hoc (~40 untracked probe scripts in `tmp/`, nothing repeatable, nothing gated)" (docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md). The harness replaced that with a procedure in which the measurement, not the author, decides whether a change survives.

One hypothesis per batch: "implement → `npm run perf` → keep only if (a) the targeted metric improves beyond its noise band, (b) nothing else regresses, (c) the pixel gate holds. Otherwise **revert** — no partial credit, no unmeasured "should help elsewhere" arguments". Kept wins ratchet the baseline down "so later batches can't give them back".

Visual judgment was removed from the loop by an explicit owner choice. The pixel gate is "The sole visual arbiter (Kevin's explicit choice — no per-batch human review)", with antialiasing-level tolerance, and "A pixel shift beyond AA noise **auto-rejects the optimization** — no judgment calls". "Implementer self-judgment on visuals stays banned".

## Considered and rejected

Per-batch human eyeball review of each optimization. Rejected in favour of the gate.

## Consequences

- Cadence and trajectory count as visuals even though static goldens cannot see them, so the rule is written out: "animation frame rate, sim rate, easing, and motion trajectory are visuals. No fps caps, no sim slowdowns".
- Goldens regenerate only on a commit that declares visual intent, never during a campaign.
- The gate is only as good as its sensitivity, so the harness must detect a deliberately planted regression — "a net that catches nothing proves nothing". This is a live constraint: the sensitivity proof failed, and that failure blocks the campaign.

## Source

On the `perf/hero-harness` branch: docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md
