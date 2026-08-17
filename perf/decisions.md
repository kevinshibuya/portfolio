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

