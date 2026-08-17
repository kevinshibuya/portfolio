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

> **THE PIXEL GATE HAS TWO BLIND SPOTS, NOT ONE.** This section covers the
> per-pixel `threshold`. The second is **ruling R7 — the DPR/resolution blind
> spot** (this gate renders desktop at `deviceScaleFactor: 1`, where
> `FluidWaves`'s `DPR_CAP` of 1.5 never engages, while the perf harness measures
> at dSF 2 where it does). It is written up under
> *"2026-08-16 · Task 3 review · fixes + ruling R7"* further down this file.
> **Read both before trusting this gate on a Task 7/8 batch.**

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

---

## 2026-08-16 · Task 3 · Scenario runner (`perf/run.mjs`)

The Layer-2 runner: four scenarios, each reproducing one symptom Kevin
observed, reduced to a median + IQR + tolerance band over N runs on this rig.

### Sources chosen, and why (every number's provenance)

| quantity | source | recorded in report as |
|---|---|---|
| frame times | injected rAF ring buffer (init script, no app code) | `sources.frames` |
| long tasks | injected `PerformanceObserver({entryTypes:['longtask']})` | — |
| main-thread ms | CDP `Performance.getMetrics` deltas across the window | — |
| GPU cost | CDP tracing, GPU-process events | `sources.gpu` |
| presented frames | trace `viz SkiaOutputSurfaceImplOnGpu::SwapBuffers` | — |
| per-process CPU | CDP `SystemInfo.getProcessInfo` (`cpuTime`) | `sources.cpu` |
| energy | `sudo -n powermetrics`, else process CPU time | `sources.power` |
| entrance landmarks | MutationObserver on attributes the app already stamps | `sources.marks` |

**GPU ms/frame is the TRACE, not the `ps` fallback.** The brief allowed
degrading to GPU-process CPU time if trace GPU events proved unstable on this
rig. They did not. Measured, two back-to-back 10 s idle-hero windows:

| | run A | run B | spread |
|---|---|---|---|
| `gpu.busyMsPerFrame` | 1.707 | 1.685 | 1.3% |
| `gpu.webglMsPerFrame` | 0.593 | 0.578 | 2.5% |

Categories `['gpu','viz','toplevel']`. In the GPU process,
`ThreadControllerImpl::RunTask` is top-level and non-nesting, so summing those
durations is real busy time; `WebGL` is command-buffer decode — the shader's
own cost, which is the single most useful number for Tasks 7–12.

The fallback (`cdp:SystemInfo-gpu-process-cpu`) is implemented and fires
automatically if a run yields no GPU-process trace events, under a **different
`source` string** so no downstream reader can mistake one for the other.

**Tracing does not perturb what it shares a window with.** Frame times measured
with and without tracing live, same window:

| | frames | p50 | p95 |
|---|---|---|---|
| no trace | 601 | 16.70 | 17.50 |
| tracing | 600 | 16.70 | 17.50 |

Below the measurement's own resolution — so frame times and GPU cost share one
window instead of needing two passes.

**`battery-proxy` power source on this rig TODAY: the fallback.**
`sudo -n powermetrics` returns *"sudo: a password is required"* — the
passwordless grant Kevin decided on is **not yet in place**. Runs therefore
report `sources.power = "cdp:SystemInfo-process-cpu-time"`.

The process-CPU metrics (`cpu.rendererMsPerSec`, `cpu.gpuProcessMsPerSec`,
`cpu.browserMsPerSec`, `cpu.totalMsPerSec`) are collected on **every** run,
grant or no grant. That is deliberate: if the `power.*` watt metrics only
appeared the day the grant lands, the campaign's energy baseline would split
into two incomparable halves. When the grant lands, `power.cpuMw` /
`power.gpuMw` / `power.packageMw` appear *alongside* the CPU series, and the
`MISSING` warning path (below) covers the reverse direction.

### The sanity threshold — the actual rule

The spec: *"a run whose spread exceeds a sanity threshold is discarded and
rerun, never averaged in."* Implemented in `perf/lib/stats.mjs` as:

> With at least **4** completed runs, a run is discarded if ANY gating metric
> deviates from that metric's across-run median by more than
> `max(3 × IQR, 0.5 × |median|, 3 × minBand)`.

- **3 × IQR** is double Tukey's 1.5 fence — deliberately conservative. Trimming
  runs that merely sit at the edge of normal variance biases the median toward
  whatever the rig happened to be doing.
- **0.5 × |median|** and **3 × minBand** stop the rule firing on metrics whose
  IQR is near-zero by nature (`frame.p50Ms` is 16.7 on every run; a literal
  3 × IQR of 0 would discard every run that differs by a single tick).
- Informational metrics never gate. At most 3 replacement runs per scenario per
  invocation; if an outlier survives that, it is KEPT and flagged in the report
  rather than silently retried forever.
- **Below 4 runs the gate is inert and says so in the output.** An IQR over 2 or
  3 samples is not a spread estimate, and a gate computed from one is worse than
  no gate.

### `minBand` — the third band term, and why it was necessary

Band = `max(10% of median, 1 × IQR, minBand)`. The plan specifies the first two.
The third is not optional: count metrics (`frame.dropped`, `longTasks.count`)
sit at **0** on a healthy rig, where both the relative and IQR terms collapse to
zero and any single stray frame reads as an infinite regression. Each metric
declares its own absolute floor in its own units. Bands are written per metric
into `baseline.json` and may be overridden there by hand.

### THE WARM-UP RUN — measured, not assumed

**One run per scenario per invocation is executed, recorded, and never
aggregated.** This was not in the brief; it was forced by measurement.

`scroll-transition`, 2 counted runs, no warm-up:

| | run 1 | run 2 |
|---|---|---|
| `frame.maxMs` | **649.9** | 24.4 |
| `frame.dropped` | **38** | 0 |
| `frame.fps` | 48.4 | 60.1 |
| `gpu.busyMsPerFrame` | **8.04** | 2.62 |

