// The GPU-execution timer, and the proof that it measures anything.
//
// WHY THIS FILE EXISTS AT ALL
//
// Task 5b's sensitivity proof failed: doubling the fragment shader's main
// per-pixel loop moved `gpu.webglMsPerFrame` (since renamed
// `gpu.decodeMsPerFrame`) by -0.0048 and +0.0129 across two
// A-B-A rounds — noise. The failure was the instrument, not the shader. Both
// Layer 2 GPU metrics are CPU-side trace events (`ThreadControllerImpl::RunTask`
// = CPU task time in the GPU process, `WebGL` = command-buffer DECODE), and
// doubling shader ALU issues the IDENTICAL command stream: same decode cost,
// same CPU task time, more GPU work. Invisible by construction.
//
// This file is the replacement instrument AND its evidence, in one place, on
// purpose. Task 7 round 4's structural finding — four passes each produced a
// figure the next had to retract, and every one of them lacked a script — is
// the reason the script ships next to the numbers rather than after them.
//
// STANDING PROHIBITION, inherited from `perf/dissolve-guard-search.mjs`:
// never fit a bound to this file's output. It reports what it measured, in the
// domain it printed; it does not decide anything.
//
// ROUTE
//
// Kevin's 2026-08-24 ruling said `EXT_disjoint_timer_query_webgl2`. That
// extension cannot attach here: the hero canvas is WebGL **1**
// (`FluidWaves.tsx` -> `getContext('webgl', { alpha: false })`). The 2026-08-31
// probe found WebGL1's `EXT_disjoint_timer_query` available on this rig and
// able to time the real canvas, so Route C was approved in chat — a
// runner-side timer, NO app-code edit, which keeps Layer 2's hard rule
// (`perf/lib/instrument.mjs`) intact. Route B (upgrading the canvas to webgl2)
// was declined: it edits shipped rendering code on the campaign's most
// visually sensitive surface purely to enable measurement.
//
// USAGE
//
//   node perf/gpu-timer-probe.mjs availability   # what this rig exposes
//   node perf/gpu-timer-probe.mjs hero [seconds] # time the real hero canvas
//   node perf/gpu-timer-probe.mjs aba [seconds]  # full plant/revert proof
//   node perf/gpu-timer-probe.mjs overhead [s]   # does the timer perturb frame time?
//   node perf/gpu-timer-probe.mjs aaa [seconds]  # noise floor: three UNPLANTED legs
//
// `hero` and `aba` need a server on 4173 serving the real `dist/` — the same
// `vite preview` Task 3 pins as the perf server. `aba` manages its own builds
// and restarts preview per leg (a stale sirv snapshot 404s hashed assets).

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const VIEWPORT = { width: 1440, height: 900 }

// Must match `browser.mjs`'s DEVICE_SCALE_FACTOR. At 1 the canvas backing
// store caps at DPR 1 instead of 1.5, so the shaded area — and therefore the
// GPU time — is a DIFFERENT QUANTITY from the harness's own metric. An
// earlier version of this probe defaulted to 1 and read 3.85 ms where the
// runner reads 5.92 for the same idle hero.
const DEVICE_SCALE_FACTOR = 2

