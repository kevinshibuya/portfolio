import { PALETTE, toVec3 } from '../../utils/palette'

/**
 * The paint: one fragment shader, three colours, drawn by at most one WebGL
 * context at any moment.
 *
 * Three kinds of painter share it:
 *   hero    the first screen. Under its type the paint's luminance is capped,
 *           so only the light paint deepens there and the type clears WCAG AA
 *           with no dark layer; under the first screen the paint dissolves
 *           into the cream page along a liquid edge.
 *   footer  the closing ground. Black eats into it from the top along the
 *           same edge. (It is shown darker by a layer in CSS, so a window
 *           that mirrors it still gets the paint at full strength.)
 *   source  a small canvas that is never in the document. It paints only
 *           while a paint window is on screen and no canvas is.
 *
 * A paint window (PaintWindow.tsx) is a 2D canvas that copies a region of
 * whichever painter is drawing, in the same frame, and cuts it to a shape.
 */

const C1 = toVec3(PALETTE.orange)
const C2 = toVec3(PALETTE.periwinkle)
const C3 = toVec3(PALETTE.pink)
const CREAM = toVec3(PALETTE.cream)
const BLACK = toVec3(PALETTE.black)

const DPR_CAP = 1.5
const FLOW_SPEED = 0.35
const CONTRAST = 2.0

// Scroll-coupled sim rate: the paint stirs when the page moves and keeps
// settling after it stops. About 1.5x at a steady wheel scroll, capped at 2x.
const SCROLL_BOOST_MAX = 1.0
const SCROLL_BOOST_GAIN = 1 / 1500
const BOOST_ATTACK_TAU = 0.15
const BOOST_DECAY_TAU = 0.9

// The liquid edge. Band progress plus a 2D fBm field, dragged by the paint's
// own warped coordinate, is thresholded over a narrow window, so the ground
// eats into the paint as fingers that move with it, never as a straight fade.
// EDGE_NOISE_SPAN is the most the noise term can add: (0.9375 - 0.5) for the
// field plus (0.9375 - 0.5) * 0.55 for the sweep.
const EDGE_AMP = 0.9
const EDGE_NOISE_SPAN = 0.678
const EDGE_THRESHOLD = 0.34
const EDGE_FLOOR = 0.035

// Luminance caps near the hero's type. With cream type (L 0.909), a ground at
// 0.14 measures 5.0:1 and one at 0.22 measures 3.5:1.
const CAP_ZONE = 0.15
const CAP_SMALL_TYPE = 0.14
const CAP_NAME = 0.22

// Two contexts must never be seen drawing in the same quarter second, so a
// painter that takes over waits this long after the last frame of the one
// before it. Windows hold their last picture across the gap.
const HANDOFF_MS = 300

// ---------------------------------------------------------------------------
// Determinism hooks for measurement, opt-in through URL params and dormant
// otherwise:
//   ?perf-seed=<float>    takes the place of the per-load Math.random() seed
//   ?perf-freeze=<sec>    no loop; exactly one frame at that sim time
//   ?perf-counters        exposes window.__PERF_GL__[<data-canvas>] GL counters
// ---------------------------------------------------------------------------
interface PerfCounters {
  drawCalls: number
  uniformUploads: number
  frames: number
  resizes: number
  rafLoopStarts: number
}

declare global {
  interface Window {
    __PERF_GL__?: Record<string, PerfCounters>
  }
}

const readPerfFloat = (params: URLSearchParams, key: string): number | null => {
  const raw = params.get(key)
  if (raw === null) return null
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) {
    console.warn(`[perf] ignoring malformed ?${key}=${raw} — expected a number; hook stays off`)
    return null
  }
  return value
}

const PERF = ((): { seed: number | null; freeze: number | null; counters: boolean } => {
  if (typeof window === 'undefined') return { seed: null, freeze: null, counters: false }
  const params = new URLSearchParams(window.location.search)
  return {
    seed: readPerfFloat(params, 'perf-seed'),
    freeze: readPerfFloat(params, 'perf-freeze'),
    counters: params.has('perf-counters'),
  }
})()

