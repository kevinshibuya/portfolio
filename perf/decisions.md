# Perf campaign — decisions log

Append-only record of the hero perf campaign's measurements and keep/revert
calls. Every numeric claim made about this campaign traces to an entry here.

---

## 2026-08-16 · Task 2 · Pixel-gate tolerance calibration

**Gate:** `npx playwright test pixel-gate --workers=1` — 30 goldens
(5 moments × 3 seeds × 2 Playwright projects), `tests/e2e/pixel-gate.spec.ts`.

### Measured noise floor

To calibrate rather than guess, the suite was run once at **absolute
strictness** (`threshold: 0`, `maxDiffPixelRatio: 0`) against the freshly
recorded goldens — i.e. "any single pixel differing by any amount fails".

| result | count |
|---|---|
| byte-identical to golden | **29 / 30** |
| non-zero diff | **1 / 30** |

The single outlier: `stage-arrival-t2 · seed-0p873` on `mobile-chromium` —
**28 pixels different** on a 393×727 image (285,711 px) = **ratio 0.000098**.

Every desktop-chromium shot and every hero/dissolve shot on both projects was
byte-identical. The noise is confined to mobile, which is consistent with its
source: `toHaveScreenshot` defaults to `scale: 'css'`, so the Pixel 5 render at
`deviceScaleFactor: 2.75` is downsampled 2.75× → 1× before comparison, and that
resampling is not bit-stable across runs. The frozen WebGL frame itself is
exactly reproducible (proved separately by `perf-hooks.spec.ts`, which asserts
byte-equality of the raw canvas across reloads).

### Chosen tolerance

```ts
{ animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001, threshold: 0.05 }
```

- `maxDiffPixelRatio: 0.001` — **~10× the measured 0.000098 floor**. Headroom
  for the resampling jitter, and nothing more: 0.001 of the smallest shot in
  the matrix is ~286 px, of the largest (1440×900) ~1296 px. A shader, layout,
  or colour regression touches orders of magnitude more than that.
- `threshold: 0.05` — per-pixel colour distance. Playwright's default of `0.2`
  would let every pixel on the page drift 20% and still report green; that is
  not a visual gate. 0.05 is the AA-level value the plan specifies.
- Deliberately **not** loosened beyond the plan's `0.001` cap. A gate
  calibrated to hide its own noise cannot detect a real regression, and Task 5
  will plant a deliberate regression this gate must catch.

### Determinism proof of the gate itself

After recording, the suite was run **twice consecutively without
`--update-snapshots`**:

| run | result |
|---|---|
| clean run A | **30 passed** (2.4m) |
| clean run B | **30 passed** (2.4m) |

Plus, across calibration, 5 further full runs and 4 mobile-only runs — all
30/30 and 15/15 respectively.

### Open flake (one occurrence, not reproduced)

One full run early in Step 2 reported **15 failed (all mobile-chromium) /
15 passed (all desktop)** — a whole-project failure, not a per-shot drift. Its
diagnostics were not retained. It has **not** recurred in the 7 full runs and
4 mobile-only runs since, and it is not explained by the measured noise floor
(28 px is far below the configured tolerance and could not fail a shot).

Mitigation shipped rather than left to chance: `loadFrozen()` now asserts the
WebGL **context-loss fallback** (`[data-testid="fluid-waves-fallback"]`, the
gradient `div` that replaces the canvas when the GL context dies) is absent
before any screenshot. GPU context loss is the one mechanism that could fail an
entire project at once with clean-looking screenshots; if it recurs, the gate
now fails with a message naming the environment as the cause instead of
diffing a fallback gradient against 15 goldens and reading as
"the optimization broke everything".

**Standing instruction for Tasks 7–12:** if this gate ever goes red across a
whole project at once while individual re-runs pass, suspect the environment,
re-run before acting — but if it goes red on a SUBSET of shots, that is a real
visual regression and the batch is reverted. Goldens regenerate only on a
commit that declares visual intent; during the optimization campaign, never.

### Correction to the plan's stated mobile viewport

The plan quotes Pixel 5 as `393×851`. That is the device's **screen** size; its
**viewport** — what a screenshot actually captures — is `393×727`
(`devices['Pixel 5'].viewport`, verified directly). The spec's requested
`390×844` remains approximated by the existing Pixel 5 device; no new device
definition was added. `loadFrozen()` asserts the per-project viewport on every
shot, which is what surfaced the discrepancy.