// The harness's own launch args, duplicated rather than imported because
// `browser.mjs` does not export them. Occlusion/backgrounding heuristics are
// the loudest source of "the numbers changed and the code didn't" on a Mac.
const LAUNCH_ARGS = [
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-background-timer-throttling',
  '--disable-features=CalculateNativeWinOcclusion',
  `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
]

const BASE_URL = 'http://localhost:4173'
const PERF_PARAMS = 'perf-seed=0.5&perf-role=0'
const SHADER_FILE = 'src/components/canvas/FluidWaves.tsx'

/**
 * The timer itself, as a page init script.
 *
 * Installed the only way Layer 2 is allowed to install anything: from the
 * runner side, before any page script runs, wrapping
 * `HTMLCanvasElement.prototype.getContext` and then that context's
 * `drawArrays` — the same shape as the existing `firstDraw` hook in
 * `perf/lib/instrument.mjs`. The app cannot tell it is here.
 *
 * Three correctness rules, each of which is a way this measurement can lie:
 *   - NEVER block on a result. `getQueryObjectEXT(QUERY_RESULT_EXT)` on an
 *     unavailable query stalls the pipeline, which would change the very frame
 *     it is trying to measure. Availability is polled and results are drained
 *     on later frames.
 *   - A `GPU_DISJOINT_EXT` window invalidates every query overlapping it (the
 *     GPU was preempted / clocked around). Those are DISCARDED and COUNTED,
 *     never averaged in.
 *   - A missing extension records itself as missing. It never reports zero,
 *     because a silent zero is indistinguishable from a free shader.
 */
export const GPU_TIMER_INIT = String.raw`
(() => {
  if (window.__GPUTIMER__) return;
  var G = { samples: {}, disjoint: 0, hooked: [], missing: [] };
  window.__GPUTIMER__ = G;

  var origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var ctx = origGetContext.apply(this, arguments);
    var isGL = type === 'webgl' || type === 'experimental-webgl';
    if (!ctx || !isGL) return ctx;

    var canvas = this;
    var ext = ctx.getExtension('EXT_disjoint_timer_query');
    var label = (canvas.dataset && canvas.dataset.canvas) || 'canvas';
    if (!ext) { G.missing.push(label); return ctx; }
    G.hooked.push(label);

    var pending = [];
    var origDraw = ctx.drawArrays;
    ctx.drawArrays = function () {
      var q = ext.createQueryEXT();
      ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, q);
      var out = origDraw.apply(ctx, arguments);
      ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
      pending.push(q);

      // The label is read at DRAW time, not at getContext time: React may not
      // have committed the data-canvas attribute when the context is created.
      var key = (canvas.dataset && canvas.dataset.canvas) || 'canvas';
      if (!G.samples[key]) G.samples[key] = [];

      var still = [];
      for (var i = 0; i < pending.length; i++) {
        var pq = pending[i];
        if (ctx.getParameter(ext.GPU_DISJOINT_EXT)) {
          G.disjoint++;
          ext.deleteQueryEXT(pq);
          continue;
        }
        if (ext.getQueryObjectEXT(pq, ext.QUERY_RESULT_AVAILABLE_EXT)) {
          G.samples[key].push(ext.getQueryObjectEXT(pq, ext.QUERY_RESULT_EXT));
          ext.deleteQueryEXT(pq);
        } else still.push(pq);
      }
      pending = still;
      return out;
    };
    return ctx;
  };
})();
`

const percentile = (sorted, p) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null

/** Nanoseconds in, a millisecond summary out. */
export function summarise(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  return {
    n: sorted.length,
    zeros: sorted.filter((v) => v === 0).length,
    p50Ms: sorted.length ? percentile(sorted, 0.5) / 1e6 : null,
    p95Ms: sorted.length ? percentile(sorted, 0.95) / 1e6 : null,
    minMs: sorted.length ? sorted[0] / 1e6 : null,
    maxMs: sorted.length ? sorted[sorted.length - 1] / 1e6 : null,
  }
}

async function withPage(fn) {
  const browser = await chromium.launch({ headless: false, args: LAUNCH_ARGS })
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    })
    return await fn(await context.newPage())
  } finally {
    await browser.close()
  }
}

/** What does THIS rig actually expose? Probed, never assumed from docs. */
async function availability() {
  const out = await withPage(async (page) =>
    page.evaluate(() => {
      const report = {}
      const gl1 = document.createElement('canvas').getContext('webgl', { alpha: false })
      report.webgl1 = !!gl1
      report.webgl1Timer = gl1 ? !!gl1.getExtension('EXT_disjoint_timer_query') : null

      const gl2 = document.createElement('canvas').getContext('webgl2', { alpha: false })
      report.webgl2 = !!gl2
      const ext2 = gl2 ? gl2.getExtension('EXT_disjoint_timer_query_webgl2') : null
      report.webgl2Timer = !!ext2
      // Existence is not usefulness: a driver may advertise the extension and
      // then report zero counter bits, making every elapsed time identically 0.
      report.counterBits = ext2 ? gl2.getQuery(ext2.TIME_ELAPSED_EXT, ext2.QUERY_COUNTER_BITS_EXT) : null

      const dbg = gl1 && gl1.getExtension('WEBGL_debug_renderer_info')
      report.renderer = dbg ? gl1.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null
      return report
    }),
  )
  console.log('renderer            :', out.renderer)
  console.log('webgl1 context      :', out.webgl1, '| EXT_disjoint_timer_query        :', out.webgl1Timer)
  console.log('webgl2 context      :', out.webgl2, '| EXT_disjoint_timer_query_webgl2 :', out.webgl2Timer)
  console.log('QUERY_COUNTER_BITS  :', out.counterBits)
  return out
}

/** Time the real hero canvas over one window. */
async function hero(seconds) {
  return withPage(async (page) => {
    await page.addInitScript(GPU_TIMER_INIT)
    await page.goto(`${BASE_URL}/?${PERF_PARAMS}`, { waitUntil: 'load' })
    await page.waitForTimeout(seconds * 1000)
    const raw = await page.evaluate(() => ({
      samples: window.__GPUTIMER__.samples,
      disjoint: window.__GPUTIMER__.disjoint,
      hooked: window.__GPUTIMER__.hooked,
      missing: window.__GPUTIMER__.missing,
    }))
    const byCanvas = {}
    for (const [key, samples] of Object.entries(raw.samples)) byCanvas[key] = summarise(samples)
    return { ...raw, byCanvas }
  })
}

const sh = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8' })

/**
 * One A-B-A leg: rebuild, restart preview, prove what is in the SERVED bundle,
 * measure. The preview restart is not optional — a stale sirv snapshot serves
 * the old hashed assets and the leg silently measures the wrong build.
 */
async function leg(name, seconds) {
  sh('npx', ['vite', 'build'])
  try {
    sh('pkill', ['-f', 'vite preview --port 4173'])
  } catch {
    // No preview running is the normal case on the first leg.
  }
  const preview = execFileSync('sh', [
    '-c',
    'nohup npx vite preview --port 4173 >/dev/null 2>&1 & sleep 4; echo up',
  ])
  if (!String(preview).includes('up')) throw new Error(`preview did not start for leg ${name}`)

  // Search for the GLSL text VERBATIM, spaces included. The shader is a
  // template literal, so esbuild never touches its whitespace — an earlier
  // guard looked for the minified `i<10`, found nothing, and correctly
  // refused to call the run a proof.
  let planted = 0
  try {
    planted = sh('grep', ['-ro', 'int i = 0; i < 10', 'dist/assets/']).trim().split('\n').filter(Boolean).length
  } catch {
    planted = 0
  }
  const measured = await hero(seconds)
  const summary = measured.byCanvas['fluid-waves'] ?? null
  console.log(
    `leg ${name.padEnd(3)} | plant in served bundle: ${planted} | ` +
      `n ${summary?.n ?? 0} | disjoint ${measured.disjoint} | zeros ${summary?.zeros ?? 0} | ` +
      `p50 ${summary?.p50Ms?.toFixed(4) ?? 'null'} ms | p95 ${summary?.p95Ms?.toFixed(4) ?? 'null'} ms`,
  )
  return { name, planted, disjoint: measured.disjoint, ...summary }
}

/**
 * The acceptance proof: does the instrument SEE the plant the old metrics were
 * blind to? A-B-A, because a single A-B pair cannot distinguish a real shift
 * from drift — that is how Task 5b's rounds stayed honest.
 */
async function aba(seconds) {
  if (!existsSync(SHADER_FILE)) throw new Error(`missing ${SHADER_FILE}`)
  const revert = () => sh('git', ['checkout', '--', SHADER_FILE])

  console.log('plant: `for (int i = 0; i < 5; i++)` -> `i < 10` (doubles the main per-pixel loop)')
  try {
    revert()
    const a1 = await leg('A1', seconds)

    const before = readFileSync(SHADER_FILE, 'utf8')
    const after = before.replace('for (int i = 0; i < 5; i++)', 'for (int i = 0; i < 10; i++)')
    if (after === before) throw new Error('plant site not found — the shader loop changed shape')
    writeFileSync(SHADER_FILE, after)
    const b = await leg('B', seconds)

    revert()
    const a2 = await leg('A2', seconds)

    const controlMean = (a1.p50Ms + a2.p50Ms) / 2
    const spread = Math.abs(a1.p50Ms - a2.p50Ms)
    const delta = b.p50Ms - controlMean
    console.log('')
    console.log(`control-to-control spread : ${spread.toFixed(4)} ms`)
    console.log(`plant - control mean      : ${delta >= 0 ? '+' : ''}${delta.toFixed(4)} ms ` +
      `(${((delta / controlMean) * 100).toFixed(1)}%)`)
    console.log(`signal-to-noise           : ${spread > 0 ? (delta / spread).toFixed(0) : 'inf'}x`)
    if (b.planted !== 1 || a1.planted !== 0 || a2.planted !== 0) {
      console.log('WARNING: the served bundle did not carry the expected plant state — this run proves nothing.')
    }
  } finally {
    revert()
    try {
      sh('pkill', ['-f', 'vite preview --port 4173'])
    } catch {
      // Already gone.
    }
    console.log(`src diff after revert: ${sh('git', ['diff', '--name-only', 'src/']).trim() || '(empty)'}`)
  }
}

/**
 * A bare rAF ring buffer, so frame time can be measured with the GPU timer
 * installed and without it. Deliberately NOT `instrument.mjs`'s script: this
 * has to isolate the timer's cost, so nothing else may differ between legs.
 */
const FRAME_INIT = String.raw`
(() => {
  var F = [];
  window.__FRAMES__ = F;
  var loop = function (t) { F.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
`

async function frameWindow({ withTimer, seconds }) {
  return withPage(async (page) => {
    // Order matters: the timer script integrates its own drawArrays wrapper, so
    // it must not be stacked under another one.
    if (withTimer) await page.addInitScript(GPU_TIMER_INIT)
    await page.addInitScript(FRAME_INIT)
    await page.goto(`${BASE_URL}/?${PERF_PARAMS}`, { waitUntil: 'load' })
    await page.waitForTimeout(seconds * 1000)
    const stamps = await page.evaluate(() => window.__FRAMES__)
    const deltas = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b)
    return {
      frames: deltas.length,
      p50: percentile(deltas, 0.5),
      p95: percentile(deltas, 0.95),
    }
  })
}

/**
 * Step 3 of Task 7b, and a gate on the whole approach: a timer query per frame
 * plus the drain loop is work, and if it moves the frame times it would be
 * collected alongside then it may not share a window with `frame.*`.
 *
 * The bar is the one `trace.mjs:11-18` set for tracing overhead: a difference
 * below the measurement's own resolution. A-B-A again, because a single pair
 * cannot separate the timer's cost from drift.
 */
async function overhead(seconds) {
  const off1 = await frameWindow({ withTimer: false, seconds })
  const on = await frameWindow({ withTimer: true, seconds })
  const off2 = await frameWindow({ withTimer: false, seconds })

  const row = (name, r) =>
    `${name.padEnd(12)} p50 ${r.p50.toFixed(3)} ms | p95 ${r.p95.toFixed(3)} ms | ${r.frames} frames`
  console.log(row('timer OFF 1', off1))
  console.log(row('timer ON', on))
  console.log(row('timer OFF 2', off2))

  const offP50 = (off1.p50 + off2.p50) / 2
  const offSpread = Math.abs(off1.p50 - off2.p50)
  console.log('')
  console.log(`off-to-off p50 spread : ${offSpread.toFixed(4)} ms  (the measurement's own resolution)`)
  console.log(`timer effect on p50   : ${(on.p50 - offP50 >= 0 ? '+' : '')}${(on.p50 - offP50).toFixed(4)} ms`)
  console.log(
    (Math.abs(on.p50 - offP50) <= Math.max(offSpread, 0.001)
      ? 'VERDICT: below the measurement resolution — the timer may share a window with frame.*'
      : 'VERDICT: ABOVE resolution — the timer needs its own pass, per Task 7b Step 3'),
  )
}

/**
 * The noise floor, and the control for `aba`.
 *
 * Three identical unplanted legs, each with its own rebuild, preview restart
 * and browser. If their spread is the size of the plant's effect then `aba`
 * cannot separate signal from drift no matter how many samples each leg holds
 * — the limit is leg-to-leg, not within-leg. Running this BEFORE trusting an
 * A-B-A is the difference between an instrument and a number.
 */
async function aaa(seconds) {
  const legs = []
  for (const name of ['A1', 'A2', 'A3']) legs.push(await leg(name, seconds))
  const p50s = legs.map((l) => l.p50Ms)
  const spread = Math.max(...p50s) - Math.min(...p50s)
  const mean = p50s.reduce((a, b) => a + b, 0) / p50s.length
  console.log('')
  console.log(`unplanted leg-to-leg spread : ${spread.toFixed(4)} ms (${((spread / mean) * 100).toFixed(1)}% of mean)`)
  console.log(`mean p50                    : ${mean.toFixed(4)} ms`)
  console.log('An A-B-A can only resolve a plant LARGER than this spread.')
}

// Only dispatch when RUN, not when imported: other harness scripts reuse
// GPU_TIMER_INIT and summarise(), and a bare import must not execute a mode.
const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

const [mode = 'availability', secondsArg] = runDirectly ? process.argv.slice(2) : ['none']
const seconds = Number(secondsArg ?? 6)

if (!runDirectly) {
  // imported as a library — nothing to do
} else if (mode === 'availability') await availability()
else if (mode === 'hero') console.log(JSON.stringify(await hero(seconds), null, 2))
else if (mode === 'aba') await aba(seconds)
else if (mode === 'overhead') await overhead(seconds)
else if (mode === 'aaa') await aaa(seconds)
else if (runDirectly) {
  console.error(`unknown mode "${mode}" — expected availability | hero | aba | aaa | overhead`)
  process.exit(1)
}