/** One seed for the whole visit, so every surface shows the same paint. */
const SEED = PERF.seed ?? Math.random()

const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  uniform vec2 resolution;
  uniform float time;
  uniform float seed;
  uniform vec3 colour_1;
  uniform vec3 colour_2;
  uniform vec3 colour_3;
  uniform float contrast;
  // The solid ground this canvas meets.
  uniform vec3 paper;
  // Hero: the top of the dissolve band as a fraction of the canvas height,
  // measured from the bottom. 0 leaves the bottom edge raw.
  uniform float dissolveStart;
  uniform float dissolveAmp;
  // Footer: the fraction of the canvas height, from the top, the ground eats into.
  uniform float sinkTop;
  // Hero: the boxes of the name, the role line and the header links, in canvas
  // pixels from the bottom left (x0, y0, x1, y1). An empty box is ignored.
  uniform vec4 nameBox;
  uniform vec4 roleBox;
  uniform vec4 navBox;

  varying vec2 vUv;

  // Value-noise fBm for organic edges that never repeat.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.0 + 3.1; a *= 0.5; }
    return v;
  }

  // Scale a colour down until its luminance is at most 'cap'. Darker colours pass through.
  vec3 capLum(vec3 c, float cap) {
    vec3 l = pow(max(c, 0.0), vec3(2.2));
    float L = dot(l, vec3(0.2126, 0.7152, 0.0722));
    return L > cap ? pow(l * (cap / L), vec3(1.0 / 2.2)) : c;
  }

  // 1 inside a box and for a few pixels round it, falling to 0 along an edge
  // the noise pushes outward only, so the inside is covered whatever the noise says.
  float boxMask(vec4 b, vec2 f, float nz) {
    if (b.z <= b.x) return 0.0;
    float d = max(max(b.x - f.x, f.x - b.z), max(b.y - f.y, f.y - b.w));
    return 1.0 - smoothstep(6.0, 6.0 + 0.07 * resolution.y, d - nz * 0.11 * resolution.y);
  }

  // How far the ground has eaten into the paint near an edge. 'edge' is the
  // distance to that canvas edge as a fraction of the canvas height, 'band'
  // the height of the band in the same unit. Returns (cover, thinning).
  vec2 eat(float edge, float band, float amp, vec2 flow, float phase) {
    float p = 1.0 - edge / max(band, 1e-4);
    float cover = 0.0;
    float thin = 0.0;
    // The field cannot fire below p = 0.24 - 0.9 * 0.678 = -0.37, so the noise
    // is skipped above that with headroom.
    if (p > -0.6) {
      float n = fbm(vec2(vUv.x * 5.0, edge * 2.2) + flow * 0.06 + vec2(seed * 9.0 + phase, time * 0.05));
      // A long sweep moves the mean height of the edge across the width, so
      // no stretch of it settles into a horizontal line.
      float sweep = (fbm(vec2(vUv.x * 1.3 + seed * 3.0 + phase, time * 0.03)) - 0.5) * 0.55;
      float a = amp * (1.0 - smoothstep(0.55, 1.0, p));
      float field = p + (n - 0.5 + sweep) * a;
      cover = smoothstep(${EDGE_THRESHOLD.toFixed(2)}, 0.60, field);
      // The paint thins (drains toward its own grey) just ahead of the ground.
      thin = smoothstep(0.24, 0.56, field);
    }
    // The outermost strip is solid ground whatever the noise says.
    float solid = 1.0 - smoothstep(${EDGE_FLOOR.toFixed(3)}, ${(EDGE_FLOOR + 0.012).toFixed(3)}, edge);
    return vec2(max(cover, solid), max(thin, solid));
  }

  vec4 effect(vec2 screenSize, vec2 screen_coords) {
    vec2 uv = (screen_coords.xy - 0.5 * screenSize.xy) / length(screenSize.xy);

    uv *= 30.0;
    float speed = time * ${FLOW_SPEED.toFixed(2)};

    // Scattered wave pre-warp: two crossed sine fields phase-shifted by the
    // seed. The frequencies 0.22 and 0.41 are deliberately non-commensurate.
    uv += 1.2 * vec2(
      sin(uv.y * 0.22 + speed * 0.32 + seed * 6.2831),
      cos(uv.x * 0.41 - speed * 0.24 + seed * 12.566)
    );

    vec2 uv2 = vec2(uv.x + uv.y);

    for (int i = 0; i < 5; i++) {
      uv2 += sin(max(uv.x, uv.y)) + uv;
      uv += 0.5 * vec2(
        cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121),
        sin(uv2.x - 0.113 * speed)
      );
      uv -= 1.0 * cos(uv.x + uv.y) - 1.0 * sin(uv.x * 0.711 - uv.y);
    }

    float contrast_mod = (0.25 * contrast + 1.38);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);

    vec3 ret_col = (0.3 / contrast) * colour_1 +
                   (1.0 - 0.3 / contrast) * (colour_1 * c1p + colour_2 * c2p + colour_3 * c3p);

    // Every block below is guarded on a uniform: drivers cannot fold a
    // uniform away, so without the branch every canvas would pay the noise.
    if (dissolveStart > 0.0) {
      // The type zone: a pool that opens from the lower left, where the name
      // sits, and a band under the header. Its edge rides the noise field.
      float zy = (vUv.y - dissolveStart) / max(1.0 - dissolveStart, 1e-4);
      float tn = fbm(vec2(vUv.x * 2.2, vUv.y * 1.8) + uv * 0.07 + vec2(seed * 5.0 + 11.0, time * 0.04));
      float xr = 0.80 * max(1.0, 1.3 * resolution.y / resolution.x);
      float field = length(vec2(vUv.x / xr, max(zy, 0.0) / 0.62)) + (tn - 0.47) * 0.30;
      float fade = smoothstep(-0.18, -0.02, zy);
      float guard = (1.0 - smoothstep(1.02, 1.30, field)) * fade;
      float band = 1.0 - smoothstep(0.18, 0.36, (1.0 - zy) + (tn - 0.47) * 0.22);
      ret_col = mix(ret_col, capLum(ret_col, ${CAP_ZONE.toFixed(2)}), max(band, guard));
      // The measured boxes of the type itself are always covered.
      vec2 f = vUv * resolution;
      ret_col = mix(ret_col, capLum(ret_col, ${CAP_NAME.toFixed(2)}), boxMask(nameBox, f, tn));
      ret_col = mix(ret_col, capLum(ret_col, ${CAP_SMALL_TYPE.toFixed(2)}), max(boxMask(roleBox, f, tn), boxMask(navBox, f, tn)));

      vec2 e = eat(vUv.y, dissolveStart, dissolveAmp, uv, 0.0);
      float luma = dot(ret_col, vec3(0.299, 0.587, 0.114));
      ret_col = mix(ret_col, vec3(luma), e.y * 0.45);
      ret_col = mix(ret_col, paper, e.x);
    }
    if (sinkTop > 0.0) {
      vec2 e = eat(1.0 - vUv.y, sinkTop, ${EDGE_AMP.toFixed(2)}, uv, 17.0);
      float luma = dot(ret_col, vec3(0.299, 0.587, 0.114));
      ret_col = mix(ret_col, vec3(luma), e.y * 0.45);
      ret_col = mix(ret_col, paper, e.x);
    }
    return vec4(ret_col, 1.0);
  }

  void main() {
    gl_FragColor = effect(resolution, vUv * resolution);
  }
