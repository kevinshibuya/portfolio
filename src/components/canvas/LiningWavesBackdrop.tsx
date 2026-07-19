import { useEffect, useRef, useState, type ReactElement } from 'react'
import * as THREE from 'three'
import { useMotion } from '../../context/MotionContext'

const DPR_CAP = 1.5

// ADAPTED: reminder-state + center-dimming uniforms/props removed; vertex
// shader is the vault's, unchanged.
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

// ADAPTED from vault lining-waves fragment shader: hash/noise/fbm/lines copied
// verbatim; reminder-state baseColor branches and the center-dimming block
// deleted; baseColor is now a dim cream, mixed over the page ink instead of
// black; thickness/distortion tuned for a subtle backdrop.
const fragmentShader = `
  precision mediump float;
  uniform vec2 iResolution;
  uniform float iTime;
  varying vec2 vUv;

  // Simple hash-based noise (vault, unchanged)
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i.x + i.y*57.0);
    float b = hash(i.x+1.0 + i.y*57.0);
    float c = hash(i.x + (i.y+1.0)*57.0);
    float d = hash(i.x+1.0 + (i.y+1.0)*57.0);
    return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
  }

  // Fractal Brownian Motion (vault, unchanged)
  float fbm(vec2 p) {
    float sum = 0.0, amp = 0.5, freq = 1.0;
    for(int i=0;i<6;i++){
      sum += amp * noise(p*freq);
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }

  // Wavy lines pattern (vault, unchanged)
  float lines(vec2 uv, float thickness, float distortion) {
    float y = uv.y + distortion * fbm(uv*2.0 + iTime*0.1);
    float pattern = fract(y * 20.0);
    return smoothstep(0.5-thickness, 0.5, pattern)
         - smoothstep(0.5,       0.5+thickness, pattern);
  }

  void mainImage(out vec4 O, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution;
    uv.x *= iResolution.x / iResolution.y;

    // ADAPTED: thickness 0.02 -> 0.015, distortion 0.1 -> 0.12 (subtler lines).
    float thickness = 0.015;
    float distortion = 0.12;
    float wave = lines(uv, thickness, distortion);

    // ADAPTED: reminder-state ternary deleted — dim cream #F5F2EC*0.22.
    vec3 baseColor = vec3(0.961, 0.949, 0.925) * 0.22;

    // ADAPTED: mix over page ink #0B0E14 instead of vec3(0.0) (pure black).
    vec3 col = mix(vec3(0.043, 0.055, 0.078), baseColor, wave);

    // ADAPTED: center-dimming block deleted entirely.
    O = vec4(col, 1.0);
  }

  void main() {
    mainImage(gl_FragColor, vUv * iResolution);
  }
`

export default function LiningWavesBackdrop(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      // ADAPTED: alpha false + explicit clear color to the page ink; DPR capped.
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP))
    renderer.setClearColor(0x0b0e14, 1)

    const canvas = renderer.domElement
    canvas.dataset.canvas = 'lining-waves'
    container.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const clock = new THREE.Clock()

    // ADAPTED: uniforms reduced to iTime + iResolution (reminder/dimming gone).
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2() },
    }
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)

    // ADAPTED: size from the CONTAINER, not window. A window resize listener
    // alone misses container-only reflows (language switch, font swap) that
    // don't fire a window resize event, so a ResizeObserver on the container
    // is the primary driver; the window listener stays as a cheap belt-and-
    // braces fallback for environments without RO.
    const onResize = (): void => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h, false)
      uniforms.iResolution.value.set(w, h)
    }
    window.addEventListener('resize', onResize)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)
    onResize()

    // ADAPTED: time fed at 0.4x for a slow drift.
    const renderFrame = (t: number): void => {
      uniforms.iTime.value = t
      renderer.render(scene, camera)
    }
    const loop = (): void => {
      renderFrame(clock.getElapsedTime() * 0.4)
    }

    let running = false
    const start = (): void => {
      if (running || prefersReducedMotion) return
      running = true
      renderer.setAnimationLoop(loop)
    }
    const stop = (): void => {
      running = false
      renderer.setAnimationLoop(null)
    }

    if (prefersReducedMotion) {
      // ADAPTED: reduced motion — exactly one frozen frame, no loop.
      canvas.dataset.static = 'true'
      renderFrame(7.0)
    }

    // ADAPTED: IO pauses the loop off-screen (identical semantics to the hero).
    // `isInView` also gates the context-restore handler below so a GPU context
    // restore while scrolled away doesn't resume the loop off-screen.
    let isInView = false
    const io = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting
      if (prefersReducedMotion) {
        if (isInView) renderFrame(7.0)
        return
      }
      if (isInView) {
        canvas.removeAttribute('data-paused')
        start()
      } else {
        canvas.dataset.paused = 'true'
        stop()
      }
    })
    io.observe(container)

    // ADAPTED: S5 — context loss drops to nothing (stage ink stands); on
    // restore, re-init by remounting via the failed→false effect re-run.
    const handleContextLost = (e: Event): void => {
      e.preventDefault()
      stop()
    }
    const handleContextRestored = (): void => {
      onResize()
      // Mirror the hero's pattern: only resume if still on-screen — otherwise
      // leave it paused (stale data-paused, no off-screen GPU burn).
      if (isInView) start()
      else canvas.dataset.paused = 'true'
    }
    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    return () => {
      stop()
      io.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      if (canvas.parentNode === container) container.removeChild(canvas)
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
    }
  }, [prefersReducedMotion])

  if (failed) return <></>
  return <div ref={containerRef} className="lining-waves-backdrop" aria-hidden="true" />
}