All the cold cost — the server reading a just-written `dist/` off disk, the
first Chromium launch, a cold GPU shader cache — lands in run 1. Isolation
probes confirmed the stall is **not** the page: without a warm-up, replicating
the scenario by hand against an already-warm server showed a max frame of
18.6 ms and **zero** network requests during the window. It is also not the
tracing and not the settle poller (both A/B'd: max 18.7 ms either way).

Why this matters more than it looks: at n=5 a single cold run barely moves the
median, but it **massively inflates the IQR — and the IQR sets the band**. One
cold run would widen every tolerance band until real regressions fit inside
them, which is precisely the failure this harness exists to prevent.

With the warm-up in place, `scroll-transition` × 3:

| metric | values | IQR |
|---|---|---|
| `frame.maxMs` | 17.6 / 17.7 / 17.6 | **0.05** (was 312.75) |
| `frame.dropped` | 0 / 0 / 0 | 0 (was 19) |
| `gpu.busyMsPerFrame` | 2.44 / 2.20 / 2.68 | 0.24 (was 2.71) |

The warm-up's own metrics are kept in the report under `runner.warmup` — how
cold the first run was is evidence about the rig, not noise to hide.
`--no-warmup` exists for iteration only and says in the help that it inflates
the IQR.

### Known exclusion: the role cycle is pinned OFF

Every scenario loads with `?perf-seed=0.5&perf-role=0` and **no**
`?perf-freeze` (scenarios measure live animation; a frozen canvas draws exactly
one frame ever, which is the pixel gate's tool, not this one's).

`perf-role=0` pins the hero role line to the canonical title and stops the
every-5 s cycle. **The React/Framer cost of that swap is therefore deliberately
excluded from the `idle-hero` median.** It trades a sliver of realism for
determinism: an unpinned cycle would fire an unpredictable number of times
inside a 20 s window and land as pure variance in `main.scriptMsPerSec`. If a
future batch targets the role-swap cost specifically, it needs its own
scenario — this one is blind to it by construction.

### Known instrumentation effect: the rAF ring buffer

The injected frame-time loop keeps a rAF callback registered for the page's
whole life, so the browser produces animation frames even in moments the page
would otherwise go idle (notably after the Selected Work stage settles and the
hero canvas has paused off-screen). Frame **count** is therefore an
instrumentation floor, not the app's own.

Handled rather than hidden: frame-time percentiles still describe the cadence
the compositor achieved, and **GPU per-frame metrics divide by PRESENTED frames
from the trace, not by rAF ticks** — an empty rAF tick produces no damage and no
swap, so it cannot deflate them. Observed live: 160–177 rAF frames vs 118–128
presented frames across a scroll window.

### `entrance.loaderDoneMs` measures the GATE, not loader removal

`body[data-loader-state="done"]` has **two** writers that converge:
`useScrollLockDuringEntrance` flips it when `entranceDone` resolves (the ~92%
explosion handoff), and `main.tsx`'s `finishLoader()` flips it at 100%. The mark
catches the **first**, so this metric is "the entrance gate resolved". Measured
2516 ms against a computed handoff of ~2524 ms — an 8 ms agreement that confirms
the reading. It is a wall-clock landmark, not a jank measure.

### Server: `npx vite preview`, and the stale-listener trap is real

`npm run preview` is `npm run build && wrangler dev` **in this repo** — a
workerd server. Both perf layers pin `npx vite preview --port 4173 --strictPort`
so no baseline is ever a mix of two server stacks. `--strictPort` is not
cosmetic: without it vite silently walks to 4174 when 4173 is busy and every
scenario would load whatever stale thing still owns 4173.

**The stale listener needed escalating kills.** Encountered live: a leftover
`wrangler dev` from an earlier e2e run held 4173 and answered nothing
(`curl` timed out). Killing the `workerd` listener was **not enough** — the
wrangler supervisor respawned a fresh listener within a second. `freePort()`
therefore escalates one generation per round: round 1 kills the listeners,
round 2 their parents, round 3 the grandparents, with the runner's own process
ancestry excluded so it can never kill the shell that launched it. Three failed
rounds is a hard error, never a silent continue.

Also note `lsof -sTCP:LISTEN` is load-bearing — without it `lsof` returns
processes merely *connected* to the port, and a headless Chrome utility process
showed up as a "stale listener".

Every report records `build.serveCommand` and a **sha256 of `dist/index.html`**,
so no run is silently comparable to a stale or wrangler-served build. This is
what makes `--no-build` safe to offer.

### ⚠ `npm run perf` AND THE PLAYWRIGHT SUITE MUST NEVER RUN CONCURRENTLY

Confirmed the hard way during this task: a full e2e run launched while the perf
harness was live failed **21/92**; a quiet re-run with nothing else running came
back **92/92**.

Mechanism: the runner rebuilds `dist/` on every invocation and owns port 4173,
while `playwright.config.ts` sets `reuseExistingServer: true` locally. The suite
therefore screenshots a `dist/` being rewritten underneath it — and, since the
runner kills whatever holds 4173, can also lose its server mid-run.

**Standing instruction for Tasks 7–12,** whose batch procedure runs both: run
them **sequentially**, never in parallel, and never trust a red e2e or pixel-gate
result produced while a perf run was in flight. This is also the leading
explanation for the previously-unreproduced Task 2 flake in which all 15
mobile pixel-gate shots failed while all 15 desktop passed.

### Baseline writing — the three-writer contract

`--update-baseline` read-modify-writes **only** the `scenarios` key. Task 4's
flag owns `lighthouse`; Task 5 hand-fills `exact`. Unknown keys are preserved
verbatim.

`rig` is shared, so it is written under a stricter rule: **bootstrapped when
absent, left byte-for-byte alone when present and matching, and a mismatch
refuses the whole update** rather than rewriting another writer's rig block.
(Somebody has to stamp it, or Task 5's "all four top-level keys present and
non-empty" acceptance check can never pass.)

Only `median` / `iqr` / `band` are stored — per-run values stay in the reports.
The baseline is a contract, not an archive, and a hand-edited band must survive
being read back.

### A metric that vanishes is LOUD, not silent

If the baseline has a metric this run did not produce, the comparison prints
`MISSING`, lists it under `warnings`, and keeps it in the table. It is **not**
scored as a regression — the cause is a measurement gap, not a code change — but
it can never be silently dropped (spec: *"the harness never silently skips a
metric"*).

Regression is judged against the **baseline's** band, not the current run's: a
change that also widens the spread must not be able to widen its own acceptance
window.

### `--compare A B` (added beyond the brief)

The brief's acceptance check is *"two consecutive invocations produce reports
whose shared metrics agree within their own declared bands"*. Nothing in the
brief made that mechanical, so `node perf/run.mjs --compare a.json b.json`
does it: agree/DISAGREE per metric against the wider of the two bands, exit 1 on
any disagreement. Small addition, and it turns the acceptance check from a
hand-comparison into a command.

---

## 2026-08-16 · Task 3 review · fixes + ruling R7

Review of the Task 3 runner returned "Needs fixes": 2 Critical, 7 Important.
All disclosed deviations (warm-up run, `--compare`, dSF 2, `--strictPort`, the
`rig` write rule) were accepted on merit. What follows is what changed.

### RULING R7 — the pixel gate is blind to DPR/resolution changes

**Record it; do NOT re-bake the 30 goldens.** (Owner-level ruling, taken during
the Task 3 review.)

This harness measures at `deviceScaleFactor: 2` — where `FluidWaves`'s
`DPR_CAP` of 1.5 actually engages and the backing store is 1.5x, i.e. what a
retina visitor renders. The pixel gate's desktop project runs at
`deviceScaleFactor: 1`, where the cap never engages and the backing store is
1.0x. **The two layers therefore exercise different resolution paths.**

Consequence, identical in shape to the `threshold: 0.05` blind spot recorded
above: **a batch that touches `DPR_CAP`, backing-store sizing, or any
resolution scaling does NOT inherit the pixel gate's verdict.** The gate cannot
see the visual cost of a change it never renders. Such a batch must bring its
own visual evidence — e.g. capturing the canvas at dSF 2 and comparing
numerically — exactly as the shader-precision case must.

Not fixed by re-baking, because re-baking at dSF 2 would only move the blind
spot to dSF 1 and would invalidate 30 committed goldens for no net coverage.

### CRITICAL C1 — metrics could blend two measurement sources

`sources` was recorded once per scenario from the LAST run
(`kept.at(-1).sources`), and `aggregate()` took a median over whatever runs
produced a finite value with no record of how many. If the GPU trace failed on
runs 1-3 and succeeded on 4-5, `gpu.busyMsPerFrame` became a median blending
*GPU-process CPU ms* with *GPU busy ms* — different quantities — labelled with
whichever source ran last, and `gpu.webglMsPerFrame` was computed from 2 of 5
runs. `--update-baseline` then wrote both as plain `{median, iqr, band}`.

**Fix.** Metrics declare a `sourceKey`; `aggregate()` records per metric `n`,
`runsTotal`, the distinct `sources` of the CONTRIBUTING runs, and
`sourceConflict`. `provenanceWarnings()` surfaces both conditions, a blend
BLOCKS `--update-baseline`, and `--compare` reports `BLENDED SOURCES` /
`SOURCE A≠B` as disagreements.

Reproduced against the reviewer's exact scenario:

```
gpu.busyMsPerFrame:   median=9.1  n=5/5  sourceConflict=true
   sources=["cdp:SystemInfo-gpu-process-cpu","trace:gpu-process"]
gpu.webglMsPerFrame:  median=0.585 n=2/5 sourceConflict=false

  !! idle-hero.gpu.busyMsPerFrame: BLENDED SOURCES — contributing runs disagree
     (cdp:SystemInfo-gpu-process-cpu vs trace:gpu-process). These are different
     quantities; the median is not a measurement of either. Do not baseline it.
  !! idle-hero.gpu.webglMsPerFrame: median is over 2 of 5 kept runs — 3 run(s)
     did not produce this metric.
```

### CRITICAL C2 — a mid-window context loss read as a large improvement

The WebGL-fallback check ran only INSIDE `waitForSettledHero`, i.e. before the
window. Lose the hero context at t=10s of a 20s idle window and the gradient
fallback takes over, GPU work stops, `gpu.*` collapse, the run exits 0 printing
`improvement` — and under `--update-baseline` the collapsed numbers become the
reference, after which every healthy run reads as a permanent regression. In
Tasks 7-12 a shader batch that destabilised the context would have read as the
campaign's biggest win.

**Fix.** `assertPageHealthy()` re-asserts no fallback element, zero console
errors and zero page errors AFTER every measurement window, in all four
scenarios, and FAILS the run. Proven by forcing `WEBGL_lose_context`
mid-window:

```
pre-window health check: PASSED (page is healthy)
mid-window: context lost, fallback elements present = 1
post-window health check: THREW, as required
  hero WebGL context was lost during the idle-hero measurement window (the
  gradient fallback is showing). GPU metrics from this run would read as a
  large improvement and are discarded. This is an environment/stability
  failure, not a performance result.
```

### I3 — the nominal frame interval is now a property of the RIG

`snapNominal` inferred the nominal interval from the measured window's own
fastest decile. A regression pushing every frame past 25ms would snap the
nominal to 33.33ms (30Hz) and report **zero** dropped frames: the worse the
page got, the healthier it looked. `frame.nominalMs` was also `informational`
(so it could never regress) and absent entirely from two scenarios.

**Fix.** `collectRig()` measures the display's real cadence on a blank page
once per invocation (`rig.refreshHz` 60, `rig.nominalFrameMs` 16.6667) and
pins it for every scenario. `frame.nominalMs` is now a GATING metric in all
four, and `refreshHz` joined `RIG_KEYS`.

### I4 — `--update-baseline` could ratchet a regression in, or delete metrics

It updated unconditionally on rig match — including when the run REGRESSED —
and replaced each per-scenario metric map wholesale, so one lapsed sudo grant
or one failed trace silently DELETED `power.*` / `gpu.webglMsPerFrame` from the
baseline. The `MISSING` machinery only fires on the read side, so a deleted key
stops being missing and simply stops being checked.

**Fix.** Refuses when regressions > 0, an outlier was kept, a source blended, or
the frame buffer overflowed — `--force` for a deliberate re-record. Per-scenario
maps MERGE; keys the run did not produce are retained and reported.

```
EXIT CODE: 2
REFUSING --update-baseline: this run is not a clean reference.
  - it contains REGRESSIONS; baselining them makes them permanent and undetectable
Fix the regression, or re-run to confirm, or pass --force if you deliberately intend
this to become the new reference.

# and with --force, a metric this run could not produce:
  !! 1 baseline metric(s) were NOT produced by this run and were RETAINED, not deleted:
  !!   idle-hero.power.packageMw
```

### I5 — rig checking silently disabled itself on a partial rig block

`rigMismatches` skipped any key the baseline lacked, and the bootstrap tested
`!next.rig` — but `{}` is truthy. Since **Task 5 hand-fills `baseline.json`**, a
written `"rig": {}` or an omitted `chrome` would have disabled rig checking
forever while every run went on claiming apples-to-apples.

**Fix.** A missing `RIG_KEYS` entry inside a PRESENT rig block is reported as a
mismatch (`baseline: "(missing from baseline rig block)"`); bootstrap is
per-KEY. Observed filling all of `chrome, macos, arch, cpu, displayScale,
refreshHz, nominalFrameMs, acPower, recordedAt` into an empty block.

The rig guard also fired for real mid-review when the laptop was plugged back
into AC between recording and comparing:
`REFUSING --update-baseline: ... Mismatched: acPower.`

### I6 — `freePort` could have SIGKILLed the user's shell

Round 3 killed the grandparent of any listener on 4173 with no command filter
and no SIGTERM first. Another terminal running `npm run dev -- --port 4173`
is `zsh → npm → node vite`; round 3 would have killed that **zsh** and
everything else in that terminal.

**Fix.** Three guards: our own ancestry is never a target (unchanged); no
shell/login/tmux process is ever a target at any round; escalation rounds only
target recognisable server supervisors (`vite|wrangler|workerd|miniflare|npm|
npx|pnpm|yarn|serve|http-server`). SIGTERM first, SIGKILL only if still alive.

### I8 — bands now have a hand-settable ceiling

The formula `max(10% of median, IQR, minBand)` has a floor but no CEILING, so a
`frame.fps` of 60 tolerated a drop to 54 and a 9% GPU regression passed. The
default formula is plan-mandated and was NOT changed; instead the plan's "bands
... overridable there" is now real. Two optional per-metric keys in
`baseline.json` survive the round trip and are applied on update:

```
"bandAbsolute": n   pin the band to exactly n
"maxBand": n        cap the formula's output at n
```

Verified: with `maxBand: 0.02` the recomputed band stayed `0.02` where the
formula would have produced `0.1236`, and a +21.6% move was correctly flagged
REGRESSION against it.

### I9 — the outlier gate no longer gates on tail metrics

It evaluated every non-informational metric, including `frame.maxMs`,
`frame.dropped` and `longTasks.*` — metrics whose entire purpose is catching
rare bad events. It was observed live discarding an idle-hero run for
`frame.maxMs = 133.2`, which is a real 133ms stall on an idle page (GC, shader
recompile, compositor hitch), not an environmental fault. Gating on the tail
biases the whole harness optimistic.

**Fix.** Only central-tendency metrics gate (`gates !== false`): `p50`, `fps`,
`*MsPerSec`, `gpu.*PerFrame`, `heapUsedMb`, the entrance landmarks. Tail and
count metrics ride into the median untouched. The 3xIQR threshold,
`MIN_RUNS_FOR_OUTLIER = 4` and `MAX_REPLACEMENTS = 3` are unchanged.

### Minors fixed

- `--compare` iterates the UNION of both reports' metrics (it could previously
  pass while B silently lost a metric) and compares rig blocks.
- GPU per-second rates divide by the TRACE's own duration, not the shorter
  metric window it brackets — the old form inflated them, visible as a
  `presentedFps` of 60.05 on a 60Hz display (now ~60.01).
- `load.main.*` counters are read AT settle, so the window matches its comment
  (`[commit, settled]`, not `[commit, settled + 1500ms]`).
- `waitForScrollSettle` waits on an in-page predicate fed by a passive scroll
  listener, instead of ~30 `page.evaluate` round trips inside the very window
  whose `main.taskMsPerSec` they contributed to.
- Intel `package power` is parsed as WATTS and scaled to mW (dormant on Apple
  Silicon, but the field is named `packageMw`).
- `powermetrics` runs as root, so `process.kill` EPERMs silently; teardown now
  also asks `sudo -n kill`. It is bounded by `-n <samples>` regardless.
- `--help` goes to stdout; errors stay on stderr.
- `frameBufferOverflowed` is surfaced as a warning and blocks a baseline update.
- Removed unused `layoutsPerSec` / `recalcStylesPerSec`.

### Minor NOT fixed, and why

`STAGE_ARRIVAL_PROGRESS`, the 4-card assertion and the geometry derivation exist
verbatim in both `tests/e2e/pixel-gate.spec.ts` and `scroll-transition.mjs`, and
a shared constant would be the right call. **Not done: `tests/` is outside Task
3's Files list**, and the shared module would have to be imported by a Task 2
file. Flagged for whoever owns the next change to either file — the coupling is
documented in both places, but documentation is not a guard.

---

## 2026-08-16 · Task 3 re-review · ruling R9 (final round)

Re-review passed all earlier fixes. R9 closed four residual Minors that bite in
Tasks 5–6 rather than "some day".

### 1. A health failure is now DISCARDED AND RERUN, not an invocation abort

`assertPageHealthy` threw and nothing caught it, so a real GPU context loss in
run 4 of `all --runs 5` discarded every remaining scenario and ~20 minutes of
wall clock. The spec's own idiom for a bad run is "discarded and rerun, never
averaged in", so a health failure now spends from the SAME `MAX_REPLACEMENTS`
budget as a statistical outlier.

**The C2 guarantee is unchanged, and the budget is what preserves it:** a
PERSISTENT health failure exhausts the replacements and rethrows, so the
invocation still fails loudly. What can never happen — before or after this
change — is a number being produced from an unhealthy run.

Health failures carry their own error type (`MeasurementHealthError`). Only
those are retried. A DETERMINISTIC scenario bug (missing selector, changed card
count, absent entrance landmark) rethrows on first occurrence: retrying it three
times only hides the cause and burns the budget on an outcome that cannot
change. Proven on all three paths — transient (2 failures → discarded, rerun,
median produced, invocation continued), persistent (budget exhausted → threw),
deterministic (threw after 1 call, not 4).

A health discard is surfaced as a report warning even when replacement
succeeded: the kept runs are clean, but "the page needed 2 attempts" is a fact
about rig stability that Task 5 should see.

### 2. Console errors are scoped and classified

Previously ANY console error from navigation onward failed the run, so one
transient resource 404 would fail every run of every scenario — which, combined
with (1), was the campaign-stall path.

Now: errors are tagged `console` vs `pageerror`; `waitForSettledHero` records a
checkpoint so the post-window check judges only what happened AFTER it; and a
narrow allowlist (failed subresource loads only) treats content problems as
non-fatal. **`pageerror` — an uncaught JS exception — is never allowlisted**,
because it means the app took a code path it does not take in a healthy run.
Allowlisted entries are logged every time, and every fatal error prints its own
text before the throw, so no failure is undiagnosable.

### 3. Band overrides are honoured on READ, not only on write

`compare()` used `baseline.band` verbatim, so hand-adding `"maxBand": 0.02` to a
metric whose stored band was `0.1236` did nothing until someone remembered to
re-record — and Task 6's job is exactly that hand-edit. `applyBandOverrides` now
runs in `compare()`. Proven with a discriminating pair against one baseline:

| | delta | band in force | verdict | exit |
|---|---|---|---|---|
| stored band `0.5`, no override | +0.1385 (+8.68%) | 0.5 | within-band | 0 |
| same baseline + `"maxBand": 0.02` | +0.0658 (+4.12%) | 0.02 | **REGRESSION** | 1 |

Note the second run's delta is SMALLER and it correctly fails: the override, not
the magnitude, is what changed.

### 4. An empty rig block is now loud

`"rig": {}` made `rigMismatches` return `[]` (the bootstrap carve-out) and
nothing printed. Task 5 hand-fills this file, so the silence landed exactly
where it does most damage. The carve-out is kept; the silence is gone:

```
  !! baseline has no rig block — comparisons below are UNVERIFIED against this rig.
  !! Nothing checks Chrome version, display scale, refresh rate or AC power until it is filled in.
  !! Run with --update-baseline to stamp it, or hand-fill it before trusting any verdict.
```

### ⚠ OPERATIONAL FINDING FOR TASK 5 — the rig must be QUIESCED, and n=2 is fragile

While producing R9's covering evidence, two consecutive `idle-hero --runs 2`
invocations DISAGREED on the GPU metrics — and the harness said so rather than
reporting false agreement. Cause found by inspection, not guesswork:

```
 78.4 fseventsd
 65.0 legacyScreenSaver        <- the screensaver had kicked in
 19.6 WindowServer
 12.9 com.docker.backend
      load averages: 6.02 7.26 6.87
```

**`legacyScreenSaver` was burning 65–82% CPU on the measurement rig.** With it
stopped (load average 6.0 → 2.5), a **`--runs 5` pair agreed on all 17
metrics**, `COMPARE_EXIT=0`.

Two things follow, both of which matter for Task 5's baseline:

1. **Record the baseline on a quiesced machine.** No screensaver, and ideally no
   Docker / Spotify / Discord / VMs. A baseline recorded under 65% background
   CPU is junk, and every keep-or-revert decision in Tasks 7–12 inherits it.
   Nothing in the harness currently checks this — the rig block records AC power
   but not machine load. **Recommended (NOT implemented, out of R9 scope): a
   load-average / top-process guard at invocation start that warns, and refuses
   `--update-baseline`, when the rig is busy.** Worth deciding before Task 5.
2. **`--runs 2` is fragile by construction and is not the campaign's mode.** At
   n=2 the IQR is `0.5 × |a − b|`, which systematically UNDERestimates spread, so
   the band is too tight and a noisy rig produces spurious disagreement. At the
   default n=5 the IQR is a real estimate and the band widens honestly. The
   brief's acceptance check uses `--runs 2` and passes on a quiet machine, but
   **`--runs 5` is what the campaign runs and what should be trusted.**

Even on a quiet-ish rig, a same-machine `--runs 2` pair disagreed on
`gpu.busyMsPerFrame` in BOTH directions across attempts (A>B, then B>A), which
is the signature of sampling noise rather than drift — exactly what the n=5
median exists to remove.

### Deferred by ruling (not fixed, deliberately)

`--force` writing a blended metric with no `sourceConflict` marker in
`baseline.json`, and per-run `sources` not being stored in `perRunMeta`. Both
are diagnostics reachable only via `--force`.

---

## 2026-08-17 · Task 3 round-3 · two retry-path Importants + ruling R10

The R9 retry path fixed an abort problem and opened a reporting one. Both
Importants below are consequences of that, and both are now closed.

### Important 1 — a health-discarded run set is no longer "clean"

Making health failures retryable removed the *downstream* consequence, not the
core invariant. `kept.push` was still unreachable from the catch, so no
aggregated number ever came from an unhealthy run — but with `--runs 5` against
a batch that destabilises the context ~25-30% of the time: run 2 fails →
replaced, run 5 fails → replaced, five healthy samples collected, `compare()`
sees only healthy medians, `exitCode` stays 0, the run prints
**`result: no regressions`**, and the discards sat in `comparison.warnings`
rather than `blockingWarnings` — so `--update-baseline` wrote a baseline from a
run set that had page failures. Before R9 that was structurally impossible,
because the invocation died.

**Fix.** `healthBlocker()` (exported, hence testable) produces the blocker; it
now reaches BOTH `exitCode = 1` and `blockingWarnings`, so such a run can
neither print "no regressions" nor be baselined without `--force`.

The wording changed too. It used to say the page "is not stable on this rig
right now", which blames the machine — the wrong default for a harness whose
entire job is attributing movement to the diff. It now says the build under
test may be destabilising the GPU, and to investigate.

### Important 2 — `context-loss` and `page-error` are no longer the same thing

`assertPageHealthy` threw one retryable type for both, while the comment right
above it argued that a `pageerror` "means the app took a code path it does not
take in a healthy run" — a statement about the CODE. Under the R9 retry path
that meant a Task 8 batch whose rAF callback throws on ~1 frame in 5000 would
be retried away and kept.

**Fix.** `MeasurementHealthError` carries `kind`:

| kind | what it is | retried? |
|---|---|---|
| `context-loss` | the GPU dropped the WebGL context — a rig/driver property | **yes**, bounded by `MAX_REPLACEMENTS` |
| `page-error` | an uncaught JS exception — a code property | **no**, fails on the first occurrence |

### RULING R10 — the load guard (`perf/lib/load.mjs`)

Ruled IN after being declined as out-of-scope last round. Task 5 records the one
committed baseline all six batches are judged against; taken on a loaded rig it
is inflated, and every later batch then reads as an improvement — corruption of
the whole campaign in the direction that looks like success.

**Thresholds, chosen from measurements taken during this task, not from feel:**

| state observed | 1-min load | /8 cores | hottest process |
|---|---|---|---|
| screensaver contamination (invocations DISAGREED) | 6.02 | 0.75 | 65-82% |
| independent check, same session | 4.51 | 0.56 | `fseventsd` 68% |
| another spike, same session | 4.02 | 0.50 | `coreduetd` 82% |
| quiesced — n=5 pair AGREED 17/17 | 2.49 | 0.31 | 13.7% |

- **`HOT_PROCESS_PCT = 50`** is the rule that does the real work: every observed
  contamination showed ONE process above 60% of a core, while the clean state's
  hottest was 13.7%. 50 sits in the gap with room either side.
- **`LOAD_PER_CORE = 0.7`** is the coarse backstop for diffuse load no single
  process accounts for. Deliberately not tighter — a normally-busy Mac (editor,
  Spotify, Docker, chat) sits around 0.3-0.55 and must still be able to record a
  baseline, per the ruling.

Confirmed empirically that the two rules have different jobs: with four CPU
burners started 6 s earlier the 1-min load average had barely moved
(0.361 → 0.372, it is a decaying average) while the hot-process rule fired
immediately at 100%.

Behaviour: **warn always** (the load line prints on every invocation, busy or
not, with the top three processes named), and **refuse `--update-baseline`** on
a busy rig, `--force` as the escape hatch — the same shape already used for
regressions, flagged outliers and blended sources. The observed load is recorded
in every report JSON under `machineLoad`.

**Known limit, stated rather than hidden:** the screensaver's real damage was GPU
contention, and neither threshold measures the GPU. It was caught because it was
also CPU-hot. A purely GPU-hot neighbour would still slip through — which is why
the top processes are always PRINTED, not merely thresholded.

### Minors closed

- **Pre-settle context loss no longer aborts the invocation.** `FluidWaves`
  *replaces* the canvas with the fallback div on context loss, so
  `waitForSelector('[data-canvas="fluid-waves"]')` never resolved — it threw a
  Playwright `TimeoutError` carrying no `isHealthFailure` after 30 s, turning a
  plausible cold-GPU-shader-compile hiccup at load into a hard abort. The two
  selectors are now raced and a fallback win throws a retryable
  `context-loss`.
- **The exhaustion message counted the wrong thing.** `replacements + 1` is the
  total replacement count, so after two outlier discards plus two health
  failures it claimed "failed its health check on 4 runs". A separate
  `healthFailures` counter now feeds the message; the budget stays shared.
- **`REPORT_VERSION` → 2.** `perRunMeta[].consoleErrors` changed from `string[]`
  to `{kind, text}[]` and reports gained `machineLoad`; a v1 consumer would
  render `[object Object]`.
- **`perf/selftest-retry.mjs` is committed.** The retry path is the riskiest
  logic in the harness — the one place a failed run can be made to disappear —
  and it had no reproducible test, only deleted scratch scripts. 12 assertions,
  no browser, no port, no build. `healthBlocker` and `baselineRefusal` were
  extracted from `main()` and exported precisely so the gates are assertable
  rather than only reachable through a full invocation.

### Left alone by ruling

The `emptyDelta`/`MISSING` rows showing the raw stored band, the broad
`/net::ERR_/i` allowlist pattern, the back-compat page-vs-session branch, the
symlink-fragile main guard, `--force` writing a blended metric without a
`sourceConflict` marker, and per-run `sources` not being stored in `perRunMeta`.

---

## 2026-08-17 · Task 3 round-4 · load-guard onset + classification precision

### IMPORTANT — the load guard now samples at BOTH ends

R10 as originally ruled had a hole shaped like the incident that motivated it.
The guard sampled once, before the first browser launch, so `machineLoad`
described the machine at t=0 for every scenario in an ~20-minute
`all --runs 5` invocation *and* for the baseline write at the end. The
motivating incident was `legacyScreenSaver` starting **mid-evidence** — exactly
the onset a pre-run sample cannot see. An operator could quiesce the machine,
start `--update-baseline`, walk away, and get a contaminated baseline written
under a clean-looking load block stamped minutes before any measurement in it.

**Fix.** A second `ps` sample after the last scenario (no browser),
`combineMachineLoad(before, after)` with `busy = before.busy || after.busy`
feeding `baselineRefusal`, both samples recorded as `machineLoad.before` /
`machineLoad.after`, and every reason labelled `at start:` / `at end:` so a
mid-run onset is attributable rather than averaged away. Reports already written
are backfilled with the after-sample, so a report can never vouch for a window
using load data stamped before that window existed.

### Why `LOAD_PER_CORE` did NOT move, despite looking wrong

Review observed that `0.7` sits above two of the three contaminated states
(0.56, 0.50) and only 0.17 above the quiesced runs (0.53) — i.e. the
load-average rule is close to decorative and `HOT_PROCESS_PCT` carries the guard
alone. That is correct, and moving the number does not fix it, because **the two
populations overlap on this axis**:

| | readings (1-min load / core) |
|---|---|
| contaminated | 0.50, 0.56, 0.75 |
| clean | 0.31, 0.53 |

> **Provenance for every row is in the threshold block at the top of
> `perf/lib/load.mjs`**, which is the canonical evidence table. It was added in
> round 5 after review correctly pointed out that the 0.50 and 0.53 readings —
> the two the overlap argument actually rests on — appeared in no table, which
> is the same "reconstructed numbers" objection applied inconsistently to my own
> reasoning. Both are real recorded readings (0.50 = the `coreduetd` 81.7%
> spike; 0.53 = the two `--runs 5` invocations that agreed 17/17), and they are
> now written down.

A contaminated rig measured **lower** (0.50) than a clean one (0.53). No
threshold on 1-min load average separates them. Lowering to 0.6 would not have
caught the 0.50 or 0.56 cases — both of which `HOT_PROCESS_PCT` caught on its
own, at 82% and 68% — while bringing the limit within 0.07 of a normal working
machine, which the ruling explicitly forbids.

The decision stands on an independent ground too, which does not depend on the
overlap at all: the load-average rule is **unnecessary**, because all three
contaminated states were caught by `HOT_PROCESS_PCT` alone (82%, 68%, 65%).

So the honest position is not a better number but a corrected framing: **this
rule cannot do this job.** It stays as a catastrophic-load backstop; the
hot-process rule is the guard. Two consequences are therefore load-bearing
rather than incidental:

- **`ps` failure is blindness, not degradation.** `psTable()` is built on
  `run()`, which never throws, so a failed `ps` returned an empty table →
  no hot processes → the primary rule silently retired while `busy` rested on
  the rule that cannot discriminate. The printed line said nothing, which reads
  as "nothing notable". It now prints `top: UNAVAILABLE (ps returned nothing)`,
  sets `detectorBlind`, and counts as a reason — so a blind guard refuses a
  baseline write rather than waving one through.
- **`foreignCpuPctOfMachine` is now recorded on every run.** It is printed and
  stored but deliberately **not** thresholded.

  > **Canonical figure and reasoning live in ONE place: the threshold block at
  > the top of `perf/lib/load.mjs`.** Do not restate the range here or anywhere
  > else — Tasks 7-12 will calibrate off whichever copy they read first, so
  > there is deliberately only one. Summary: a contaminated range is measured,
  > no quiet-rig measurement of this field exists yet, and `ps pcpu` is a
  > lifetime-decaying average — so it stays an observable until Task 5/6 have
  > collected real data on both populations.

### Health classification is now per-entry, and collects both facts

Two precision defects, both in `assertPageHealthy`:

1. **`page-error` was applied to fatal *console* errors**, not just uncaught
   exceptions, so the thrown message asserted "an uncaught page error is a
   statement about the CODE" over what might be a bare `console.error`. Worse:
   a WebGL context loss emits a GL console error *before* React re-renders the
   fallback div, so a single DOM sample in that gap classified a genuinely
   transient loss as non-retryable and hard-aborted the invocation. The kind is
   now derived per entry (`pageerror` present → `page-error`, else
   `console-error`), and a `GL_CONTEXT_LOSS_PATTERN` match re-checks the
   fallback locator after a short settle before classifying — so the race is
   closed from both directions.
2. **Fallback-present short-circuited before page errors were read**, so a run
   that both threw and lost its context reported only the context loss and the
   exception vanished. Both facts are now gathered first; the error is still
   classified `context-loss` (retryable, and Important 1's gate blocks the
   baseline either way) but the message carries the uncaught errors too.

### Minors closed

- `shortName` split on the first space, so
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` printed as
  "Google". Since the printed top-3 list is the guard's only stated defence
  against its disclosed GPU blind spot, a mangled name weakened exactly the
  fallback the design leans on. It now cuts at the first argument flag (which
  preserves paths containing spaces) and takes the last path segment.
- `npm run perf:selftest` added — the durable guard for the riskiest logic in
  the harness previously ran only if someone remembered it existed.
- The refusal wrapper said "the rig was BUSY when this run started"; it now says
  "during this run", since each reason carries its own start/end label.

### Left alone, per ruling

Double-counting of uncaught exceptions between `page.on('pageerror')` and
`window.__PERF__.errors`; a warm-up health failure being swallowed into
`warmupResult`; `--force` writing `baseline.json` with no busy-rig marker in the
file; and the two `ps -A` calls per invocation.

---

## 2026-08-17 · Task 3 round-5 (final) · guard the guard

Task 3's last round. Three items, all small.

### (a) R10's WIRING is now guarded, not just its combiner

`baselineRefusal` gated on `machineLoad.busy` alone, and
`combineMachineLoad(before, undefined)` returns `after: null` with a
before-only verdict and no complaint. So deleting `sampleMachineLoad('after')`
from `run.mjs` would have silently restored the exact t=0-only hole round 4
closed — and, tellingly, **none of round 4's four new selftest assertions would
have failed**, because they drove `combineMachineLoad` directly with hand-built
samples. They proved the combiner, not the wiring.

**Fix.** A missing after-sample is now itself a refusal reason, so that refactor
fails loudly (every baseline update refused) instead of quietly. The selftest
asserts it directly.

Fixing this also exposed that several older selftest fixtures passed bare
`{ busy: false }` stubs with no `after` key — unrealistic inputs that a real
`combineMachineLoad` never produces. One of them started failing against the new
guard, correctly. All fixtures now go through `combineMachineLoad`.

### (b) The GL pattern had re-opened a decided question

`GL_CONTEXT_LOSS_PATTERN` was ORed over **all** fatal entries regardless of
kind, so an uncaught `pageerror` whose message merely CONTAINED "context lost"
took the retryable branch that round 2's Important 2 deliberately closed to
`pageerror`. Blast radius was bounded — `healthBlocker` still forces
`exitCode = 1` and refuses the baseline, so nothing could be retried away and
baselined — but it burnt replacement budget and mislabelled a code fault as a
rig fault.

**The classification order is now explicit, and asserted:**

| condition | kind | retried? |
|---|---|---|
| fallback present in the DOM | `context-loss` | yes — the DOM is authoritative |
| no fallback, page THREW | `page-error` | **no**, even if the text says "context lost" |
| no fallback, didn't throw, CONSOLE said context lost | `context-loss` | yes — the real 400 ms race |
| other fatal console error | `console-error` | no |

### (c) One number, stated once

The same evidence had drifted into three inconsistent statements
(`~26-57%`, `roughly 20%`, `~26-67%`) across two files — in the file whose whole
purpose is preserving calibration evidence, which Tasks 7-12 will read.

**The canonical figure and its reasoning now live in exactly one place: the
threshold block at the top of `perf/lib/load.mjs`.** Everywhere else cites it
and deliberately does not restate it.

### The `LOAD_PER_CORE` argument now rests on written-down numbers

Review landed a fair hit: the overlap argument rested on two readings
(contaminated 0.50, clean 0.53) that appeared in **no** evidence table — the
same "reconstructed numbers" objection I had correctly applied to
`foreignCpuPctOfMachine`, applied inconsistently to my own reasoning.

Both are real recorded readings and are now in the canonical table with
provenance: **0.50** is the `coreduetd` 81.7% spike from the round-3 calibration
probe; **0.53** is the two `--runs 5` invocations that agreed 17/17. The table
also now carries the round-4 gaming-session rows and marks which rows predate
`foreignCpuPctOfMachine` existing.

**The threshold still does not move**, and it now rests on two independent
grounds rather than one: the rule is *unnecessary* (all three contaminated
states were caught by `HOT_PROCESS_PCT` alone at 82/68/65%), and it *cannot be
made sufficient* (0.50 contaminated vs 0.53 clean cannot be separated, and 0.6
would sit 0.07 from a normal working Mac).

### Verification note

The optional `idle-hero --runs 2` was **skipped**: the rig was still contended
by the owner's own use (1.36/core, `fseventsd` 78%, League client 67%) and the
instruction was not to fight the machine for it.

Correctness of the round's riskiest edit is covered without a browser instead:
the classification table is asserted through a stubbed page object, including
that a **healthy** page throws nothing, which is the property a broken guard
would have violated on every run. Selftest: **26/26**.

### Left alone, per ruling

`shortName`'s flagless-path-argument regression
(`/usr/bin/foo /path/config.json` → `config.json`), the abort-path report shape,
the `detectorBlind`-only banner wording, and `combineMachineLoad` not surfacing
`detectorBlind` at the combined level.

---

## 2026-08-17 · Task 4 · Lighthouse bench (`perf/lighthouse.mjs`)

Layer 3 of the three-layer system: whole-page Lighthouse scores against the
same `npx vite preview` server, rig stamp, band arithmetic and R10 load guard
Layer 2 uses. `npm run perf:lh`.

### Invocation and pinning

**Node API, not the CLI.** Tasks 7-12 compare a number taken today against a
baseline taken weeks earlier, so the only thing that must not drift is the
measurement CONFIGURATION. The CLI expresses config as argv layered on that
binary's defaults, and `npx lighthouse` can resolve a different version than
package-lock pins. The Node API takes a config object that is checked in,
diffable in review, and recorded verbatim in every report JSON.

**Every throttling/emulation number is written out LITERALLY** in
`perf/lighthouse.mjs` rather than imported from
`lighthouse/core/config/constants.js`. Those constants are Lighthouse's own and
they move across majors (mobile throttling, screen metrics and the emulated UA
have all changed before). Imported, an `npm update lighthouse` would silently
redefine the bench; every metric would step, with no diff to explain it, and
the campaign would attribute the step to whichever batch was in flight.
Transcribed from **Lighthouse 12.8.2** — the stock mobile/desktop presets, so
the score still means what the outside world means by it. `PINNED_LIGHTHOUSE_VERSION`
records the pin and the run warns loudly if the installed version drifts off it.

The Chrome flag vector is pinned the same way and for the same reason
(`ignoreDefaultFlags: true` + chrome-launcher 1.2.1's `defaultFlags()`
transcribed — no additions beyond a `--window-size`. Layer 2's three
anti-backgrounding flags are already in chrome-launcher's defaults, so both
layers get that protection without this file adding it.)

| choice | value | why |
|---|---|---|
| throttling method | `simulate` (Lantern) | far tighter run-to-run spread than `devtools`; a band wide enough to swallow a regression is worse than no bench. Also what PSI reports. |
| presets | desktopDense4G / mobileSlow4G, stock | comparable to any other Lighthouse run of this site |
| categories | `performance` only | the other categories add runtime and variance for metrics this campaign does not judge |
| storage | cleared per run incl. `shader_cache` | on a WebGL-LCP page a warm shader cache measures the fifth visit, not the first |
| browser | **headed**, Playwright's Chromium binary | Layer 2 runs headed for the real GPU. A headless Layer 3 could fall back to SwiftShader on the very canvas this campaign is about, and the two layers' LCP/TBT would be numbers about two different renderers while looking comparable in a table. Using Playwright's binary also means `rig.chrome` describes the browser that actually ran. |
| URL | `/?perf-seed=0.5&perf-role=0` | the same URL Layer 2 loads. Both knobs only remove entropy (shader scatter, hero role index); neither disables work or takes a non-shipping branch. **Same URL is not the same raster load — see below.** |

### The two layers do NOT grade the same raster load

Same URL, same build, same server — different number of fragments, because the
device pixel ratio differs and `FluidWaves` caps its backing store at
`min(dpr, 1.5)`:

| | viewport | dSF | backing store | fragments |
|---|---|---|---|---|
| Layer 2 (`lib/browser.mjs`) | 1440x900 | 2 (cap engages at 1.5) | 2160x1350 | ~2.92M |
| Layer 3 desktop preset | 1350x940 | 1 (cap never engages) | 1350x940 | ~1.27M |
| Layer 3 mobile preset | 412x823 | 1.75 (cap engages at 1.5) | 618x1234 | ~0.76M |

Layer 3 desktop therefore shades roughly **2.3x fewer fragments** than Layer 2.

Both choices are deliberate and neither should be changed. Layer 2 picks dSF 2
because the symptom it reproduces — heat, fans, battery — is fragment-bound and
the retina display is what produces it. Layer 3 keeps the STOCK presets because
their entire value is external comparability; bending them to match Layer 2
would forfeit that and measure nothing Layer 2 does not already cover.

**The consequence Tasks 7-12 must plan for: on fragment-bound work the two
layers are not expected to track.** A batch that halves fragment cost should
move Layer 2's GPU metrics hard and barely register in the Lighthouse score.
That is the instrument, not a disagreement between the layers and not noise — do
not read a flat Layer 3 as evidence against a real Layer 2 win, and do not read
it as a reason to re-tune the presets.

### Metrics

Required five plus three informational: `lh.performance` (0-100, the harness's
only **higher-is-better** metric), `lh.lcpMs`, `lh.tbtMs`, `lh.cls`,
`lh.transferBytes`, and informational `lh.fcpMs`, `lh.speedIndexMs`,
`lh.runMs`. Band semantics are Layer 2's exactly: `max(10% of median, 1 x IQR,
minBand)`.

**Never silently skipped.** Any metric Lighthouse cannot produce is returned
from `extractMetrics` with its REASON, and that reason lands in the report's
`unavailableMetrics`, in the printed warnings, and in the `--update-baseline`
gate. The quiet failure this prevents: an errored audit leaves nothing to
aggregate, `compare()` then has no current value, and the metric drops out of
the table — a budget that stops existing rather than failing.

`lh.transferBytes` has two possible providers (`total-byte-weight`, falling
back to `resource-summary`) which measure subtly different things, so it
carries its own source string and a set that switched providers mid-run is
flagged BLENDED by `aggregate()` rather than medianed.

### Known band defect to fix at Task 5/6 (not a bug in this file)

Within one build `lh.transferBytes` is very nearly constant, so the
10%-of-median term makes its default band absurdly loose — the smoke run below
measured 949,553 bytes with a band of **94,955 bytes**. A ~90 KB regression
would read within-band. This is NOT fixed by forking the band formula (it is
shared with Layer 2 deliberately); it is fixed the way the design intends, with
a hand-set `"maxBand"` on that metric in `baseline.json`. **Task 5 must set
`lighthouse.<preset>.lh.transferBytes.maxBand`** (~2048 suggested — the figure
should be near-exact for a fixed dist hash). The same argument applies more
weakly to `lh.performance`, whose 10% term tolerates a 6-point score drop.

### Shared-module changes (both load-bearing for Layer 2)

- `lib/report.mjs` gained `compareReportFiles`, moved verbatim out of
  `run.mjs`, which now delegates to it. "Two consecutive invocations agree
  within bands" is the acceptance check BOTH layers are held to; two copies
  could drift into disagreeing about what "agree" means.
- `lib/baseline.mjs` gained `updateLighthouse`, and `updateScenarios` now
  delegates to a shared private `updateSection`. This makes the three-writer
  contract structural rather than merely documented — the merge rules that
  protect the other keys cannot be implemented twice and drift apart.
- `perf/lighthouse.mjs` drives its presets through `runScenario` (imported from
  `run.mjs`), reusing the warm-up discard, outlier gate and replacement budget
  rather than reimplementing them.

~~`npm run perf:selftest` stayed 26/26 across both refactors.~~ **STRUCK — this
was not evidence for either refactor.** `perf/selftest-retry.mjs` references
neither `baseline.mjs` nor `report.mjs`, so its 26/26 showed only that the
UNTOUCHED code still worked. The refactors are covered by
`perf/selftest-lighthouse.mjs` (see "Round 2" below), which is now part of
`npm run perf:selftest`; both suites must be green.

### Acceptance check: DEFERRED — the rig is contaminated

The check is "two consecutive `node perf/lighthouse.mjs --runs 3` invocations
agree within bands on both presets". That is a timing measurement, and R10
exists precisely to stop numbers being recorded in this state.

Rig at implementation time. The first reading was the owner actively gaming
(**LeagueOfLegends at 183.3%** — a user application, not a system daemon); as
that receded it was replaced by a macOS background-maintenance storm (Spotlight
/ storage indexing, Apple Neural Engine compilation). Both states are
contaminated and neither is transient on the timescale of a bench run. **8 of 10 polls over 3 minutes had a foreign process above
R10's 50% limit**:

| time | 1-min load | hottest foreign process |
|---|---|---|
| 01:13 | 12.09 | LeagueOfLegends 183.3% |
| 01:25 | 5.20 | fseventsd 73.6% |
| 01:26:19 | 4.56 | ApplicationsStorageExtension 88.6% |
| 01:26:37 | 5.07 | StorageManagementService 74.7% |
| 01:26:55 | 4.49 | StorageManagementService 54.8% |
| 01:27:13 | 4.26 | WardaSynthesizer 40.6% |
| 01:27:31 | 4.19 | ANECompilerService 92.3% |
| 01:27:49 | 4.15 | com.apple.WebKit.Networking 30.0% |
| 01:28:08 | 4.06 | StorageManagementService 76.9% |
| 01:28:26 | 3.68 | ANECompilerService 39.6% |
| 01:28:44 | 3.30 | ApplicationsStorageExtension 17.4% |
| 01:29:02 | 3.48 | fseventsd 71.7% |

`fseventsd` at 68-78% is the exact signature already recorded above as a
contaminated state. A "pass" recorded here would be a statement about Spotlight
indexing and Apple Neural Engine compilation, not about the build.

**What WAS proved on this rig** (all load-independent, all green):

- **`npm run perf:selftest` — 26/26 (`selftest-retry.mjs`) + 57/57
  (`selftest-lighthouse.mjs`).** The second suite is what covers this task: the
  three-writer contract in BOTH write orders, `extractMetrics`'s happy path and
  every never-silently-skip failure path, the named transfer-bytes fallback,
  band-override survival, dropped-metric retention, instrument-drift
  comparison, and `parseArgs`.

  *Historical note, because this log is read cold:* the original Task 4 write-up
  claimed "31/31 assertions" from a scratch suite that was never committed, and
  cited `selftest-retry.mjs` 26/26 as evidence that Layer 2 was unaffected by
  the shared-module refactors. Both claims are struck. The scratch suite no
  longer exists (it was landed, extended and superseded by
  `selftest-lighthouse.mjs`), and 26/26 was never evidence about the refactors
  at all — see the strike above. Round 2 replaced both with the landed suite,
  whose coverage of the refactors was independently confirmed by mutation
  testing (breaking `updateSection` and `compareInstrument` four ways; each
  break is caught by named assertions).
- A full end-to-end functional smoke, `desktop --runs 1 --no-warmup`: build →
  serve → launch → audit → aggregate → report → server torn down. All 8 metrics
  collected, **zero unavailable**, provenance recorded
  (`lighthouse@12.8.2:simulate`, `audit:total-byte-weight`), and the R10 guard
  fired loudly on the busy rig as designed. **These numbers are plumbing
  evidence only and must NOT be used as a baseline** — desktop, n=1, on a rig
  R10 declared busy: score 66, LCP 1750.6 ms, TBT 494 ms, CLS 0, transfer
  949,553 bytes, dist `sha256:0d166dce…`.

**To close the leg on a quiesced rig** (verify `uptime` and that no foreign
process is above 50% first, and never run this concurrently with the Playwright
suite — they contend for port 4173 and `dist/`):

```sh
node perf/lighthouse.mjs all --runs 3            # invocation A
node perf/lighthouse.mjs all --runs 3 --no-build # invocation B, same dist
ls -t perf/reports/*lighthouse-desktop.json | head -2   # newest two = B, A
node perf/lighthouse.mjs --compare <A-desktop.json> <B-desktop.json>
node perf/lighthouse.mjs --compare <A-mobile.json>  <B-mobile.json>
```

Both `--compare` invocations must exit 0. `--no-build` on B is deliberate: it
holds the dist hash identical across the pair, so a disagreement is measurement
noise rather than two different builds. Confirm the reports' `machineLoad.busy`
is `false` at BOTH ends before believing the result.

### Round 2 — review fixes

- **`perf/selftest-lighthouse.mjs` landed** (57 assertions) and wired into
  `npm run perf:selftest`, which now runs both suites. Task 4 originally shipped
  two shared-module refactors — `lib/baseline.mjs` (`updateLighthouse` +
  the shared `updateSection`) and `lib/report.mjs` (`compareReportFiles`) —
  with no permanent coverage, offering `selftest-retry.mjs` staying 26/26 as
  evidence. That suite references neither module, so it was evidence that the
  UNTOUCHED code still worked. The three-writer contract in particular is now
  asserted in BOTH write orders, because a contract that only holds for whoever
  writes second is not a contract.
- **`compareReportFiles` now compares the INSTRUMENT, not just the rig**: a
  Layer 3 report's `lighthouse.version`, `pinnedAgainst`, a canonicalised hash
  of its `settings` block, its Chrome flag vector, and its headless flag. Before
  this, a baseline recorded under 12.8.2 compared perfectly clean against a 13.x
  run across a scoring-curve change. Layer 2 reports carry no `lighthouse` block
  and skip the check entirely.
- **Lighthouse version drift now reaches `warnings` and `blockingWarnings`**, so
  it survives into the report JSON and refuses `--update-baseline`, instead of
  only being printed to a terminal nobody will be watching during Tasks 7-12.
- **A metric that could not be collected now sets `exitCode = 1`** (when it is
  not informational). It already blocked a baseline write, but the run still
  printed `result: no regressions` and exited 0 — so a scripted consumer read a
  clean pass from an invocation that failed to measure a required budget.
- `downloadThroughputKbps` corrected to `1474.5600000000002`, Lighthouse's
  actual constant. No measurement impact (it is ignored under `simulate`), but
  "transcribed literally" is the invariant the whole pinning argument rests on.
- `chrome-launcher` is imported directly and is therefore declared directly in
  `devDependencies` rather than relied on as a transitive dep of `lighthouse`.

### Round 3 — review fixes, and one asymmetry Task 5 must know about

**FOR TASK 5 — the informational/required asymmetry on `--update-baseline`.**
An *informational* metric that cannot be collected (`lh.fcpMs`,
`lh.speedIndexMs`, `lh.runMs`) deliberately does NOT set `exitCode` — it is
informational precisely so it cannot fail a run. But it still lands in
`blockingWarnings`, and therefore it still REFUSES `--update-baseline`. So a
run can exit 0, print no regression, and still refuse to record a baseline
because `lh.runMs` went missing. That asymmetry is defensible — a baseline is a
stricter artefact than a pass, and a reference recorded with metrics silently
absent is exactly the "budget that stops existing" failure this harness exists
to prevent — but it is surprising if you meet it cold. **Task 5: if a baseline
write is refused on an otherwise green run, read the warnings for a NOT
COLLECTED line before assuming the rig is at fault.** `--force` is the
deliberate override.

Other round-3 fixes:

- **A false-coverage assertion in `selftest-lighthouse.mjs`.** The "one report
  with an instrument block and one without" fixture carried a `lighthouse`
  block on BOTH sides, so its `1` came from the metric-key union, not from the
  one-sided branch it named. Proven by neutralising that branch and still
  getting 57/57. The fixture is now built by DELETING `lighthouse` from a full
  copy of A, so everything else is identical and only that branch can produce a
  non-zero result. Re-verified by mutation: old fixture 57/57 (false green), new
  fixture 56/57 naming the assertion.
- **`exitCode` now fails CLOSED on an unrecognised metric key**
  (`!METRICS[k]?.informational`). A future extraction key not registered in
  `METRICS` was previously reported as NOT COLLECTED while still exiting 0.
- **The stated CAUSE of a non-zero exit is now tracked separately from the exit
  code.** A run whose only problem was an uncollected metric printed
  `result: REGRESSION` above a table containing no regression, and refused the
  baseline with "(regressions)" — sending an operator hunting something that
  does not exist. Regression and uncollected-metric causes are now tracked
  independently and named accurately, with a generic "NOT CLEAN" fallback so a
  future third cause cannot inherit a wrong explanation.
- `compareReportFiles`'s doc block no longer claims both report kinds are
  compared by identical rules (Layer 3 adds a strictly larger instrument check),
  and its summary line says "disagreement(s)" rather than "metric(s) disagree",
  since the counter now includes rig and instrument differences that are not
  metrics.
- `selftest-lighthouse.mjs` reads through optional chaining, so a sibling-clobber
  regression fails as a named assertion instead of an uncaught `TypeError` that
  aborts the remaining assertions.

**Accepted, not fixed:** the suite's `mkdtemp` directory is never cleaned up,
and `eslint.config.js` does not lint `perf/*.mjs` — the harness is now ~2,000
lines of unlinted JS that six later tasks depend on. Both are known.


## 2026-08-17 · Task 5a · the `exact` block (ruling R14 split)

Ruling R14 split Task 5 on the rig-quiescence dependency. This entry records
**5a only**: `perf/baseline.json` created with its `rig` and `exact` blocks.
`scenarios` and `lighthouse` are present but **deliberately EMPTY** — the
reference Mac has been under sustained foreign load (a game, then a macOS
storage-maintenance storm), and R10's load guard is right to refuse a runtime
baseline recorded in that state: a baseline taken on a loaded rig makes every
later optimization batch read as an improvement against an inflated reference.

Built chunk bytes and per-frame GL call counts are **exact** metrics —
deterministic properties of the code, not of the machine — so they are honest
today and unblock Task 6, whose budgets are exact metrics too. 5b fills the two
empty keys via `--update-baseline` on a quiesced rig. Task 5's Step 1 stays
`- [ ]` until then; **5a ticks nothing**.

The task's acceptance check ("all four top-level keys present and non-empty") is
therefore NOT met by 5a and is not claimed to be. It is 5b's to satisfy.

### Ceiling keys are `<name>.<ext>`, not `<name>`

The plan says "keyed by name prefix". Taken literally that collides: `dist/assets`
contains both `index-<hash>.js` and `index-<hash>.css`, and one `index` key
cannot hold two ceilings. The key is therefore the Vite filename with the
8-char content hash stripped and the extension retained:

    file.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '.$1')

`ProjectDetail-Czpbr-lH.js` → `ProjectDetail.js` (the hash may itself contain a
`-`; the anchored 8-char class handles it). Task 6's chunk→ceiling mapping must
use the same derivation, and its "a chunk with NO ceiling entry fails" rule then
covers CSS as well as JS instead of silently aliasing them.

Ceiling = `Math.ceil(measuredBytes * 1.05)`. Uncompressed on-disk bytes, which
is what the plan's authoring-time table measured.

### Measured bytes vs the authoring-time table (tree @ `4ed990d`)

The authoring figures were re-derived rather than trusted: `4ed990d` was built in
a throwaway worktree and **every one of its chunks reproduced the plan's table
byte-for-byte**, so the drift below is real drift and not a measurement
difference.

| chunk key | @ `4ed990d` | @ `e2e8853` (ceiling basis) | drift | ceiling |
|---|---|---|---|---|
| `index.js` | 109,140 | **110,865** | **+1.58%** | 116,409 |
| `index.css` | 51,283 | **51,399** | **+0.23%** | 53,969 |
| `react-core.js` | 186,629 | 186,629 | 0 | 195,961 |
| `framer-motion.js` | 123,914 | 123,914 | 0 | 130,110 |
| `i18n.js` | 50,650 | 50,650 | 0 | 53,183 |
| `router.js` | 37,081 | 37,081 | 0 | 38,936 |
| `lenis.js` | 18,819 | 18,819 | 0 | 19,760 |
| `Projects.js` | 6,599 | 6,599 | 0 | 6,929 |
| `palette.js` | 185 | 185 | 0 | 195 |
| `Archive.js` | 55,680 | 55,680 | 0 | 58,464 |
| `projects.js` | 30,787 | 30,787 | 0 | 32,327 |
| `ProjectDetail.js` | 10,070 | 10,070 | 0 | 10,574 |
| `WorkExperience.js` | 8,231 | 8,231 | 0 | 8,643 |
| `Contact.js` | 2,856 | 2,856 | 0 | 2,999 |
| `Stats.js` | 2,245 | 2,245 | 0 | 2,358 |
| `Skills.js` | 2,120 | 2,120 | 0 | 2,226 |
| `Footer.js` | 932 | 932 | 0 | 979 |
| `WorkRow.js` | 2,948 | 2,948 | 0 | 3,096 |
| `Stagger.js` | 517 | 517 | 0 | 543 |
| `SectionHeading.js` | 391 | 391 | 0 | 411 |
| `Tag.js` | 274 | 274 | 0 | 288 |

Both moves are **under the 2% flag threshold**, and both are attributable:

- **`index.js` +1,725 B** — Tasks 1–4 added the perf instrumentation hooks to
  `FluidWaves.tsx` (+144 lines) and `Hero.tsx` (+45 lines), the only two app
  files touched since `4ed990d`. `FluidWaves` is statically imported by `Hero`
  (Vite warns about it every build), so both land in the `index` entry chunk —
  which is exactly and solely where the bytes appeared. Expected and legitimate.
- **`index.css` +116 B** — NOT an app change: `src/index.css` is byte-identical
  between the two trees. Diffing the two built stylesheets shows exactly two new
  rules, `.top-3` and `.antialiased`. Neither class is used anywhere in `src/`
  or `index.html`. They are **Tailwind v4 automatic source-detection false
  positives scanning the harness's own new files**: the literal `top-3` appears
  in `perf/decisions.md` (round-4 prose about "top-3 process lists") and
  `antialiased` in `tests/e2e/pixel-gate.spec.ts`. Both files are new since
  `4ed990d`, which is why the utilities are new too.

  So this campaign's own instrumentation is emitting dead CSS into the shipped
  bundle, and 116 B of that is now baked into the `index.css` ceiling. It is
  small, but it is the exact class of thing this campaign exists to find, and it
  will keep growing as `decisions.md` grows. **Recommended for a later task (not
  done here — 5a's boundary is `perf/`):** narrow Tailwind's source detection in
  `src/index.css` with `@source not "../perf"` / `@source not "../tests"`, then
  re-derive this ceiling. Filed as a known limit, not a blocker.

### `exact.uniformUploadsPerFrame` = 1

Confirmed against the source, not assumed. `FluidWaves.tsx`'s steady-state frame
is `drawFrameRaw` (`src/components/canvas/FluidWaves.tsx:416-419`):

    gl.uniform1f(timeLoc, timeSec)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

One uniform upload, one draw call. Every other upload in the component is
setup-time (`seed`, the three `uniform3fv` colours, `contrast`,
`dissolveStrength`, once after link) or resize-time (`resolution` via
`uniform2f`, `dissolveStart` via `uniform1f`, inside `resize()`). The counting
wrappers instrument `uniform1f` / `uniform2f` / `uniform3fv` / `drawArrays`, so
those setup and resize uploads DO land in `uniformUploads` — which is precisely
why the plan's Task 6 assertion is scoped to a window in which the `resizes`
delta is 0. Under that scope `uniformUploads === frames === drawCalls`.

### How the `rig` block was produced

Not hand-written. A one-off scratch script (kept out of the repo — it is not a
fourth writer) wrote `{"exact": {...}}`, then called the harness's own
`collectRig()` from `perf/lib/rig.mjs` and passed it through
`updateScenarios(path, {}, rig)` + `updateLighthouse(path, {}, rig)` from
`perf/lib/baseline.mjs`. That is the same `updateSection` every real writer goes
through, so the rig block, the key ordering, and the empty-section shape come
from the production path rather than from a parallel one — and the round trip
doubled as a live check that a `lighthouse` write leaves `exact` untouched.

Rig as stamped: Chrome 147.0.7727.15 · macOS 15.7.3 · arm64 · Apple M1 ·
displayScale 2 · 60 Hz · AC power. Note that 5b will run under `rigMismatches`
against exactly these values, so any Chrome auto-update before 5b will
(correctly) refuse the runtime baseline write.

### Two parked one-liners from Task 3's review, folded in here

Both protect R10's load guard — the guard that will gate 5b.

- **`baselineRefusal`'s missing-sample guard was `machineLoad && machineLoad.after == null`.**
  An ABSENT load block therefore refused nothing: the guard caught a refactor
  that dropped half the sampling and waved through one that dropped all of it —
  the louder failure being the one it missed. Now `!machineLoad || machineLoad.after == null`,
  with a selftest case. No load evidence is not weaker than partial load
  evidence; it is the same refusal.
- **`perf/selftest-retry.mjs` proved the combiner, not the wiring.** Every load
  assertion fed hand-built samples straight to `combineMachineLoad`, so deleting
  `sampleMachineLoad('after')` from `run.mjs` left the suite at a full green.
  A source-text assertion now requires the call to exist in `run.mjs` — and in
  `lighthouse.mjs`, which carries the identical wiring for Layer 3 and had the
  identical hole. Mutation-verified: renaming the call in `run.mjs` drops the
  suite to 28/29 naming that assertion; restoring it returns 29/29.

  A source-text assertion is blunt (a rename breaks it; it cannot see whether
  the result is used). It is scoped to the one call whose absence is otherwise
  undetectable from a browserless test.

Selftests after both: `node perf/selftest-retry.mjs` **29/29** (was 26/26),
`perf:selftest` **57/57** unchanged.

### Three cosmetic fixes from Task 4's review (ruling R13)

All operator-facing, all in `perf/lighthouse.mjs`:

- **The uncollected-metric COUNT counted occurrences, not metrics.**
  `uncollectedRequired` gets one push per (preset, run, metric), so one audit
  failing on all 5 runs of both presets printed
  `10 required metric(s) could not be collected (lh.lcpMs)` — a count
  contradicting its own parenthetical, in the very message round 3 existed to
  make truthful. A single `uncollectedMetrics = [...new Set(...)]` now feeds
  every reader-facing count and list; the raw array keeps its role as the
  trigger.
- **The `--help` exit-code legend still said exit 1 meant a regression.** Since
  round 3 it can also mean a required metric could not be collected. Reworded to
  "not clean", naming all three causes.
- **The result line short-circuited on `regressed`.** A run that both regressed
  AND failed to collect a required metric named only the regression; the
  operator fixed it and was then surprised by a second non-zero exit for a cause
  the tool had known about all along. Every cause is now named, joined with
  "; and", keeping the `REGRESSION` / `NOT CLEAN` prefix and the generic
  fallback for a future third cause.

---

## 2026-08-17 · Task 5c · Tailwind source scoping — the harness stops leaking dead CSS into the bundle

**Problem (measured at Task 5a, ruling R17).** Tailwind v4's automatic source
detection scans the whole repository, so files this campaign added were emitting
real utilities into the **shipped** stylesheet. Two were named in the ruling:
`.top-3` (planted by the literal words "top 3" in this very log's prose) and
`.antialiased` (from `tests/e2e/pixel-gate.spec.ts`). Neither is used anywhere
in `src/` or `index.html`. Note `src/index.css` carries a raw
`-webkit-font-smoothing: antialiased` declaration that long predates the
campaign — that is a CSS property, not the utility class, which is why the
attribution is airtight: the *class* only started being emitted when the new
files appeared.

### Mechanism chosen: explicit allow-list, not a deny-list

`src/index.css` now opens with `@import "tailwindcss" source(none);` followed by
`@source "../src";` and `@source "../index.html";`.

The alternative — leaving auto-detection on and adding `@source not "../perf"`,
`"../tests"`, `"../docs"`, `".../.superpowers"` — was rejected. A deny-list only
covers the directories that exist on the day it is written; the next new
top-level directory leaks again, and the whole reason this was scheduled rather
than filed is that the leak **compounds**. An allow-list is closed by
construction.

The allow-list's own failure mode is the opposite and is the one that actually
had to be disproved: an include that is too narrow silently drops a utility the
app really uses, and a byte count cannot see it. Three independent proofs were
run (below). The app's entire markup surface is `src/` + `index.html` — no
other HTML/JSX/TSX in the tree is *built or served*.

(Evidence correction, review item 3 — the original wording here cited a
`find public scripts …` that returned empty, but that searched only two
directories and does not support the claim. The claim is nonetheless correct,
on the right evidence: a full `find` excluding `node_modules`/`dist` turns up
`.claude/portfolio-handoff/**`, `.claude/design-system-handoff/**`,
`.superpowers/brainstorm/**/*.html` and `tests/unit/*.tsx`. None is built or
served — Vite's build entry is the default root `index.html` with no `input`
or `root` override in `vite.config.ts`, `wrangler.jsonc` declares no worker
entry and serves `dist/` only, and the `tests/unit` TSX renders through jsdom
in vitest, never into the bundle. `.claude/` handoff material and
`.superpowers/` are gitignored reference artifacts. So they are exactly the
files the allow-list is meant to exclude, not app markup it might miss.)

### Result

| | bytes | ceiling (`ceil(× 1.05)`) |
|---|---|---|
| before | 51,399 | 53,969 (as recorded by Task 5a) |
| after  | **46,952** | **49,300** |

**−4,447 B (−8.65%) off the shipped stylesheet.** Only the `index.css` ceiling
was re-recorded in `perf/baseline.json`; every other ceiling, and both the empty
`scenarios`/`lighthouse` sections, are untouched (Task 5b owns those and needs a
quiesced machine).

### Everything that disappeared, accounted for

The emitted CSS was parsed with postcss before and after and every rule
serialised as `at-rule-context || selector { declarations }`, then diffed —
not compared by byte count.

**33 utility classes removed.** None appears as a class token anywhere in the
app's markup:

`antialiased`, `backdrop-filter`, `border`, `container` (+ its 5
`@media (min-width: …)` `max-width` variants), `contents`, `ease-in`,
`ease-out`, `flex-shrink`, `flex-wrap`, `grayscale`, `grid`, `grid-cols-4`,
`grid-rows-4`, `grow`, `inline-flex`, `invert`, `list-item`, `lowercase`,
`max-w-[640px]`, `ms-1`, `opacity-0`, `ordinal`, `outline`, `py-32`, `rounded`,
`shrink`, `tabular-nums`, `text-left`, `top-2`, `top-3`, `top-4`, `underline`,
`uppercase`.

Read the list as what it is: ordinary English words and doc fragments. `border`,
`container`, `contents`, `grid`, `invert`, `lowercase`, `uppercase`,
`underline`, `outline`, `grayscale`, `ordinal`, `rounded`, `grow` are prose from
`CLAUDE.md` and the plan/spec documents; `top-2`/`top-3`/`top-4`,
`grid-cols-4`, `grid-rows-4`, `py-32`, `ms-1`, `max-w-[640px]` are numbers and
fragments from plan tables and this log; `antialiased` is the pixel-gate spec.
The app styles itself through hand-written classes in `src/index.css`
(`skills-grid`, `workrow-index`, `hero-name`, …), which is why the false-positive
utilities outnumbered the real ones so heavily.

**Supporting `@property` declarations and theme variables removed with them**
(Tailwind emits these only for utilities it generates): the nine
`--tw-backdrop-*` properties, `--tw-border-style`, `--tw-outline-style`,
`--tw-ordinal`, `--tw-slashed-zero`, the three `--tw-numeric-*`, their entries in
the `@layer properties` `@supports` fallback block, and — from the `@layer theme`
`:root,:host` block — `--spacing`, `--ease-in`, `--ease-out`, `--color-bg`,
`--color-bg-tonal`, `--color-text`, `--color-text-muted`, `--color-text-faded`,
`--color-accent-pink`, `--color-accent-blue`, `--color-accent-yellow`,
`--color-accent-yellow-deep`.

The `--color-*` names look alarming and are not. Those are `@theme` tokens; the
hand-written stylesheet reads the parallel `:root` aliases (`--bg`, `--text`,
`--row-tint`, …), which are plain CSS and are emitted verbatim, untouched.
`grep -rn 'var(--color-' src index.html --include='*.tsx' --include='*.ts'
--include='*.html'` returns nothing — no inline style or JS reads them either.
The `--color-*-deep` tokens the light chapter DOES reference (`surface-light`,
`surface-light-tonal`, `ink-on-light`, `accent-pink-deep`, `accent-blue-deep`)
all survive; only `accent-yellow-deep`, which nothing references, went.

### Three proofs that no *used* rule was dropped

1. **Class-token intersection.** Every `class=`/`className=` string literal in
   `src/` + `index.html` was extracted (165 distinct tokens, including the ones
   inside template literals and conditional expressions) and intersected with
   the 33 removed classes. **Empty intersection.**
2. **Dangling custom-property audit.** For both builds, every `var(--x)`
   reference in the emitted CSS was checked against every `--x:` definition in
   the same file. Before: 86 referenced / 106 defined / 6 dangling. After: 67 /
   78 / **6 dangling — the same six**
   (`--default-font-feature-settings`, `--default-font-variation-settings`,
   `--default-mono-font-feature-settings`,
   `--default-mono-font-variation-settings`, `--tw-duration`, and `--row-tint`,
   which is injected from JS by design). **No new dangling reference.** This is
   the check that would have caught a theme token being pruned out from under a
   rule that still uses it.

   > **All four counts above are 78/106/86/67 — if you re-derive them and get
   > 80, your regex is wrong, not the doc.** A naive `--[\w-]+\s*:` sweep over
   > minified CSS also matches **BEM hover selectors**: `.btn--primary:hover`
   > and `.btn--ghost:hover` read as definitions of `--primary` and `--ghost`.
   > Those two phantoms are the entire 78→80 gap, and an intermediate revision
   > of this line did carry the wrong 80. Re-verified with a postcss parse
   > counting only real `Declaration` nodes whose `prop` starts with `--`,
   > which reproduces 86/106 and 67/78 exactly and independently of the
   > original grep. The dangling *set* of six is exact under either method and
   > was never in doubt.
3. **Live scan probes.** Both `@source` entries were confirmed to actually
   scan, not merely to parse: a real utility (`underline`, absent from the new
   build) was temporarily added to a `class` in `index.html`, and separately to
   a `className` in `src/components/sections/Skills.tsx`. Each build emitted
   `.underline`; both probes were reverted. A registration that silently matched
   nothing would look identical to a correct one in the byte count.

### Pixel gate — zero visual change

`npx playwright test pixel-gate --workers=1` → **30 passed (2.5m)**. All 30
goldens (5 moments × 3 seeds × 2 projects) green against the **existing**
committed goldens; nothing was re-baked (`git status` shows no change under
`tests/e2e/pixel-gate.spec.ts-snapshots/`). Goldens regenerate only on a commit
declaring visual intent, and this commit declares the opposite.

### Carried fix from the Task 5a review

`perf/selftest-retry.mjs` block 7 read `const source = await sourceOf(file)`
outside any try, so a missing or renamed `run.mjs`/`lighthouse.mjs` rejected out
of the whole suite — aborting every later block and the `N/N passed` line —
instead of failing as the named check sitting directly beneath it. Now
`await sourceOf(file).catch(() => '')`, so the empty string fails the existing
`check` by name. Same house rule as the rest of the file.

### Standing consequence

Prose in `perf/`, `docs/`, `tests/` and `.superpowers/` can no longer plant a
utility in the shipped bundle. That includes this entry, which mentions
`top-3`, `py-32` and `grid-cols-4` in plain text and — before this change —
would have re-emitted all three.

---

## 2026-08-17 · Task 5c review follow-up · canonical tokens mirrored into `:root`

Task 5c's scoping stopped the nine canonical `--color-*` dark tokens
(`--color-bg`, `-bg-tonal`, `-text`, `-text-muted`, `-text-faded`,
`-accent-pink`, `-accent-blue`, `-accent-yellow`, `-accent-yellow-deep`) from
reaching the shipped `:root`. They live in `@theme`, which Tailwind tree-shakes
to the tokens it sees referenced — and it scans for CLASS candidates, never for
`var()` inside a `.tsx`. Nothing consumes them today, so this was latent, not
broken; but CLAUDE.md tells new work to read exactly those names, and a future
`style={{ color: 'var(--color-text)' }}` would have resolved to empty with no
error and no failing test.

They are now also declared in the plain `:root` alias block, which is not
tree-shaken. `index.css` 46,952 → **47,213 B**; ceiling 49,300 → **49,574**.
Pixel gate re-run rather than assumed (adding unused custom properties must be
visually inert): **30/30, goldens untouched**.

### The +261 B, accounted for exactly — and it is a live specimen

"+261 = the nine mirrored tokens" is **wrong**, and the true account matters
more than the number. Diffing every custom-property declaration in the two
emitted stylesheets by `(at-rule context, selector, prop)` yields **ten** added
declarations, not nine:

| where | declarations | bytes |
|---|---|---|
| plain `:root` | the 9 mirrored tokens | 240 |
| `@layer theme` `:root,:host` | **`--color-text` alone** | 21 |
| | | **261** |

The tenth is not a mistake in the mirroring — it is the prose-plants-output
mechanism firing again, **inside the very comment that explains it**. The new
comment block in `src/index.css` contains the literal string
`var(--color-text)` (as an example of the breakage being prevented), Tailwind's
scanner reads that as a genuine reference, and so it un-pruned `--color-text`
back into the `@layer theme` block. Harmless — identical value, and the
unlayered `:root` declaration wins on cascade order regardless — but note what
it demonstrates: `@source` narrowing bounds *which files* can plant output, not
*whether prose can*. A comment inside an allow-listed file is still input.

(Two more `--color-*` names appear in the same comment as
`getPropertyValue('--color-accent-pink')` and did **not** un-prune: the scanner
matched the `var(…)` form specifically, not a bare quoted property name. So the
trigger is narrower than "the token is mentioned" — it is "the token appears in
`var()` syntax".)

**For Task 12:** this is the same mechanism as the ~2.1 KB of unused utilities
still planted by `src/`'s own text, and it is the concrete counter-example to
the tempting one-line fix. `@source not "../src/index.css"` would excise this
21 B and the `ease-in-out`-from-a-declaration-value class — but `src/index.css`
is also where every real utility-bearing `@apply`-free rule and the theme live,
so the batch must be measured through the keep-or-revert procedure, not landed
blind.

---

## 2026-08-17 · Task 5b · PARTIAL — the pixel-gate net is proven; the rig closed before the timing legs

Task 5b was dispatched into a window the controller had measured clean at
**07:42** (`busy: false`, `reasons: []`, 0.421 load/core, hottest process
38.4%). That window had already closed by **07:43**, when this task's first
sample ran, and it did not reopen. What follows is what the rig did, what was
provable anyway, and what is still open.

### The rig log (R10 guard, sampled every 20 s by this task)

```
07:43   fseventsd 74.2%  lpc 0.624  busy=true   <- storage-maintenance storm still running
07:44:58 busy=true lpc=0.636 foreign=28.3% | Projeto.exe 104% · WindowServer 30% · Chrome Renderer 19%
07:45:18 busy=true lpc=0.564 foreign=27.3% | Projeto.exe 102% · WindowServer 33% · Chrome Renderer 20%
07:45:58 busy=true lpc=0.532 foreign=27.7% | Projeto.exe 103% · WindowServer 37% · Chrome Renderer 20%
07:48:39 busy=true lpc=0.802 foreign=32.8% | Projeto.exe  98% · WindowServer 35% · Storage 22%
07:49:19 busy=true lpc=0.808 foreign=47.3% | Projeto.exe  97% · node (vitest 1) 95% · Virtualization.VM 63%
07:50:39 busy=true lpc=0.776 foreign=35.4% | Projeto.exe 102% · process.js 74% · WindowServer 31%
07:51:40 busy=true lpc=0.676 foreign=49.5% | Projeto.exe  95% · node (vitest 1) 86% · Code Helper (Renderer) 67%
07:52:00 busy=true lpc=1.044 foreign=60.2% | tsc 239%      · Projeto.exe  98% · WindowServer 32%
07:53:40 busy=true lpc=0.563 foreign=29.8% | Projeto.exe 101% · WindowServer 32% · Storage 30%
```

Two distinct contaminants, and the second is the one that matters:

1. **`fseventsd` at 74–78%** — the tail of the overnight storage-maintenance
   storm. Confirmed as *current* rather than a `ps pcpu` lifetime-average
   artefact by cross-checking with `top -l 2` (78.7% instantaneous). It decayed
   away over the following minutes.
2. **`Projeto.exe` at ~100%, continuously** — a Windows binary
   (`C:/ProjetoMS/SysGuard.bin` → `Projeto.exe`) launched under CrossOver at
   **07:44:20**, i.e. *38 seconds before* this task's second sample. It has held
   ~100% of a core ever since, and on its own it keeps `HOT_PROCESS_PCT` red
   regardless of what load average does. It is a foreign process on the owner's
   machine and was left strictly alone.

From 07:51 onward `tsc` (239%), `Code Helper (Renderer)` (67%) and a `vitest`
worker (86%) join in: **the owner is at the keyboard.** This is no longer a
transient to wait out.

Note which rule did the work. Load-per-core spent most of this window *under*
the 0.7 backstop (0.53–0.68) while a process sat at 100% of a core the whole
time. That is exactly the asymmetry `lib/load.mjs` documents — the backstop
cannot do this job and `HOT_PROCESS_PCT` carries the guard. This incident is a
live confirmation of that design call, and a new row for its evidence table:

| state | 1-min | /8 cores | hottest proc | foreign CPU | provenance |
|---|---|---|---|---|---|
| foreign CrossOver app, owner then active | 4.2–8.3 | 0.53–1.04 | 92–104% | 24–60% | Task 5b, 30 samples |

**`--force` was not used, and no baseline was written.** A missing baseline is
recoverable; a quietly contaminated one corrupts all six optimization batches in
the direction that looks like success.

### PROVEN ANYWAY: the pixel-gate half of the sensitivity proof

The sensitivity proof has two nets, and **only one of them is a timing
measurement.** The pixel gate renders a *frozen* frame (`?perf-freeze=<sec>`,
`?perf-seed=<float>`, `data-perf-frozen="true"`) at a fixed sim time and a fixed
seed, then compares images. Nothing about that verdict depends on how fast the
machine is — a contended rig makes it slower, not different. So it was run under
the contamination, deliberately, with a control first.

Plant: `src/components/canvas/FluidWaves.tsx:158`, the domain-warp loop, `5 → 10`
iterations (scratch commit `88d5cf5`, since reset away). Chosen per the brief
because it executes for **every pixel of both canvases**, unlike the dissolve
fbm which is spatially guarded to the band.

```
CONTROL — untouched tree at 5483e22
  npx playwright test pixel-gate
  30 passed (2.4m)

PLANTED — 5 -> 10 iterations
  npx playwright test pixel-gate
  24 failed
    [desktop-chromium] hero-top-t2/t8 · seed-0p137 / 0p512 / 0p873
    [desktop-chromium] mid-dissolve-t2/t8 · seed-0p137 / 0p512 / 0p873
    [mobile-chromium]  hero-top-t2/t8 · seed-0p137 / 0p512 / 0p873
    [mobile-chromium]  mid-dissolve-t2/t8 · seed-0p137 / 0p512 / 0p873
  6 passed (3.1m)
```

Diff magnitudes, against a `maxDiffPixelRatio` of **0.001**:

```
301963 pixels (ratio 0.24 of all image pixels) are different   hero-top-t2 · seed-0p137 · desktop
 58445 pixels (ratio 0.21 of all image pixels) are different   mid-dissolve-t8 · seed-0p873 · mobile
        ... every failing golden landed in ratio 0.21 – 0.24 ...
```

**210–240× over tolerance.** This net is not marginal and it is not
threshold-calibrated to hide the plant.

The 6 that stayed green are the right 6. `stage-arrival` captures the Selected
Work stage, where neither `FluidWaves` instance is on screen — so the gate
discriminated by *what changed* rather than failing wholesale, which is the
stronger result. Had all 30 gone red it would have been weak evidence (a global
capture perturbation looks identical); 24-red/6-green matching the canvas
footprint exactly is what a real detection looks like.

Control-then-plant ordering matters here and was not incidental: 30/30 green on
the untouched tree *under this same contamination* is what rules out "the rig
made it red".

### STILL OPEN — every leg that is a timing measurement

None of these were attempted, none were faked, and none were forced:

- Task 3's deferred acceptance leg (`idle-hero --runs 5` A/B agreement).
- Task 4's deferred acceptance leg (`lighthouse --runs 3` A/B on both presets).
- `npm run perf -- --update-baseline` → `scenarios`.
- `node perf/lighthouse.mjs --update-baseline` → `lighthouse`.
- The two hand-set `maxBand` overrides. **These cannot honestly be chosen yet:**
  the brief asks for values "from the observed run-to-run spread", and no
  trustworthy spread has been observed. `lh.transferBytes` is admittedly a byte
  count and load-independent, but its override still has to be written into a
  `lighthouse` block that does not exist, and `lh.performance` needs timing
  spread outright. Guessing them from the authoring-time smoke figures would put
  a number in the campaign's contract that no measurement backs.
- The `npm run perf` half of the sensitivity proof (must run *after* a baseline
  exists — there is nothing to regress against until then).
- The determinism proof.
- The `battery-proxy` powermetrics-vs-fallback sudo decision (needs Kevin, once).

`perf/baseline.json` is therefore still `rig` + `exact` only, exactly as Task 5a
left it, and **Task 5's Steps 1–3 all remain `- [ ]`.** Step 2 in particular is
half-earned and stays unticked: it reads "detected by BOTH nets", and only one
net has fired.

### Verified untouched

`git diff --stat 5483e22` is empty. The shader loop reads `for (int i = 0; i <
5; i++)`. The scratch commit was `git reset --hard`-ed away rather than reverted,
so the branch carries no scratch/revert pair. `baseline.json` still has all four
top-level keys with `exact.chunkBytesCeiling` at its 21 entries — the
three-writer merge contract is intact and unexercised by this task.

### For whoever picks 5b back up

Re-run the guard first; the whole task is gated on one line of output:

```
node -e "import('./perf/lib/load.mjs').then(async m=>{const s=await m.sampleMachineLoad('probe');console.log(s.busy,s.reasons)})"
```

`false []` means go. Then run the legs in the brief's order — the two acceptance
A/Bs, the two `--update-baseline` writes, the `maxBand` overrides, then the
`npm run perf` half of the sensitivity proof, then determinism. The pixel-gate
half above does not need redoing; the plant is a one-line change and the result
is reproducible from this entry.

One rig note worth carrying forward, since it is not currently anywhere in the
harness: the guard's *at-end* re-sample is taken after the invocation's own
build and headed-Chrome activity, which is itself a heavy `fseventsd` producer.
On a rig already near a threshold that could turn a legitimate run red at the
last moment. Not observed firing here — flagged because Task 5b would have been
the first invocation long enough to find out.

---

## 2026-08-17 · Task 6 (review round 3) · The e2e gate built twice per run

**Not a campaign batch — a harness cost fix.** Recorded here because it changes
what every gate run in Tasks 7–12 costs.

`playwright.config.ts` webServer command was
`npm run build && npm run preview -- --port 4173`, and `package.json`'s
`preview` is itself `npm run build && wrangler dev`. So **every e2e run that
spawned its own server built the app twice.** The leading `npm run build && `
was dropped; the command is now just `npm run preview -- --port 4173`, which
still builds exactly once before serving.

| measurement | value |
|---|---|
| full serial e2e, before (Playwright-reported, 2 runs) | 6.6 min, 6.6 min |
| full serial e2e, after (Playwright-reported / shell wall-clock) | 6.5 min / 390 s |
| one `npm run build`, isolated (2 runs) | 4 s, 5 s |

**Honest size of the win: ~4–5 s per spawned run, ≈1.2% of the suite.** The
duplicate build was real and is now gone, but it was never the expensive part —
anyone hoping this explains a slow gate should keep looking. It is free and
recurs on every future gate invocation, which is the whole case for it.

Suite green at 102/102 after the change, so the gate still gets its server the
same way.

**Consequence for Tasks 7–12:** the batch procedure's step 0 (kill any listener
on 4173) is unchanged and still required — this fix removes a redundant build,
it does not make a stale server safe. The chunk-bytes budget now enforces that
independently (`tests/e2e/perf-budget.spec.ts`): dist must be newer than
`src/**` + `index.html` + `vite.config.ts` + `package-lock.json` +
`tsconfig*.json`, and whatever answers on 4173 must be the production preview
rather than a dev server.

**Budget-unit note for future batches:** `exact.chunkBytesCeiling` is
**uncompressed** `statSync` bytes. A batch that trades raw size against
compressed size will read backwards against this budget — state raw vs transfer
explicitly in its decision line when that happens.

---

## 2026-08-17 · Task 7 (B1) · Dissolve-band early-exit guard — bound derivation

**Verdict: DERIVED NO-OP. Keep `if (p > -0.6)` exactly as it is. Nothing was
measured, nothing was changed, and no measurement is warranted** — the ceiling
on the win is provably below this harness's detection band, so the batch
procedure's step 2 ("target metric improved beyond band") cannot be satisfied
even by a perfect implementation. The derivation below is the deliverable.

A tighter bound **is** provable (`-0.45` is mathematically safe for today's
constants, and the true activation point is `-0.3703125`), so this is *not* a
"the math said no" outcome. It is "the math said yes, and the yes is worth
~2.5% of one shader's fragment cost while costing 2.9× of the guard's
robustness margin against a documented tuning knob". The second half is why the
answer is still no.

### The shader, for someone who has not opened it

`src/components/canvas/FluidWaves.tsx`, hero variant only (the block is wrapped
in `if (dissolveStrength > 0.0)`, which is 1 for hero, 0 for backdrop). The
bottom of the hero canvas dissolves into cream via a noise-thresholded field:

```glsl
float p = 1.0 - vUv.y / max(dissolveStart, 1e-4);  // <0 above band, 0 at band top, 1 at canvas bottom
float diss = 0.0, thin = 0.0;
if (p > -0.6) {                                     // <-- THE GUARD UNDER TEST
  float n     = fbm(...);                           // 4-octave value-noise fBm
  float sweep = (fbm(...) - 0.5) * 0.55;
  float amp   = 0.9 * (1.0 - smoothstep(0.55, 1.0, p));
  float field = p + (n - 0.5 + sweep) * amp;
  diss = smoothstep(0.34, 0.60, field);
  thin = smoothstep(0.24, 0.56, field);
}
float floorCream = 1.0 - smoothstep(0.035, 0.047, vUv.y);   // OUTSIDE the guard
diss = max(diss, floorCream) * dissolveStrength;
thin = max(thin, floorCream) * dissolveStrength;
ret_col = mix(ret_col, vec3(luma), thin * 0.45);
ret_col = mix(ret_col, vec3(0.9608, 0.9490, 0.9255), diss);
```

`dissolveStart` is derived from real layout at resize: `(section - zone)/section`
where `section` = `.hero` (`min-height: 130svh`) and `zone` = `.hero-zone`
(`100svh`) → **`dissolveStart ≈ 0.2308`** nominally. `p` therefore ranges
`[-3.33, 1]` across the canvas.

**The safety criterion is bit-exact, not approximate.** GLSL `smoothstep(e0,e1,x)`
returns *exactly* `0.0` for `x <= e0` (it clamps `t` to 0 and returns `t*t*(3-2t)`),
and `mix(a, b, 0.0)` returns `a` bit-exactly. `thin`'s lower edge `0.24` is below
`diss`'s `0.34`, so `thin` fires first. So:

> Skipping the block is **bit-identical** to computing it, for every fragment
> where `field <= 0.24`. The guard is safe iff no skipped fragment can reach
> `field > 0.24`. There is no "close enough" here in either direction.

`floorCream` is computed *outside* the guard, so the hard cream floor at the
canvas bottom is unaffected by any choice of bound.

### Step 1 — the honest bound on `n`. It is NOT [0, 1]

```glsl
float hash(vec2 p)  { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ /* bilinear mix of 4 hashes, weights u = f*f*(3-2f) in [0,1] */ }
float fbm(vec2 p)   { float v = 0.0, a = 0.5;
                      for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p*2.0+3.1; a *= 0.5; }
                      return v; }
