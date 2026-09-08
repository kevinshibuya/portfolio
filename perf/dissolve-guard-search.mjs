// Task 7 (B1) — the search behind every empirical number in
// `perf/decisions.md` § "2026-08-17 · Task 7 (B1) · Dissolve-band early-exit
// guard — bound derivation".
//
// WHY THIS FILE EXISTS. Four passes of that entry each produced a figure the
// next pass had to retract, and every one of them was a figure with no script
// behind it. The round-3 review's structural finding was: commit the search
// next to the numbers. This is that script. Every empirical figure in the entry
// is reproduced by one of the modes below, with its search domain PRINTED, so a
// reader can re-run it instead of trusting a transcription.
//
// WHAT IT IS NOT. Nothing here is load-bearing for the shipped decision. The
// guard `if (p > -0.6)` rests on the closed form in Steps 1-4 of that entry:
//
//     p_act = T - A*(S - 0.5)*(1 + k) = 0.24 - 0.9*0.678125 = -0.3703125
//
// which is precision-independent (it needs only `fract in [0,1)` and the
// convexity of `mix`). This script measures how loose that sup is. A bound must
// NEVER be fitted to its output — see the entry's "the guard is a DERIVED
// constant with no compile-time link to its four inputs" argument.
//
// PRECISION CAVEAT, and it is a real one. `hash` is
// `fract(sin(dot(p, k)) * 43758.5453)`, which is notoriously hardware-dependent:
// GPU `sin()` is not JS `Math.sin`. `Math.fround` at every step emulates fp32
// STORAGE, not the GPU's transcendental accuracy. Consequence: the MAGNITUDES
// below are meaningful, individual witness COORDINATES are not — they will not
// transfer to a GPU. That is exactly why the shipped bound is algebraic.
//
// USAGE
//   node perf/dissolve-guard-search.mjs per-axis   [restarts=40000]
//   node perf/dissolve-guard-search.mjs joint      [p=-0.3157] [restarts=40000]
//   node perf/dissolve-guard-search.mjs boundary   [restarts=40000]
//   node perf/dissolve-guard-search.mjs product    [samples=5e6]
//   node perf/dissolve-guard-search.mjs all
//
// Deterministic: a fixed-seed PRNG, so a re-run reproduces a re-run.

const f = Math.fround

// --- shader constants, read from src/components/canvas/FluidWaves.tsx --------
const DISSOLVE_NOISE_AMP = 0.9 // A   :35
const SWEEP_SCALE = 0.55 // k   :216  (fbm(...) - 0.5) * 0.55
const THIN_EDGE_LO = 0.24 // T   :227  smoothstep(0.24, 0.56, field)
const OCTAVES = 4 //     :134  for (int i = 0; i < 4; i++)
const GAIN_SUM = 0.9375 // S   = 0.5 + 0.25 + 0.125 + 0.0625
const DISSOLVE_START = 0.2308 // (130svh - 100svh) / 130svh, nominal

// --- fp32 transcription of the shader's noise stack -------------------------
// FluidWaves.tsx:127-138, byte-for-byte in structure.
function hash(x, y) {
  const d = f(f(x * 127.1) + f(y * 311.7))
  return f(f(Math.sin(d) * 43758.5453) - Math.floor(f(Math.sin(d) * 43758.5453)))
}

function vnoise(x, y) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = f(x - ix)
  const fy = f(y - iy)
  const ux = f(f(fx * fx) * f(3.0 - f(2.0 * fx)))
  const uy = f(f(fy * fy) * f(3.0 - f(2.0 * fy)))
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  const top = f(a + f(f(b - a) * ux))
  const bot = f(c + f(f(d - c) * ux))
  return f(top + f(f(bot - top) * uy))
}

function fbm(x, y) {
  let v = 0.0
  let a = 0.5
  let px = x
  let py = y
  for (let i = 0; i < OCTAVES; i++) {
    v = f(v + f(a * vnoise(px, py)))
    px = f(f(px * 2.0) + 3.1)
    py = f(f(py * 2.0) + 3.1)
    a = f(a * 0.5)
  }
  return v
}

