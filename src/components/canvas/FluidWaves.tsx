import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useMotion } from '../../context/MotionContext'

// Tricolor as GLSL vec3s — #E64D66, #4D80E6, #E6CC4D (contrast-audited in
// the plan; the hero scrim guarantees AA for text above the paint).
// Pre-baked as Float32Arrays so uniform3fv uploads don't convert per call.
const COLOR_1 = new Float32Array([0.902, 0.302, 0.4])
const COLOR_2 = new Float32Array([0.302, 0.502, 0.902])
const COLOR_3 = new Float32Array([0.902, 0.8, 0.302])

const DPR_CAP = 1.5
const FLOW_SPEED = 0.35
const CONTRAST = 2.0

// Organic-dissolve tuning (hero variant). AA for the hero/nav text is NOT the
// shader's job — the paint renders fully raw everywhere except the dissolve
// band; contrast lives on the glyphs themselves via a layered ink aurora
// text-shadow (see .hero-name / .hero-role / dark-nav rules in index.css).
// Cream dissolve: the threshold is displaced per-column by fBm for liquid
// fingers; the bottom CREAM_FLOOR of the canvas is forced 100% cream regardless.
const DISSOLVE_FINGER_AMP = 0.06
const CREAM_FLOOR = 0.035

const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

// fluid-swirl fragment shader, de-spun: the polar-angle pre-pass
// (new_pixel_angle / spin_* uniforms) is replaced by a seeded crossed-sine
// domain warp, so the paint drifts as scattered waves instead of orbiting.
// Pixel quantization removed (Task 2, spec §1) — the UV is now sampled
// directly for smooth, block-free paint.
const fragmentShader = `
  precision highp float;

  uniform vec2 resolution;
  uniform float time;
  uniform float seed;
  uniform vec3 colour_1;
  uniform vec3 colour_2;
  uniform vec3 colour_3;
  uniform float contrast;
  // Cream dissolve (hero variant only): over a canvas-space band at the very
  // bottom of the section the paint mixes toward cream #F5F2EC and desaturates,
  // so the shader itself melts into the page surface (replacing the old CSS
  // .hero-veil). dissolveStart = the band's top as a fraction of canvas height
  // measured from the BOTTOM (vUv.y), derived from real layout at resize time;
  // dissolveStrength = 1 for hero, 0 for backdrop (backdrop keeps opaque paint).
  uniform float dissolveStart;
  uniform float dissolveStrength;

  varying vec2 vUv;

  // Value-noise fBm for organic, NON-periodic edges. Pure sines ripple into a
  // regular zigzag (a "wobbly line"); layered hash-noise reads as liquid fingers
  // and wisps. Seed + a slow time drift make it breathe with the simulation.
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

  vec4 effect(vec2 screenSize, vec2 screen_coords) {
    vec2 uv = (screen_coords.xy - 0.5 * screenSize.xy) / length(screenSize.xy);

    uv *= 30.0;
    float speed = time * ${FLOW_SPEED.toFixed(2)};

    // Scattered wave pre-warp (replaces the swirl): two crossed sine fields
    // phase-shifted by the per-load seed so every visit scatters differently.
    // Spatial frequencies 0.22 / 0.41 are deliberately non-commensurate — close
    // values (e.g. 0.35 / 0.30) beat into visible banding; these interfere
    // irregularly for an organic scatter.
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

    // 1.38 folds in the retired spin_amount term (0.5 * 0.36 + 1.2) so the
    // paint bands keep the vault look exactly.
    float contrast_mod = (0.25 * contrast + 1.38);
    float paint_res = min(2.0, max(0.0, length(uv) * 0.035 * contrast_mod));
    float c1p = max(0.0, 1.0 - contrast_mod * abs(1.0 - paint_res));
    float c2p = max(0.0, 1.0 - contrast_mod * abs(paint_res));
    float c3p = 1.0 - min(1.0, c1p + c2p);

    vec3 ret_col = (0.3 / contrast) * colour_1 +
                   (1.0 - 0.3 / contrast) * (colour_1 * c1p + colour_2 * c2p + colour_3 * c3p);

    // ---- Organic cream dissolve (noise-displaced threshold = liquid fingers).
    // The dissolve height is displaced per-column by the flow field so cream eats
    // up into the paint with fingers that move with the sim — never a linear cut.
    // Paint first thins (desaturated toward its own luma — colour drains before
    // value, paint into paper not a white wash) then mixes to cream.
    float finger = (fbm(vec2(vUv.x * 3.0, dissolveStart * 4.0) + vec2(time * 0.06, seed * 5.0)) - 0.5) * 2.0;
    float edge = dissolveStart + finger * ${DISSOLVE_FINGER_AMP.toFixed(3)};
    float diss = smoothstep(edge, 0.0, vUv.y);
    // HARD GUARANTEE: the bottom CREAM_FLOOR band is 100% cream regardless of the
    // noise, so the canvas seats seamlessly on the cream section below it.
    float floorCream = 1.0 - smoothstep(${CREAM_FLOOR.toFixed(3)}, ${(CREAM_FLOOR + 0.012).toFixed(3)}, vUv.y);
    diss = max(diss, floorCream) * dissolveStrength;
    float luma = dot(ret_col, vec3(0.299, 0.587, 0.114));
    ret_col = mix(ret_col, vec3(luma), diss * 0.7);
    ret_col = mix(ret_col, vec3(0.9608, 0.9490, 0.9255), diss);
    return vec4(ret_col, 1.0);
  }

  void main() {
    gl_FragColor = effect(resolution, vUv * resolution);
  }
`

