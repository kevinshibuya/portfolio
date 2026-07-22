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

  varying vec2 vUv;

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
      aria-hidden="true"
    />
  )
}