// --- the flow coordinate `uv` at the moment the dissolve block reads it ------
// This is the coupling that the row-pinned search exists to respect: `n`'s
// sampling coordinate is dragged by the SAME warped `uv` the paint uses, so at
// one fragment you do not get to choose `n` and `sweep` independently.
// FluidWaves.tsx:140-164, with screen_coords = vUv * resolution (`main()`:240).
const FLOW_SPEED = 0.35

function flowUv(vUvx, vUvy, seed, time, W, H) {
  const L = f(Math.sqrt(f(f(W * W) + f(H * H))))
  let ux = f(f(f(vUvx - 0.5) * W) / L)
  let uy = f(f(f(vUvy - 0.5) * H) / L)
  ux = f(ux * 30.0)
  uy = f(uy * 30.0)
  const speed = f(time * FLOW_SPEED)

  const wx = f(1.2 * Math.sin(f(f(f(uy * 0.22) + f(speed * 0.32)) + f(seed * 6.2831))))
  const wy = f(1.2 * Math.cos(f(f(f(ux * 0.41) - f(speed * 0.24)) + f(seed * 12.566))))
  ux = f(ux + wx)
  uy = f(uy + wy)

  let u2 = f(ux + uy)
  for (let i = 0; i < 5; i++) {
    u2 = f(u2 + f(Math.sin(Math.max(ux, uy)) + ux))
    const u2y = f(u2 + uy) // uv2 is vec2(uv.x+uv.y) — both lanes equal
    const nx = f(ux + f(0.5 * Math.cos(f(f(5.1123314 + f(0.353 * u2y)) + f(speed * 0.131121)))))
    const ny = f(uy + f(0.5 * Math.sin(f(u2 - f(0.113 * speed)))))
    ux = nx
    uy = ny
    const sub = f(f(1.0 * Math.cos(f(ux + uy))) - f(1.0 * Math.sin(f(f(ux * 0.711) - uy))))
    ux = f(ux - sub)
    uy = f(uy - sub)
  }
  return [ux, uy]
}

// --- the two noise reads, exactly as the shader issues them -----------------
// n:     FluidWaves.tsx:211
// sweep: FluidWaves.tsx:216
function nAt(vUvx, vUvy, seed, time, W, H) {
  const [ux, uy] = flowUv(vUvx, vUvy, seed, time, W, H)
  const x = f(f(f(vUvx * 5.0) + f(ux * 0.06)) + f(seed * 9.0))
  const y = f(f(f(vUvy * 2.2) + f(uy * 0.06)) + f(time * 0.05))
  return fbm(x, y)
}

function sweepFbmAt(vUvx, seed, time) {
  const x = f(f(vUvx * 1.3) + f(seed * 3.0))
  const y = f(time * 0.03)
  return fbm(x, y)
}

// `term` is the whole noise contribution: field = p + term * amp, and for every
// p <= 0.55 (which is every p any negative guard governs) amp = A exactly.
function termAt(vUvx, vUvy, seed, time, W, H) {
  const n = nAt(vUvx, vUvy, seed, time, W, H)
  const sweep = f(f(sweepFbmAt(vUvx, seed, time) - 0.5) * SWEEP_SCALE)
  return { n, sweep, term: f(f(n - 0.5) + sweep) }
}

// --- deterministic PRNG (mulberry32) ---------------------------------------
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- search domains, PRINTED with every result ------------------------------
// Important 4 of the round-3 review: the -0.21 figure was a function of an
// UNRECORDED time domain, and widening it 1e4 -> 1e5 moved the answer by 0.08
// in p. A domain that is not printed is not a result.
const DOMAIN = {
  vUvx: [0, 1], // the canvas, in UV
  seed: [0, 1], // Math.random() at mount (FluidWaves seeds per instance)
  time: [0, 1e5], // seconds of sim clock — 1e5 s ~ 27.8 h of continuous drift
  aspects: [
    [1440, 900],
    [1440, 1080],
    [390, 844],
    [2560, 1440],
  ],
}