export function FluidWaves({ variant }: { variant: 'hero' | 'backdrop' }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { alpha: false })
    if (!gl) {
      setWebglFailed(true)
      return
    }

    const createShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vShader = createShader(gl.VERTEX_SHADER, vertexShader)
    const fShader = createShader(gl.FRAGMENT_SHADER, fragmentShader)
    if (!vShader || !fShader) {
      setWebglFailed(true)
      return
    }

    const program = gl.createProgram()
    if (!program) {
      setWebglFailed(true)
      return
    }
    gl.attachShader(program, vShader)
    gl.attachShader(program, fShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebglFailed(true)
      return
    }

    const positionLoc = gl.getAttribLocation(program, 'position')
    const resolutionLoc = gl.getUniformLocation(program, 'resolution')
    const timeLoc = gl.getUniformLocation(program, 'time')
    const seedLoc = gl.getUniformLocation(program, 'seed')
    const colour1Loc = gl.getUniformLocation(program, 'colour_1')
    const colour2Loc = gl.getUniformLocation(program, 'colour_2')
    const colour3Loc = gl.getUniformLocation(program, 'colour_3')
    const contrastLoc = gl.getUniformLocation(program, 'contrast')
    const dissolveStartLoc = gl.getUniformLocation(program, 'dissolveStart')
    const dissolveStrengthLoc = gl.getUniformLocation(program, 'dissolveStrength')

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )

    const seed = Math.random()
    const startTime = performance.now()
    let rafId: number | null = null
    let inView = true

    // One-time GL state. This canvas owns a private context and nothing below
    // touches program/attribute/uniform bindings again, so everything constant
    // after link is uploaded once here; per-frame work is time + drawArrays,
    // per-resize work is resolution (see resize()).
    gl.useProgram(program)
    gl.uniform1f(seedLoc, seed)
    gl.uniform3fv(colour1Loc, COLOR_1)
    gl.uniform3fv(colour2Loc, COLOR_2)
    gl.uniform3fv(colour3Loc, COLOR_3)
    gl.uniform1f(contrastLoc, CONTRAST)
    // Dissolve is hero-only: the backdrop keeps its opaque paint (its CSS
    // dim/saturate treatment is what the Contact/Footer AA table depends on —
    // untouched). dissolveStart is set per-resize below from the zone/section geometry.
    gl.uniform1f(dissolveStrengthLoc, variant === 'hero' ? 1.0 : 0.0)
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height)
      // Dissolve band = the part of the hero section BELOW the 100svh zone
      // (the ~30svh veil region), expressed as a fraction of the full section
      // height measured from the bottom (vUv.y). Derived from actual layout so
      // the svh ratio never gets hardcoded and mobile URL-bar collapse (which
      // resizes both together) stays consistent. Backdrop has no zone → 0.
      if (variant === 'hero') {
        const section = canvas.clientHeight
        const zoneEl = document.querySelector('.hero-zone') as HTMLElement | null
        const zone = zoneEl?.clientHeight ?? section
        gl.uniform1f(dissolveStartLoc, section > 0 ? (section - zone) / section : 0)
      } else {
        gl.uniform1f(dissolveStartLoc, 0)
      }
      // Setting canvas.width/height reallocates AND clears the drawing buffer
      // (opaque black with {alpha:false}). Under reduced motion no loop will
      // repaint it and the IO only repaints on viewport re-entry — so an
      // in-view resize (window resize, mobile URL-bar collapse) must redraw
      // its one static frame here or the canvas stays black for the session.
      if (prefersReducedMotion && inView) drawFrame(seed * 10)
    }

    const drawFrame = (timeSec: number): void => {
      gl.uniform1f(timeLoc, timeSec)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (): void => {
      drawFrame((performance.now() - startTime) / 1000)
      rafId = requestAnimationFrame(loop)
    }

    const start = (): void => {
      if (rafId === null && !prefersReducedMotion) {
        rafId = requestAnimationFrame(loop)
      }
    }
    const stop = (): void => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    resize()
    window.addEventListener('resize', resize)

    if (prefersReducedMotion) {
      // One static frame, time frozen at a seed-derived phase; no loop.
      canvas.dataset.static = 'true'
      drawFrame(seed * 10)
    } else {
      // rAF loop starts at mount (spec §2) — no entrance gate. One frame is
      // drawn immediately so the first paint has content, then the IO starts
      // the continuous loop while in view.
      drawFrame((performance.now() - startTime) / 1000)
      if (inView) start()
    }

    // Pause the loop when off-screen. data-paused reflects visibility for
    // EVERY canvas — reduced motion included (codex P2-3 fix) — set/cleared
    // BEFORE the reduced-motion branch. Under reduced motion there is no loop,
    // but one frame is repainted on re-entry (resize may have cleared it).
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      // Every canvas reflects visibility via data-paused — reduced motion too.
      if (inView) canvas.removeAttribute('data-paused')
      else canvas.dataset.paused = 'true'
      if (prefersReducedMotion) {
        if (inView) drawFrame(seed * 10) // one-frame repaint on re-entry
        return
      }
      if (inView) start()
      else stop()
    })
    io.observe(canvas)

    // WebGL context loss (GPU reset, tab-backgrounding on some drivers): stop
    // the loop and drop to the fallback rather than rendering a frozen or black
    // canvas. The fallback is permanent by design — webglFailed unmounts the
    // canvas, so no restore handshake is possible (or attempted).
    const handleContextLost = (): void => {
      stop()
      setWebglFailed(true)
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      gl.deleteProgram(program)
      gl.deleteShader(vShader)
      gl.deleteShader(fShader)
      gl.deleteBuffer(buffer)
    }
  }, [prefersReducedMotion, variant])

  if (webglFailed) {
    // Hero: layered-gradient fallback so the stage never renders black-on-black.
    // Backdrop: nothing — the stage ink (#0B0E14) stands on its own.
    return variant === 'hero'
      ? <div className="fluid-waves-fallback" data-testid="fluid-waves-fallback" aria-hidden="true" />
      : <></>
  }

  return (
    <canvas
      ref={canvasRef}
      className={variant === 'hero' ? 'fluid-waves-canvas' : 'fluid-waves-canvas fluid-waves-canvas--backdrop'}
      data-canvas={variant === 'hero' ? 'fluid-waves' : 'fluid-waves-backdrop'}
      // Marks the hero canvas as carrying the active cream-dissolve uniforms
      // (the shader-side replacement for the removed .hero-veil).
      data-dissolve={variant === 'hero' ? 'hero' : undefined}
      aria-hidden="true"
    />
  )
}