```

- `fract()` returns `[0, 1)` for every finite input, including negatives
  (`fract(x) = x - floor(x)`), so **`hash ∈ [0, 1)`**. This holds at any float
  precision — it is a property of `fract`, not of `sin`.
- `vnoise` is a *convex* combination of four hashes (two nested `mix`es with
  weights in `[0,1]`), so **`vnoise ∈ [0, 1)`**.
- `fbm` sums `a·vnoise` with `a = 0.5, 0.25, 0.125, 0.0625`. **`Σa = 0.9375`**,
  so **`n ∈ [0, 0.9375)`**.

**The plan brief's `n ∈ [0, 1]` is wrong** — it is the textbook range for a
*normalised* fBm, and this fBm is not normalised (no `/Σa`). The correct
supremum is `1 - 2^-4 = 0.9375`.

**Attainability: the supremum is NOT attained, and this is not a technicality
we lean on.** `0.9375` requires all four octaves to hit `vnoise = 1`
simultaneously, at coordinates `p`, `2p+3.1`, `4p+9.3`, `8p+21.7` — four
effectively decorrelated lattices — and each of those requires four corner
hashes at their own supremum. Everything below uses `0.9375` as a hard,
never-attained **upper bound**, which is the only kind of bound safe to ship.
How far below it the attainable values actually sit is quantified further down,
and deliberately **not** used to justify anything.

### Step 2 — `sweep`

`sweep = (fbm(...) - 0.5) * 0.55` with the same `fbm`, so
**`sweep ∈ [-0.275, 0.240625)`**.

**The brief's `[-0.275, 0.275]` is wrong on the upper end** (it inherits the
same `n ∈ [0,1]` error). The lower end is right, because `fbm`'s infimum really
is 0. The asymmetry is real: `0.55 × (0.9375 - 0.5) = 0.240625`, not `0.275`.

### Step 3 — `amp` is a CONSTANT everywhere the guard matters

`amp = 0.9 * (1 - smoothstep(0.55, 1.0, p))`. For `p <= 0.55` the `smoothstep`
clamps to 0, so **`amp = 0.9` exactly for all `p <= 0.55`**, and in particular
for every negative `p`. The brief's warning that "`field(p)` is not linear in
the noise term" is true only in `p ∈ (0.55, 1]`, which is entirely *inside* any
guard under discussion. In the region a negative-`p` guard governs, `field` is
exactly linear in `p` with slope 1. No fixed-point solve is needed.

### Step 4 — the activation bound, closed form

Let `S = Σa = 0.9375` (fBm gain sum), `k = 0.55` (sweep scale),
`A = 0.9` (`DISSOLVE_NOISE_AMP`), `T = 0.24` (`thin`'s lower smoothstep edge).

```
sup(n - 0.5 + sweep) = (S - 0.5) + k(S - 0.5) = (S - 0.5)(1 + k)
                     = 0.4375 × 1.55 = 0.678125