function describeDomain() {
  return (
    `    vUv.x  in [${DOMAIN.vUvx[0]}, ${DOMAIN.vUvx[1]}]\n` +
    `    seed   in [${DOMAIN.seed[0]}, ${DOMAIN.seed[1]}]\n` +
    `    time   in [${DOMAIN.time[0]}, ${DOMAIN.time[1]}] s\n` +
    `    aspect in {${DOMAIN.aspects.map(([w, h]) => `${w}x${h}`).join(', ')}}`
  )
}

// --- hill-climb: random restart + shrinking coordinate steps ----------------
function hillClimb(objective, dims, restarts, rand) {
  let best = { value: -Infinity, at: null }
  for (let r = 0; r < restarts; r++) {
    const x = dims.map((d) => d.lo + rand() * (d.hi - d.lo))
    let v = objective(x)
    let step = dims.map((d) => (d.hi - d.lo) * 0.1)
    for (let iter = 0; iter < 60; iter++) {
      let improved = false
      for (let k = 0; k < dims.length; k++) {
        for (const sign of [1, -1]) {
          const cand = x.slice()
          cand[k] = Math.min(dims[k].hi, Math.max(dims[k].lo, cand[k] + sign * step[k]))
          const cv = objective(cand)
          if (cv > v) {
            v = cv
            x[k] = cand[k]
            improved = true
          }
        }
      }
      if (!improved) step = step.map((s) => s * 0.5)
      if (step.every((s) => s < 1e-9)) break
    }
    if (v > best.value) best = { value: v, at: x.slice() }
  }
  return best
}

// ============================================================================
// MODE: per-axis — the individual maxima of `n` and of `sweep`
// ============================================================================
// Reproduces the entry's "Per-axis maxima" table. NOTE the entry's own warning,
// which this script does not let you forget: combining a best-`n` witness with
// a best-`sweep` witness is an UPPER BOUND (`<=`), never a witness, because the
// coupling forbids both maxima at one fragment. The combined figure is printed
// as `<=` for that reason.
function modePerAxis(restarts) {
  const rand = rng(0x5eed1)
  console.log(`\n=== per-axis maxima · ${restarts} restarts ===`)
  console.log('  domain:')
  console.log(describeDomain())

  const [W, H] = DOMAIN.aspects[0]
  const bestN = hillClimb(
    ([x, y, s, t]) => nAt(x, y, s, t, W, H),
    [
      { lo: 0, hi: 1 },
      { lo: 0, hi: 1 },
      { lo: DOMAIN.seed[0], hi: DOMAIN.seed[1] },
      { lo: DOMAIN.time[0], hi: DOMAIN.time[1] },
    ],
    restarts,
    rand,
  )

  const bestSweepFbm = hillClimb(
    ([x, s, t]) => sweepFbmAt(x, s, t),
    [
      { lo: DOMAIN.vUvx[0], hi: DOMAIN.vUvx[1] },
      { lo: DOMAIN.seed[0], hi: DOMAIN.seed[1] },
      { lo: DOMAIN.time[0], hi: DOMAIN.time[1] },
    ],
    restarts,
    rand,
  )

  const sweepVal = (bestSweepFbm.value - 0.5) * SWEEP_SCALE
  const supSweep = (GAIN_SUM - 0.5) * SWEEP_SCALE

  console.log(`\n  n      best found  ${bestN.value.toFixed(6)}   (${((bestN.value / GAIN_SUM) * 100).toFixed(1)}% of sup ${GAIN_SUM})`)
  console.log(`  sweep  fbm best    ${bestSweepFbm.value.toFixed(6)}  => sweep = ${sweepVal.toFixed(6)}`)
  console.log(`                     (${((sweepVal / supSweep) * 100).toFixed(1)}% of sup ${supSweep.toFixed(6)})`)
  const combined = bestN.value - 0.5 + sweepVal
  console.log(`\n  max term  <=  ${combined.toFixed(6)}   <-- UPPER BOUND, NOT a witness.`)
  console.log(`  Both maxima at one fragment is exactly what the coupling forbids;`)
  console.log(`  the joint mode below is what actually reaches a value.`)
  return { bestN: bestN.value, bestSweepFbm: bestSweepFbm.value, sweepVal, combined }
}

