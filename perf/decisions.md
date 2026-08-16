# Perf campaign — decisions log

Append-only record of the hero perf campaign's measurements and keep/revert
calls. Every numeric claim made about this campaign traces to an entry here.

---

## 2026-08-16 · Task 2 · Pixel-gate tolerance calibration

**Gate:** `npx playwright test pixel-gate` — 30 goldens
(5 moments × 3 seeds × 2 Playwright projects), `tests/e2e/pixel-gate.spec.ts`.
No `--workers` flag needed; the config default is `workers: 1` and the spec
asserts it.

### Measured noise floor

To calibrate rather than guess, the suite was run at **absolute strictness**
(`threshold: 0`, `maxDiffPixelRatio: 0`) against the recorded goldens — i.e.
"any single pixel differing by any amount fails".

**Final measurement (post-review, with `stage-arrival` on its settle plateau):**

| result | count |
|---|---|
| byte-identical to golden | **29 / 30** |
| non-zero diff | **1 / 30** — 6 px = ratio **0.000021** |

Every `hero-top` and `mid-dissolve` shot, on both projects, is byte-identical
in every strict run measured here. The frozen WebGL frame is exactly
reproducible — proved independently by `perf-hooks.spec.ts`, which asserts
byte-equality of the raw canvas across reloads.

(Scope note: "byte-identical" describes the *steady-state* behaviour these
measurements characterise. It is not a claim that no shot has ever failed —
see "Open flake" below, a separate whole-project event with a different
mechanism, now guarded.)

**The one residual: `stage-arrival` on `mobile-chromium` rasterizes
non-deterministically**, varying by 6 px from identical inputs. Every observed
raster fell into one of **two** distinct images — but that is an n=2
observation, not a proof that only two states exist; treat "two" as the
observed range, not a guarantee. The flip is **per shot and independent**, not
per run: runs 1 and 2 below failed different subsets, so it is not one
run-level condition switching all three together.

Proof — three consecutive strict trio runs over the same three shots:

| strict trio run | 0p137 | 0p512 | 0p873 |
|---|---|---|---|
| 1 | ✘ | ✓ | ✘ |
| 2 | ✓ | ✘ | ✘ |
| 3 | ✓ | ✓ | ✓ |

A different subset each time, from identical inputs. Re-baking cannot fix this
— the golden simply captures whichever of the two rasters that run produced
(the 0p137 golden was force-re-baked twice and landed on the same raster both
times, while a comparison run produced the other).

**Correction to an earlier version of this entry.** The floor was originally
attributed to `scale: 'css'` downsampling at `deviceScaleFactor: 2.75` not
being bit-stable. **That explanation is wrong and has been retracted.** All 15
mobile shots take that identical resampling path and 14 are byte-identical in
the same run; a non-bit-stable resampler does not select one shot out of
fifteen. The residual is specific to the `stage-arrival` frame — the only shot
containing the card stack and the `GooeyTitle` SVG filter subtree.

> **Consequence for Tasks 7–12: mobile is NOT inherently noisy.** Do not wave
> off a mobile-only red on "resampling jitter". Outside `stage-arrival`, a
> mobile diff of even one pixel is signal. Inside `stage-arrival`, expect up to
> 6 px of bistability and nothing more.

#### What the 28px original floor actually was

The first calibration measured a 28 px floor, also on mobile `stage-arrival`.
That was **not** noise — it was the Critical defect fixed below: the shot was
baked 11.8% into the gooey title morph, sitting on a hard alpha-threshold
cliff. Moving it onto the settle plateau cut the floor 28 px → 6 px.

### Chosen tolerance

```ts
{ animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001, threshold: 0.05 }
```

- `maxDiffPixelRatio: 0.001` — **~48× the measured 0.000021 floor**. Headroom
  for the `stage-arrival` bistability, and nothing more: 0.001 of the smallest
  shot in the matrix is ~286 px, of the largest (1440×900) ~1296 px. A shader,
  layout, or colour regression touches orders of magnitude more than that.
- `threshold: 0.05` — per-pixel colour distance. Playwright's default of `0.2`
  would let every pixel on the page drift 20% and still report green; that is
  not a visual gate. 0.05 is the AA-level value the plan specifies.
- Deliberately **not** loosened beyond the plan's `0.001` cap. A gate
  calibrated to hide its own noise cannot detect a real regression, and Task 5
  will plant a deliberate regression this gate must catch.

### KNOWN BLIND SPOT — read this before Tasks 7/8

`threshold: 0.05` is a **per-pixel** colour distance, evaluated before
`maxDiffPixelRatio` is consulted. A change that shifts EVERY pixel by less than
that threshold passes the gate no matter how many pixels it touches — the ratio
never gets a chance to fire, because no pixel is counted as different in the
first place.

The realistic instance of this: a **shader precision downgrade**
(`highp` → `mediump` in `FluidWaves`), which is a plausible Task 7/8 move. It
would shift the whole paint by a small uniform amount and this gate would stay
green. Lowering `threshold` toward 0 is not the answer — `stage-arrival`'s
bistability would then fail permanently.