sup(field)(p)        = p + A · (S - 0.5)(1 + k) = p + 0.6103125
```

`field > T` is reachable only where `p + 0.6103125 > 0.24`, i.e.

```
        p_act = T − A·(S − 0.5)(1 + k)
              = 0.24 − 0.9 × 0.678125
        p_act = −0.3703125
```

> **A guard `if (p > g)` is provably safe if `g ≤ −0.3703125`.**

Only the `⇐` direction is proven, and deliberately so. The sup is never
attained, so a `g` marginally *above* `p_act` is very likely safe in fact — it
simply cannot be shown so by this argument, nor by any argument that does not
characterise the specific hash's maxima. Ship what is provable.

`n` and `sweep` are two different `fbm` calls at unrelated coordinates; treating
both as simultaneously maximal is the conservative (safe) direction, so no
independence assumption is needed.

`−0.6`, `−0.45`, `−0.40` and `−0.39` are all provably safe. `−0.37` is **not
provably safe** — which is not the same as unsafe: it lands in the "unproven"
zone characterised below, not the demonstrably-broken one.

### Verdict on the in-tree `p > -0.39` claim: TRUE, but loose and accidentally so

The comment at `FluidWaves.tsx:195-198` says activation "needs `p > -0.39`".
Since the true activation set is `p > −0.3703125`, every activating fragment
also satisfies `p > −0.39`. **The claim is therefore a correct upper bound** —
just not the tight one, and stated without its derivation.

It is also *accidentally* correct in a way worth recording: `−0.39` is only safe
because `n ≤ 0.9375`. Under the brief's stated (wrong) bounds — `n ∈ [0,1]`,
`sweep ∈ [-0.275, 0.275]` — the activation point would be
`0.24 − 0.9 × 0.775 = −0.4575`, and a guard at `−0.39` would clip. Anyone who
had trusted the brief's constants and hard-coded `−0.39` as the guard would have
shipped the exact visual regression this task exists to prevent. The number
`−0.39` reproduces from neither constant set; it looks hand-rounded.

### Correction: the in-tree "~77% of the hero canvas exits with zeros" is wrong

The guard skips where `p ≤ −0.6`, i.e. `vUv.y ≥ 1.6 × dissolveStart ≈ 0.369`.
That is **~63%** of canvas height, not 77%. **76.92%** is `1 − dissolveStart` —
the fraction of the canvas *above the band* (`p < 0`), which is not what the
guard tests. Documentation defect only; no behavioural consequence. Suggested
replacement comment text is in the task report.

### How loose is the sup? TIGHT — and only adversarial search shows it

> **This section was rewritten after review refuted its first version.** It
> originally reported uniform-sampling maxima at 76-79% of `sup(term)` and
> concluded "the sup is enormously loose". **That was wrong, and wrong in the
> unsafe direction** — it read as licence to sit somewhere between the sup and
> the observed maxima. The corrected finding is the opposite: the sup is
> approached closely, and the apparent gap was an artifact of uniform sampling.

**Uniform sampling (the refuted method).** An fp32-emulated transcription of
`hash`/`vnoise`/`fbm` (`Math.fround` at every step), sampling `n` and `sweep` at
independent coordinates as the shader forms them:

| samples | coord domain | max `n` | max `(n − 0.5 + sweep)` | implied `p_act` |
|---|---|---|---|---|
| 5 × 10⁶ | 0..40 | 0.8748 (93.3% of sup) | 0.5197 (76.6% of sup) | −0.2277 |
| 4 × 10⁷ | 0..40 | 0.8748 (93.3%) | 0.5384 (79.4%) | −0.2445 |
| 8 × 10⁶ | 0..4000 | 0.9104 (97.1%) | 0.5127 (75.6%) | −0.2214 |

**Adversarial search (the method that actually probes the tail).** A
multi-restart hill-climb over the same fp32 `fbm`, run by review and reproduced
independently here:

| search | max `fbm` (broad domain) | max `fbm` (sweep's own domain) |
|---|---|---|
| review, 400 restarts | 0.895598 | **0.883656** ⇒ `sweep = 0.211011` |
| here, 400 restarts | 0.891906 | 0.862067 |
| here, 4000 restarts | **0.906466** | 0.862067 |

The sweep row is searched on the shader's *constrained* domain —
`x = vUv.x·1.3 + seed·3 ∈ [0, 4.3)`, `y = time·0.03` over ~2.8 h of drift — not
a free plane, because that is the only domain `sweep` can reach.

Taking the best witness found on each axis (both searches produce *lower bounds*
on attainability, so the larger of any two is the better-established fact):

```
  max n      >= 0.906466  (96.7% of sup 0.9375)
  max sweep  >= 0.211011  (87.7% of sup 0.240625)
  max term   >= 0.617477  (91.1% of sup 0.678125)
  => attainable p_act >= -0.315729   vs provable bound  -0.3703125
  => the real gap is 0.055 in p units, not the 0.13-0.15 uniform sampling implied