// ============================================================================
// MODE: joint — the row-pinned search. THIS is the one that produces witnesses.
// ============================================================================
// Asking "is guard g broken" PINS vUv.y, because p = 1 - vUv.y/dissolveStart.
// So the search has vUv.y fixed and ranges only over what a fragment on that
// row can actually vary: vUv.x, seed, time, aspect.
function modeJoint(p, restarts) {
  const rand = rng(0x5eed2)
  const vUvy = (1 - p) * DISSOLVE_START
  const needed = (THIN_EDGE_LO - p) / DISSOLVE_NOISE_AMP

  console.log(`\n=== joint (row-pinned) · p = ${p} · ${restarts} restarts ===`)
  console.log(`  vUv.y pinned at ${vUvy.toFixed(6)}   (p = 1 - vUv.y/${DISSOLVE_START})`)
  console.log(`  term needed to break this guard: (T - p)/A = ${needed.toFixed(6)}`)
  console.log('  domain (vUv.y NOT free):')
  console.log(describeDomain())

  let best = { value: -Infinity, at: null, aspect: null }
  for (const [W, H] of DOMAIN.aspects) {
    const r = hillClimb(
      ([x, s, t]) => termAt(x, vUvy, s, t, W, H).term,
      [
        { lo: DOMAIN.vUvx[0], hi: DOMAIN.vUvx[1] },
        { lo: DOMAIN.seed[0], hi: DOMAIN.seed[1] },
        { lo: DOMAIN.time[0], hi: DOMAIN.time[1] },
      ],
      Math.ceil(restarts / DOMAIN.aspects.length),
      rand,
    )
    console.log(`    ${W}x${H}: max term ${r.value.toFixed(6)}`)
    if (r.value > best.value) best = { value: r.value, at: r.at, aspect: [W, H] }
  }

  const field = p + best.value * DISSOLVE_NOISE_AMP
  const parts = termAt(best.at[0], vUvy, best.at[1], best.at[2], best.aspect[0], best.aspect[1])
  console.log(`\n  BEST max joint term  ${best.value.toFixed(6)}   (needed ${needed.toFixed(6)})`)
  console.log(`    n = ${parts.n.toFixed(6)}  sweep = ${parts.sweep.toFixed(6)}`)
  console.log(`    neither axis is near its own max — that IS the coupling`)
  console.log(`  field at witness      ${field.toFixed(6)}   (T = ${THIN_EDGE_LO})`)
  console.log(`  guard g = ${p} is ${field > THIN_EDGE_LO ? 'DEMONSTRABLY BROKEN' : 'NOT broken by this search (absence of evidence)'}`)
  return { term: best.value, field, needed }
}

// ============================================================================
// MODE: boundary — the least-negative p that a WITNESS actually breaks
// ============================================================================
// This replaces the entry's "-0.21", which was never witnessed: it was produced
// by inverting a max term measured on a DIFFERENT row, which the section's own
// opening sentence (vUv.y must be pinned) forbids. Here every candidate p is
// searched on its own row, so the reported figure is a witness or it is nothing.
function modeBoundary(restarts) {
  console.log(`\n=== boundary: the least-negative p with an actual witness ===`)
  console.log(`  Each p is searched ON ITS OWN ROW. No cross-row transfer.`)
  console.log('  domain:')
  console.log(describeDomain())
  console.log(`\n      p        max term    needed      field       breaks?`)

  const results = []
  let broken = null
  for (let p = -0.16; p >= -0.36001; p -= 0.01) {
    const rand = rng(0x5eed3 + Math.round(-p * 1000))
    const vUvy = (1 - p) * DISSOLVE_START
    const needed = (THIN_EDGE_LO - p) / DISSOLVE_NOISE_AMP
    let bestTerm = -Infinity
    for (const [W, H] of DOMAIN.aspects) {
      const r = hillClimb(
        ([x, s, t]) => termAt(x, vUvy, s, t, W, H).term,
        [
          { lo: DOMAIN.vUvx[0], hi: DOMAIN.vUvx[1] },
          { lo: DOMAIN.seed[0], hi: DOMAIN.seed[1] },
          { lo: DOMAIN.time[0], hi: DOMAIN.time[1] },
        ],
        Math.ceil(restarts / DOMAIN.aspects.length),
        rand,
      )
      if (r.value > bestTerm) bestTerm = r.value
    }
    const field = p + bestTerm * DISSOLVE_NOISE_AMP
    const breaks = field > THIN_EDGE_LO
    if (breaks) broken = p
    results.push({ p, bestTerm, needed, field, breaks })
    console.log(
      `  ${p.toFixed(3).padStart(7)}   ${bestTerm.toFixed(6)}   ${needed.toFixed(6)}   ${field.toFixed(6)}   ${breaks ? 'YES' : 'no'}`,
    )
  }
  console.log(`\n  Lowest p with a demonstrated witness: ${broken === null ? 'none in range' : broken.toFixed(3)}`)
  console.log(`  Everything below that is UNPROVEN, not safe. The shipped bound`)
  console.log(`  is the algebraic ${(THIN_EDGE_LO - DISSOLVE_NOISE_AMP * (GAIN_SUM - 0.5) * (1 + SWEEP_SCALE)).toFixed(7)}, and it owes nothing to this table.`)
  return { broken, results }
}