**If a batch touches shader precision or colour output format, it does not
inherit this gate's verdict.** It needs its own explicit check (e.g. sampling
raw canvas pixel values at fixed coordinates and comparing numerically, which
is immune to the per-pixel threshold).

### Defect found in review: `stage-arrival` was baked mid-morph

The first cut of the gate scrolled to **10%** of the stack wrapper's scroll
range. That is not the settle plateau the brief calls for, and the arithmetic
is unforgiving:

```
useScroll({ offset: ['start start', 'end end'] })   →  scrollYProgress = p
segmentFor(p, 4):  transitions = 3, raw = 3p        →  index 0, frac = 3p
settleFrac(frac) = smoothstep(clamp((frac-0.15)/0.7, 0, 1))
```

`settleFrac` is 0 only while `frac ≤ 0.15`, i.e. **p ≤ 0.05**. At p = 0.1:
`frac = 0.3` → `settleFrac = smoothstep(0.2143) ≈ 0.118` — **11.8% into the
morph**, where span 0 renders at blur ≈ 1.07 px / opacity 0.951 and span 1 at
blur ≈ 59.8 px / opacity 0.425. That composite then goes through
`GooeyTitle`'s `feColorMatrix` alpha row `255a − 170` — a hard binary threshold
at α ≈ 0.667. Every glyph edge pixel in those 6 goldens sat within one ULP of a
binary flip, which was visible in the goldens themselves as eaten/fattened
glyph edges.

Tasks 7–12 change GPU and compositor pressure by design. A perceptually-null
layerization change could flip a run of those threshold pixels and turn the
gate red on a non-regression — the exact false-positive class ruling R1 exists
to prevent, reintroduced at a different moment.

**Fix:** `0.1` → `0.04` (`STAGE_ARRIVAL_PROGRESS`). `frac = 0.12` →
`settleFrac = 0` → `segCont = 0`: span 0 at blur 0 / opacity 1, span 1 parked
at opacity 0, threshold filter a no-op on solid glyphs. Still strictly inside
the first card segment. Measured effect: strict-mode floor **28 px → 6 px**,
and the glyph edges render solid.

Only the 6 `stage-arrival` goldens were regenerated. The other 24 were
re-verified unchanged, not re-baked.

### Note: the seed axis is inert for `stage-arrival`

No hero canvas is in frame at that scroll position, so `?perf-seed` cannot
affect it. Confirmed by hash: the three desktop `stage-arrival` goldens are
byte-identical to each other. The effective matrix is therefore **26 unique
images across 30 goldens**. Kept as-is — the redundancy costs ~20 s per run and
keeps the matrix uniform.

### Determinism proof of the gate itself

After recording, the suite was run **twice consecutively without
`--update-snapshots`**:

| run | result |
|---|---|
| clean run A | **30 passed** (2.4m) |
| clean run B | **30 passed** (2.4m) |

Re-verified after the post-review fixes: **30 passed / 30 passed** again, two
consecutive runs. Across both calibration rounds the gate has now gone green on
9 full runs.

### Open flake (one occurrence, not reproduced)

One full run early in Step 2 reported **15 failed (all mobile-chromium) /
15 passed (all desktop)** — a whole-project failure, not a per-shot drift. Its
diagnostics were not retained. It has **not** recurred in the full runs and
mobile-only runs since, and it is **not** explained by the measured noise floor:
that floor is 6 px (ratio 0.000021), ~48× inside the configured tolerance, so
it cannot fail a shot at all — let alone fail fifteen at once.

Mitigation shipped rather than left to chance, in two parts:

1. **Context-loss guard.** The WebGL fallback
   (`[data-testid="fluid-waves-fallback"]`, the gradient `div` that replaces
   the canvas when the GL context dies) is asserted absent at load AND again
   immediately before every screenshot. GPU context loss is the one mechanism
   that could fail an entire project at once with clean-looking screenshots; it
   now fails with a message naming the environment as the cause instead of
   diffing a fallback gradient against 15 goldens and reading as "the
   optimization broke everything". It is an assertion, never a skip — it can
   only turn green into red.
2. **Workers guard.** `test.beforeAll` asserts `config.workers === 1`.
   Concurrent WebGL pages add GPU contention this gate's tolerance was never
   characterised under — precisely the condition suspected above — so it fails
   fast rather than producing an uncalibrated verdict.

   **The config default is now `workers: 1`** (`playwright.config.ts`, whose
   comment block is the authority and records both reasons: this gate's
   calibration, and the loader in-flight sampling problem that already drove
   4 → 2). The `beforeAll` assertion is therefore a **backstop**, not the
   mechanism — it catches an explicit `--workers` flag or a future config edit.

   **Task 6 needs no flag: a bare `npx playwright test` is correct.** Verified
   — bare full suite 92/92, bare `pixel-gate` 30/30.

   Note `test.describe.configure({ mode: 'serial' })` would NOT have been a
   substitute for either: it serializes within the describe while the two
   projects still run concurrently.

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