```

**And the gap is shrinking with search effort, not converging.** 400 restarts
put the witness at `−0.2919`; 4000 restarts moved it to `−0.3050`; combining
both searches' best axes gives `−0.3157`. Every increment of search pushes it
toward the provable bound. **The "gap" measures how hard someone looked, not how
much margin exists.**

**Three zones, which is the operative summary:**

| zone | range | status |
|---|---|---|
| provably safe | `g ≤ −0.3703125` | ship this |
| unproven | `−0.3703125 < g ≤ −0.3157` | no witness *yet*; shrinking every time anyone searches |
| demonstrably broken | `g > −0.3157` | a witness coordinate exists |

A guard at `−0.30` needs `term > 0.6000` to be wrong; `0.6175` is *directly
reachable by search on the real domain*. So such a guard does not "occasionally
clip with probability P" — **it clips structurally, wherever the field visits
that region.** (An earlier version of this entry derived `P ≈ 2e-10` for this
from a tail extrapolation and called it "one pixel every few visits". That was
wrong by many orders of magnitude and has been deleted: a rare-event
extrapolation from uniform samples cannot see a region a search reaches
directly.)

**Conclusion, now *a fortiori* rather than by exhortation:** the provable bound
and the demonstrated-attainable bound are 0.055 apart in `p`, the interval
between them is not a margin but an unsearched region, and nothing distinguishes
a guard placed inside it from one placed just past the moving edge of what
search has found. **Only the sup-based bound `g ≤ −0.3703125` is shippable.**

Caveat, stated rather than buried: GPU `sin()` precision differs from JS
`Math.sin`, and `fract(sin(x) * 43758.5453)` is notoriously hardware-dependent,
so **individual witness coordinates will not transfer to the GPU**. What
transfers is the structural fact that `fbm` reaches ~91% of its supremum under
search on this domain — and, in the safe direction, that a witness existing in
*any* faithful arithmetic is reason enough not to ship a bound that depends on
it not existing. **None of this informs the shipped decision** — the algebra in
Steps 1-4 is precision-independent, resting only on `fract ∈ [0,1)` and the
convexity of `mix`.

### What tightening would actually buy

Fragments evaluated = `vUv.y < (1 − g) × dissolveStart`. The *relative*
reduction in evaluated fragments is independent of `dissolveStart`:

| guard | canvas evaluated | fBm fragments removed vs `−0.6` | `A` ceiling before clipping | `A` headroom |
|---|---|---|---|---|
| **`−0.6` (current)** | 36.92% | — | 1.238 | **37.6%** |
| `−0.45` | 33.46% | **9.375%** | 1.017 | 13.1% |
| `−0.40` | 32.31% | 12.5% | 0.943 | 4.9% |
| `−0.39` (comment) | 32.08% | 13.1% | 0.929 | 3.2% |
| `−0.3703125` (exact) | 31.62% | 14.36% | 0.900 | **0%** |

Ceilings are truncated toward the unsafe side and floors away from it (raw:
1.238710 / 1.017512 / 0.943779 / 0.929032), so no figure in this entry overstates
how far a literal may move. The last column is headroom on `A`
(`DISSOLVE_NOISE_AMP`) specifically, not a global margin.

Cost model, with `r = c_fbm / c_base` (cost of the two 4-octave fBm calls vs the
rest of `effect()`). Instruction-counting puts `r ≈ 1.0-1.3`: the base path is
~27 transcendentals (2 pre-warp + 5 per iteration × 5 iterations), the fBm block
is 2 × 4 × 4 = **32 `sin` calls** plus 8 bilinear blends. Total hero fragment
cost ∝ `c_base + 0.3692·c_fbm`; saving = `Δ·c_fbm / (c_base + 0.3692·c_fbm)`:

| `r` | saving at `−0.45` | saving at `−0.3703` (zero margin) |
|---|---|---|
| 0.5 | 1.46% | 2.24% |
| **1.0** | **2.53%** | **3.87%** |
| 1.5 | 3.34% | 5.12% |
| 2.0 | 3.98% | 6.10% |

**Ceiling on this batch: ~4-6% of the hero shader's fragment cost, and ~2.5% for
the recommended-margin variant.** Note this is a fraction of the *shader*, which
is itself a fraction of `gpu.webglMsPerFrame`, which is a fraction of
`gpu.busyMsPerFrame`.

**The conclusion does not depend on `r`, which is the one estimated quantity in
this entry.** Saving = `Δ·r / (1 + 0.3692·r)`, so as `r → ∞` (fBm dominating the
shader entirely) it converges to `Δ / 0.3692` — the fraction of *band* fragments
removed: **9.375% for `−0.45`, 14.36% at zero margin.** The asymptotic ceiling on
the recommended variant is therefore 9.375% of the entire hero shader, still
under a ≥10% band, before accounting for the shader being only part of the
metric. No value of `r`, however large, rescues this batch — so the instruction
count above is corroboration, not load-bearing.

Branch divergence does not change with the bound: the guard boundary is a single
horizontal line in screen space, so the number of *partially* divergent
wavefronts is O(canvas width / tile width) either way. Moving the line only
changes how many wavefronts are skipped **whole**.

### Why the harness cannot measure it — this is the decisive point

Task 3 measured `gpu.webglMsPerFrame` at 0.593 / 0.578 on two back-to-back
10 s idle-hero windows: **2.5% run-to-run spread**. The band formula is
`max(10% of median, 1 × IQR, minBand)`, so the acceptance band on that metric
is **≥ 10%**.

The best case above is ~4-6% *of the shader*, i.e. comfortably under 4-6% of the
metric — roughly **2× the rig's own noise and ~2-4× inside the band**. The
recommended-margin variant at ~2.5% is *at* the noise floor.

`npm run perf` therefore cannot return "improved beyond band" for this
hypothesis, no matter how well it is implemented. Per the shared batch
procedure, a within-band result is a measured no-op and the batch is reverted.
**The revert is decidable from arithmetic before the rig is ever booked**, which
is the entire reason this half ran rig-independently. Booking a quiet machine
for two full gate passes to reach a foregone conclusion is the expensive way to
learn this.

### Why `−0.6` is the right constant even ignoring perf

`p_act = T − A·(S − 0.5)(1 + k)` depends on **four literals in three places**,
none of which carries a comment linking it to the guard:

| literal | value | where |
|---|---|---|
| `T` — `thin` lower edge | `0.24` | inline, `smoothstep(0.24, 0.56, field)` |
| `A` — `DISSOLVE_NOISE_AMP` | `0.9` | module-level const, **documented as a tuning knob** |
| `k` — sweep scale | `0.55` | inline, `* 0.55` |
| `S` — fBm gain sum | `0.9375` | implied by `fbm()`'s octave count + `a *= 0.5` |

The guard is a *derived* constant with no compile-time link to its inputs, so
the margin's job is not to cover uncertainty in today's algebra (there is none —
it is a hard supremum). **Its job is to survive an edit to one of those four
literals by someone who does not re-derive it.** CLAUDE.md names
`DISSOLVE_NOISE_AMP` as a tuning knob for exactly this kind of edit.

| what changes | `−0.6` survives | `−0.45` survives |
|---|---|---|
| `DISSOLVE_NOISE_AMP` raised | up to **1.238** | up to 1.017 |
| sweep scale `k` raised | up to **1.133** | up to 0.752 |
| fBm octaves added | any N (limit `−0.4575`) | up to **N = 7** (N ≥ 8 clips) |
| `thin` lower edge lowered | down to **0.011** | down to 0.161 |

`−0.45` breaks on a `DISSOLVE_NOISE_AMP` raise to `1.02` (its exact ceiling is
1.017512, so `1.02` is already past it). That is
a plausible one-character tuning change, and its failure mode is silent: a
horizontal clip line across the dissolve edge, at a `vUv.y` that no existing
test samples (`hero-dissolve.spec.ts` probes three fixed heights; the pixel gate
freezes 3 seeds). `−0.6` gives 2.9× the headroom of `−0.45` on every *continuous*
axis — not a coincidence: each literal's headroom is proportional to the guard's
own margin in `p` (`−g − p_act`, i.e. 0.2297 vs 0.0797 = 2.88×) — and its entire
cost is ~2.5% of one shader's fragment time that no instrument in this repo can
resolve.

**Had `−0.6` needed justification beyond "it was picked", this is it — and the
justification is robustness, not the (unmeasured) perf win it was shipped for.**

### Recommendation

- **Do not tighten. `−0.6` stands. Task 7 (B1) is a derived no-op**, on the
  campaign's own terms: the derivation is the deliverable, no shader line
  changed, and no rig time is owed to this hypothesis.
- If a future batch ever *does* want the band back (e.g. B2 shows the hero
  shader is genuinely fragment-bound and worth 3% more), the safe target is
  **`−0.45`**, and it must ship **in the same commit as** a comment recording
  `p_act = T − A(S−0.5)(1+k)` next to all four literals. Never as a bare number.
- **APPLIED** (review extended the boundary for this one block): the guard
  comment at `FluidWaves.tsx:195` now carries the closed form, the correct
  `−0.3703` bound (not `−0.39`), the correct ~63% skip fraction (not ~77%), and
  a "retune ⇒ re-derive" instruction naming all four literals. Comment-only, but
  the GLSL is a template literal, so the shader source string and `index.js`
  bytes both move — verified with `npx playwright test pixel-gate --workers=1`:
  **30 passed, zero goldens touched**, `tsc --noEmit` exit 0, lint 0 errors. The
  log cannot defend a constant it does not sit next to; the next person to touch
  this guard reads the code.

### Provenance

Algebra by hand, re-checked with `node -e`; noise ranges read from
`FluidWaves.tsx:127-138`; geometry from `FluidWaves.tsx:394-405` +
`src/index.css:361,392`; tail statistics from an fp32-emulated transcription
(scratchpad, not committed — it proves nothing the algebra does not, and would
invite someone to fit a bound to it). Spread and band figures quoted from this
file's Task 3 entries. **No measurement was run for this batch: `npm run perf`,
`perf/lighthouse.mjs`, the pixel gate and the Playwright suite were all left
alone deliberately** (contended rig), and none of them is load-bearing for a
conclusion that is decidable from arithmetic.