// ============================================================================
// MODE: product — independent-coordinate sampling. NOT the real manifold.
// ============================================================================
function modeProduct(samples) {
  const rand = rng(0x5eed4)
  console.log(`\n=== product sampling · ${samples.toExponential(0)} samples ===`)
  console.log(`  n and sweep drawn at INDEPENDENT coordinates — this is NOT the`)
  console.log(`  joint manifold. Recorded only because its magnitude agrees.`)
  const [W, H] = DOMAIN.aspects[0]
  let maxTerm = -Infinity
  for (let i = 0; i < samples; i++) {
    const n = nAt(rand(), rand(), rand(), rand() * DOMAIN.time[1], W, H)
    const sw = f(f(sweepFbmAt(rand(), rand(), rand() * DOMAIN.time[1]) - 0.5) * SWEEP_SCALE)
    const t = n - 0.5 + sw
    if (t > maxTerm) maxTerm = t
  }
  const supTerm = (GAIN_SUM - 0.5) * (1 + SWEEP_SCALE)
  console.log(`  max (n - 0.5 + sweep) = ${maxTerm.toFixed(6)}  (${((maxTerm / supTerm) * 100).toFixed(1)}% of sup ${supTerm.toFixed(6)})`)
  console.log(`  implied p_act = T - A*term = ${(THIN_EDGE_LO - DISSOLVE_NOISE_AMP * maxTerm).toFixed(6)}`)
  return { maxTerm }
}

// --- entry point ------------------------------------------------------------
const mode = process.argv[2] ?? 'all'
const arg1 = process.argv[3]
const arg2 = process.argv[4]

console.log('Task 7 (B1) dissolve-guard search — perf/decisions.md, entry B1')
console.log(`Constants read from FluidWaves.tsx: T=${THIN_EDGE_LO} A=${DISSOLVE_NOISE_AMP} k=${SWEEP_SCALE} octaves=${OCTAVES} S=${GAIN_SUM}`)
console.log(`Closed-form provable bound: p_act = T - A*(S-0.5)*(1+k) = ${(THIN_EDGE_LO - DISSOLVE_NOISE_AMP * (GAIN_SUM - 0.5) * (1 + SWEEP_SCALE)).toFixed(7)}`)
console.log('fp32 STORAGE emulated via Math.fround; GPU sin() differs — magnitudes transfer, coordinates do not.')

if (mode === 'per-axis') modePerAxis(Number(arg1 ?? 40000))
else if (mode === 'joint') modeJoint(Number(arg1 ?? -0.3157), Number(arg2 ?? 40000))
else if (mode === 'boundary') modeBoundary(Number(arg1 ?? 40000))
else if (mode === 'product') modeProduct(Number(arg1 ?? 5e6))
else if (mode === 'all') {
  modePerAxis(4000)
  modeJoint(-0.3157, 4000)
  modeBoundary(4000)
} else {
  console.error(`unknown mode: ${mode}`)
  process.exit(2)
}
