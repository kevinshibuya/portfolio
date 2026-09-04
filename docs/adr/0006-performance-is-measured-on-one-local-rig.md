# Performance is measured on one local rig, never in CI

The perf harness runs on a single Mac and nowhere else. The design says so as a non-goal: "No CI/cloud perf runs — the rig is local by design (numbers are rig-relative)" and "No real-device mobile measurement rig (mobile-risk changes are flagged in review instead; the rig is this Mac)" (`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:36-39`).

The reason the rig cannot move is the GPU. The harness runs headed on purpose, "because headless would fall back to SwiftShader and measure software rasterisation" (`HANDOFF.md:261-263`). A shader-heavy page measured under software rasterisation is measuring the wrong thing.

Because numbers are only meaningful against the machine that produced them, the runner stamps rig state into every report and refuses to update a baseline when it disagrees: "The runner records rig state ... and warns loudly on mismatch with the baseline's recorded rig state; mismatched-rig runs never update baselines" (`:55-58`), "Cross-rig numbers are not comparisons" (`perf/run.mjs:18-19`).

## Consequences

- A busy rig is refused too, with `--force` as the deliberate escape hatch. The rationale is recorded from a real incident: a baseline "recorded on a loaded rig ... is inflated and every later batch reads as an improvement — systematic corruption of the whole campaign, in the direction that looks like success" (`perf/lib/load.mjs:10-14`).
- Perf runs need the Mac awake, unlocked and left alone. "it cannot be a lights-out overnight job" (`HANDOFF.md:263-264`).
- Lighthouse measures the production build via `npx vite preview`, never the dev server (`:78-79`).

## Source

`docs/superpowers/specs/2026-08-16-hero-perf-harness-design.md:36-39`, `:55-58`, `:78-79`, `perf/run.mjs:18-19`, `perf/lib/load.mjs:10-14`, `HANDOFF.md:261-264`