`

// ---------------------------------------------------------------------------
// One painter at a time
// ---------------------------------------------------------------------------

export type PaintKind = 'hero' | 'footer' | 'source'

/** A rectangle of a painter's canvas, as fractions measured from its top left. */
interface Region {
  x: number
  y: number
  w: number
  h: number
}

// The part of each painter a window copies: clear of the dissolve, the sink
// and, on the hero, of the capped zone round the type.
const REGIONS: Record<PaintKind, Region> = {
  hero: { x: 0.52, y: 0.2, w: 0.36, h: 0.4 },
  footer: { x: 0.5, y: 0.52, w: 0.4, h: 0.44 },
  source: { x: 0, y: 0, w: 1, h: 1 },
}

interface Painter {
  kind: PaintKind
  /** Canvases on screen outrank the source. */
  priority: number
  canvas: HTMLCanvasElement
  /** Begin painting: a loop, or one frame when nothing moves. */
  start: () => void
  stop: () => void
  /** One more frame at the current time, for a window that has just appeared. */
  redraw: () => void
}

let holder: Painter | null = null
let granted = false
let grantTimer = 0
let lastDrawAt = -Infinity
let lastDrawBy: Painter | null = null
const queue = new Set<Painter>()

function grant(painter: Painter): void {
  holder = painter
  granted = false
  queue.delete(painter)
  const wait = lastDrawBy && lastDrawBy !== painter ? Math.max(0, HANDOFF_MS - (performance.now() - lastDrawAt)) : 0
  window.clearTimeout(grantTimer)
  const go = (): void => {
    if (holder !== painter) return
    granted = true
    painter.start()
  }
  if (wait > 0) grantTimer = window.setTimeout(go, wait)
  else go()
}

function request(painter: Painter): void {
  if (holder === painter) return
  if (!holder) {
    grant(painter)
    return
  }
  if (holder.priority < painter.priority) {
    const previous = holder
    if (granted) previous.stop()
    queue.add(previous)
    grant(painter)
    return
  }
  queue.add(painter)
}

function release(painter: Painter): void {
  queue.delete(painter)
  if (holder !== painter) return
  window.clearTimeout(grantTimer)
  if (granted) painter.stop()
  holder = null
  granted = false
  let next: Painter | null = null
  for (const waiting of queue) if (!next || waiting.priority > next.priority) next = waiting
  if (next) grant(next)
}

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------

export interface PaintWindow {
  /** Copy the given region of the painting canvas. `feed` changes when the painter does. */
  draw: (source: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, feed: number) => void
}

const windows = new Set<PaintWindow>()
let source: PainterHandle | null | undefined
let feed = 0
let feedOwner: Painter | null = null

function mirror(painter: Painter): void {
  lastDrawAt = performance.now()
  lastDrawBy = painter
  if (windows.size === 0) return
  if (feedOwner !== painter) {
    feedOwner = painter
    feed++
  }
  const { canvas } = painter
  const region = REGIONS[painter.kind]
  const sx = region.x * canvas.width
  const sy = region.y * canvas.height
  const sw = region.w * canvas.width
  const sh = region.h * canvas.height
  for (const win of windows) win.draw(canvas, sx, sy, sw, sh, feed)
}

/** A window has come on screen: it is fed by whichever painter draws, or by the source. */
export function showWindow(win: PaintWindow): void {
  windows.add(win)
  if (source === undefined) source = createSource()
  source?.setInView(true)
  // A painter that holds a still frame owes the new window a copy of it.
  if (holder && granted) holder.redraw()
}

export function hideWindow(win: PaintWindow): void {
  windows.delete(win)
  if (windows.size === 0) source?.setInView(false)
}

// ---------------------------------------------------------------------------
// A painter
// ---------------------------------------------------------------------------

export interface PainterOptions {
  kind: PaintKind
  /** The canvas's identity: its data-canvas attribute and its perf counters key. */
  id: string
  reducedMotion: boolean
  /** Hero: the element whose height is the first screen; the rest of the canvas is the dissolve band. */
  zone?: () => HTMLElement | null
  /** Footer: the share of the canvas height the black eats into from the top. */
  sinkTop?: number
  onFail: () => void
}

export interface PainterHandle {
  /** The canvas has come into, or left, the viewport. */
  setInView: (inView: boolean) => void
  /** Layout may have moved: size the canvas and measure the type again. */
  measure: () => void
  dispose: () => void
}

const EMPTY_BOX = new Float32Array([0, 0, 0, 0])

export function createPainter(canvas: HTMLCanvasElement, options: PainterOptions): PainterHandle | null {
  const { kind, id, reducedMotion, onFail } = options
  const gl = canvas.getContext('webgl', { alpha: false })
  if (!gl) {
    onFail()
    return null
  }

  const perf: PerfCounters | null = PERF.counters
    ? { drawCalls: 0, uniformUploads: 0, frames: 0, resizes: 0, rafLoopStarts: 0 }
    : null
  if (perf) {
    const counted = perf
    const store = window.__PERF_GL__ ?? {}
    store[id] = counted
    window.__PERF_GL__ = store
    const rawDrawArrays = gl.drawArrays.bind(gl)
    gl.drawArrays = (mode, first, count): void => {
      counted.drawCalls++
      rawDrawArrays(mode, first, count)
    }
    const rawUniform1f = gl.uniform1f.bind(gl)
    gl.uniform1f = (location, x): void => {
      counted.uniformUploads++
      rawUniform1f(location, x)
    }
    const rawUniform2f = gl.uniform2f.bind(gl)
    gl.uniform2f = (location, x, y): void => {
      counted.uniformUploads++
      rawUniform2f(location, x, y)
    }
  }

  // Both shaders are compiled and the program linked without asking for a
  // status in between: the status calls are what block the main thread. Where
  // the driver can compile in the background the program is polled once a
  // frame until it is done, and only then is its status read.
  const vShader = gl.createShader(gl.VERTEX_SHADER)
  const fShader = gl.createShader(gl.FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!vShader || !fShader || !program) {
    onFail()
    return null
  }
  gl.shaderSource(vShader, vertexShader)
  gl.compileShader(vShader)
  gl.shaderSource(fShader, fragmentShader)
  gl.compileShader(fShader)
  gl.attachShader(program, vShader)
  gl.attachShader(program, fShader)
  gl.linkProgram(program)
  const parallel = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  let resolutionLoc: WebGLUniformLocation | null = null
  let timeLoc: WebGLUniformLocation | null = null
  let dissolveStartLoc: WebGLUniformLocation | null = null
  let dissolveAmpLoc: WebGLUniformLocation | null = null
  let nameBoxLoc: WebGLUniformLocation | null = null
  let roleBoxLoc: WebGLUniformLocation | null = null
  let navBoxLoc: WebGLUniformLocation | null = null

  let ready = false
  let disposed = false
  let pollRaf = 0
  let rafId: number | null = null
  let inView = false
  let painted = false
  // ?perf-freeze: this canvas draws exactly one frame, ever, through the live
  // frame path, and it wins over reduced motion.
  const frozenAt = PERF.freeze
  let frozenDrawn = false
  const staticTime = SEED * 10
  let simTime = 0
  let boost = 0
  let lastFrame = performance.now()
  let lastScrollY = window.scrollY

  const drawFrame = (timeSec: number): void => {
    if (perf) perf.frames++
    gl.uniform1f(timeLoc, timeSec)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    if (!painted) {
      painted = true
      canvas.dataset.painted = 'true'
    }
    mirror(painter)
  }

  /** The box of an element inside this canvas, in canvas pixels from the bottom left. */
  const boxOf = (
    left: number,
    top: number,
    right: number,
    bottom: number,
    frame: DOMRect,
    scale: number,
  ): Float32Array =>
    new Float32Array([
      (left - frame.left) * scale,
      (frame.bottom - bottom) * scale,
      (right - frame.left) * scale,
      (frame.bottom - top) * scale,
    ])

  // The hero's geometry, read from the real layout so nothing is a hardcoded
  // ratio: where the first screen ends and the dissolve band begins, how far
  // the cream may reach before it would touch the name, and the boxes of the
  // type the paint must stay dark behind.
  const measureHero = (): void => {
    const frame = canvas.getBoundingClientRect()
    const section = frame.height
    const zoneEl = options.zone?.() ?? null
    const zone = zoneEl ? zoneEl.clientHeight : section
    const band = Math.max(0, section - zone)
    const scale = section > 0 ? canvas.height / section : 1
    gl.uniform1f(dissolveStartLoc, section > 0 ? band / section : 0)

    const nameEl = zoneEl?.querySelector<HTMLElement>('.hero-name') ?? null
    const roleEl = zoneEl?.querySelector<HTMLElement>('.hero-role') ?? null
    const navEl = document.querySelector<HTMLElement>('header nav')
    let amp = EDGE_AMP
    if (nameEl) {
      const r = nameEl.getBoundingClientRect()
      gl.uniform4fv(nameBoxLoc, boxOf(r.left, r.top, r.right, r.bottom, frame, scale))
      // The cream may fire up to (noise span * amp - threshold) of a band above
      // the band's top. Hold that short of the name's lower edge.
      const gap = Math.max(0, frame.top + zone - r.bottom)
      if (band > 0) amp = Math.min(EDGE_AMP, (EDGE_THRESHOLD + (0.9 * gap) / band) / EDGE_NOISE_SPAN)
    } else {
      gl.uniform4fv(nameBoxLoc, EMPTY_BOX)
    }
    gl.uniform1f(dissolveAmpLoc, amp)
    if (roleEl) {
      // The line rises into place inside a mask: the mask gives the resting
      // height, the line its width.
      const mask = roleEl.parentElement?.getBoundingClientRect() ?? roleEl.getBoundingClientRect()
      gl.uniform4fv(roleBoxLoc, boxOf(mask.left, mask.top, mask.left + roleEl.offsetWidth, mask.bottom, frame, scale))
    } else {
      gl.uniform4fv(roleBoxLoc, EMPTY_BOX)
    }
    if (navEl) {
      // The header is fixed; the box is where it lies over the canvas with the page at the top.
      // The band runs the full width: the language pair sits on the same line.
      const r = navEl.getBoundingClientRect()
      const shift = window.scrollY
      gl.uniform4fv(navBoxLoc, boxOf(frame.left, r.top - shift, frame.right, r.bottom - shift, frame, scale))
    } else {
      gl.uniform4fv(navBoxLoc, EMPTY_BOX)
    }
  }

  const resize = (): void => {
    if (!ready) return
    if (frozenAt !== null && frozenDrawn) return // keep the one frozen frame intact
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    const width = kind === 'source' ? canvas.width : Math.max(1, Math.round(canvas.clientWidth * dpr))
    const height = kind === 'source' ? canvas.height : Math.max(1, Math.round(canvas.clientHeight * dpr))
    const changed = canvas.width !== width || canvas.height !== height
    if (changed) {
      if (perf) perf.resizes++
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
    if (kind === 'hero') measureHero()
    // Setting canvas.width/height clears the drawing buffer. With no loop
    // running, an in-view resize must redraw its one static frame here.
    if (frozenAt !== null || rafId !== null) return
    if (holder === painter && granted) {
      drawFrame(staticTime)
    } else if (changed && painted) {
      painted = false
      delete canvas.dataset.painted
    }
  }

  const loop = (): void => {
    const now = performance.now()
    // Clamp dt so a jank spike or a background tab cannot jump the sim.
    const dt = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now
    const y = window.scrollY
    const vel = dt > 0 ? Math.abs(y - lastScrollY) / dt : 0
    lastScrollY = y
    const target = Math.min(SCROLL_BOOST_MAX, vel * SCROLL_BOOST_GAIN)
    const tau = target > boost ? BOOST_ATTACK_TAU : BOOST_DECAY_TAU
    boost += (target - boost) * (1 - Math.exp(-dt / tau))
    simTime += dt * (1 + boost)
    drawFrame(simTime)
    rafId = requestAnimationFrame(loop)
  }

  const painter: Painter = {
    kind,
    priority: kind === 'source' ? 1 : 2,
    canvas,
    start: () => {
      if (!ready || disposed) return
      if (frozenAt !== null) {
        if (!frozenDrawn) {
          drawFrame(frozenAt)
          frozenDrawn = true
          canvas.dataset.perfFrozen = 'true'
        }
        return
      }
      if (reducedMotion) {
        drawFrame(staticTime)
        return
      }
      if (rafId === null) {
        if (perf) perf.rafLoopStarts++
        // Re-baseline the clocks: while paused both wall time and scrollY moved.
        lastFrame = performance.now()
        lastScrollY = window.scrollY
        boost = 0
        rafId = requestAnimationFrame(loop)
      }
    },
    stop: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },
    redraw: () => {
      if (!ready || disposed || rafId !== null) return
      // A frozen canvas never paints twice; its windows get the frame it holds
      // only if they were there when it was drawn.
      if (frozenAt !== null) return
      drawFrame(staticTime)
    },
  }

  const want = (): void => {
    if (!ready || disposed) return
    if (inView) request(painter)
    else release(painter)
  }

  const finishSetup = (): void => {
    if (disposed) return
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onFail()
      return
    }
    // This canvas owns a private context and nothing below touches program,
    // attribute or uniform bindings again, so everything constant after link
    // is uploaded once here.
    gl.useProgram(program)
    resolutionLoc = gl.getUniformLocation(program, 'resolution')
    timeLoc = gl.getUniformLocation(program, 'time')
    dissolveStartLoc = gl.getUniformLocation(program, 'dissolveStart')
    dissolveAmpLoc = gl.getUniformLocation(program, 'dissolveAmp')
    nameBoxLoc = gl.getUniformLocation(program, 'nameBox')
    roleBoxLoc = gl.getUniformLocation(program, 'roleBox')
    navBoxLoc = gl.getUniformLocation(program, 'navBox')
    gl.uniform1f(gl.getUniformLocation(program, 'seed'), SEED)
    gl.uniform3fv(gl.getUniformLocation(program, 'colour_1'), C1)
    gl.uniform3fv(gl.getUniformLocation(program, 'colour_2'), C2)
    gl.uniform3fv(gl.getUniformLocation(program, 'colour_3'), C3)
    gl.uniform1f(gl.getUniformLocation(program, 'contrast'), CONTRAST)
    gl.uniform3fv(gl.getUniformLocation(program, 'paper'), kind === 'hero' ? CREAM : BLACK)
    gl.uniform1f(dissolveStartLoc, 0)
    gl.uniform1f(dissolveAmpLoc, EDGE_AMP)
    gl.uniform1f(gl.getUniformLocation(program, 'sinkTop'), kind === 'footer' ? (options.sinkTop ?? 0) : 0)
    gl.uniform4fv(nameBoxLoc, EMPTY_BOX)
    gl.uniform4fv(roleBoxLoc, EMPTY_BOX)
    gl.uniform4fv(navBoxLoc, EMPTY_BOX)
    const positionLoc = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
    ready = true
    if (reducedMotion && frozenAt === null) canvas.dataset.static = 'true'
    resize()
    want()
  }

  const begin = (): void => {
    if (parallel) {
      const poll = (): void => {
        if (disposed) return
        if (gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR)) finishSetup()
        else pollRaf = requestAnimationFrame(poll)
      }
      poll()
    } else {
      finishSetup()
    }
  }
  // A frozen hero frame is measured against the type, so the type's font has
  // to be in before the one frame is drawn.
  if (frozenAt !== null && kind === 'hero' && document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(begin)).catch(begin)
  } else {
    begin()
  }

  // WebGL context loss (GPU reset, tab-backgrounding on some drivers): stop
  // and drop to the fallback for the rest of the page's life.
  const handleContextLost = (): void => {
    release(painter)
    onFail()
  }
  canvas.addEventListener('webglcontextlost', handleContextLost, false)

  return {
    setInView: (value) => {
      inView = value
      want()
    },
    measure: resize,
    dispose: () => {
      disposed = true
      cancelAnimationFrame(pollRaf)
      release(painter)
      if (feedOwner === painter) feedOwner = null
      if (lastDrawBy === painter) lastDrawBy = null
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.deleteProgram(program)
      gl.deleteShader(vShader)
      gl.deleteShader(fShader)
      gl.deleteBuffer(buffer)
    },
  }
}

/** The painter that is never in the document: 480 by 600, enough for the largest window. */
function createSource(): PainterHandle | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 600
  return createPainter(canvas, {
    kind: 'source',
    id: 'fluid-waves-source',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    onFail: () => {},
  })
}
