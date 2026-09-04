import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, invalidate, advance, useThree } from '@react-three/fiber'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { entranceDone } from '../../context/MotionContext'
import { FOV_DEG, sceneGeometry, fogRange } from '../../utils/sceneMotion'
import { createSceneRefs, type SceneRefs } from './scene/sceneRefs'
import { SceneRig } from './scene/SceneRig'
import { Corridor } from './scene/Corridor'
import { SceneTitle } from './scene/SceneTitle'
import { Environment } from './scene/Environment'

/** The cream the scene shares with the section, the fog and the floor. */
const CREAM = '#F5F2EC'

export interface SceneCard {
  slug: string
  title: string
  subtitle: string
  art: string
  alt: string
}

export interface SelectedWorkSceneProps {
  /** Cover art per card, in corridor order; '' renders the frame alone. */
  covers: string[]
  /** Project names, in corridor order, in the active language. */
  titles: string[]
  progress: MotionValue<number>
  reducedMotion: boolean
  /** Positioned every frame from the front card's projected body band. */
  overlayRef: React.RefObject<HTMLDivElement | null>
  pillRef: React.RefObject<HTMLAnchorElement | null>
  /** Fires once when the scene's suspended content has mounted. */
  onReady: () => void
  /** Fires once: no WebGL2 at mount, or the context was lost. */
  onWebglUnavailable: () => void
}

/**
 * Depth of field and grain are desktop-only (spec Q12/Q14) AND
 * hardware-accelerated only. A software rasteriser cannot run a
 * full-resolution MSAA x8 depth-of-field pass at a usable rate for anyone —
 * measured at 422ms/frame median under SwiftShader at 2160x1350 — so this is a
 * capability rule of the same kind as `pointer: fine`, not a test workaround.
 */
function hasDesktopEffects(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 768
}

/**
 * Software rasterisers, by the renderer strings they actually report.
 * Deliberately narrow: absence of evidence is treated as hardware, because a
 * wider pattern ('angle', 'mesa', 'google') would silently strip depth of
 * field from real GPUs.
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

/**
 * One throwaway context answers both questions we have about the GPU:
 * whether WebGL2 exists at all (three r185 has no WebGL1 path), and whether
 * we are on a software rasteriser.
 */
function probeWebgl(): { supported: boolean; software: boolean } {
  if (typeof document === 'undefined') return { supported: false, software: false }
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return { supported: false, software: false }
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    )
    const software = SOFTWARE_RENDERER.test(name)
    // Hand the probe's context straight back; contexts are a scarce resource.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { supported: true, software }
  } catch {
    return { supported: false, software: false }
  }
}

/**
 * How long after the entrance hands off before the scene may warm.
 * `entranceDone` resolves at ~92% of the loader explosion, and the hero name
 * rises AFTER that — compiling shaders on top of that animation is exactly the
 * jank the warm-up exists to avoid, just moved earlier.
 */
const HERO_SETTLE_MS = 1500

/** requestIdleCallback, with a timeout fallback for browsers without it. */
function onIdle(run: () => void, timeout: number): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(run, { timeout })
    return () => cancelIdleCallback(id)
  }
  const id = window.setTimeout(run, timeout)
  return () => window.clearTimeout(id)
}

interface SceneWarmupProps {
  sceneRefs: SceneRefs
}

/**
 * Compile the scene's programs and upload its textures BEFORE the first live
 * frame, then flag the canvas `data-warm`.
 *
 * three compiles programs and uploads textures lazily, on first draw. Without
 * this that all lands in one task the moment the IntersectionObserver starts
 * the loop — measured at 498ms on an Apple M1 (phone profile) and 1217ms with
 * the composer, exactly as the reader scrolls into Selected Work. It is a real
 * hitch on real hardware, not a headless artifact, which is why the e2e
 * long-task budget stays where it is and the product does the work instead.
 *
 * It waits for the entrance to hand off first: this block must never land
 * inside the loader's exit animation.
 */
function SceneWarmup({ sceneRefs }: SceneWarmupProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    let cancelled = false
    let cancelIdle: (() => void) | undefined

    const warm = async (): Promise<void> => {
      if (cancelled) return
      started.current = true
      try {
        await gl.compileAsync(scene, camera)
        if (cancelled) return
        scene.traverse((object) => {
          const material = (object as THREE.Mesh).material
          const map = material && !Array.isArray(material)
            ? (material as THREE.MeshBasicMaterial).map
            : null
          if (map) gl.initTexture(map)
        })
        // The title's textures live in shader uniforms, out of traverse's reach.
        for (const texture of sceneRefs.titleTextures) gl.initTexture(texture)
        // compileAsync and initTexture alone do NOT pay the whole first-draw
        // cost — measured, a 1528ms task still landed on the first live frame
        // — and postprocessing exposes no way to pre-build the DoF's internal
        // passes at all. So the warm-up renders exactly ONE frame off-screen.
        // That is the single sanctioned off-screen frame: it starts no loop and
        // leaves the live-canvas invariant untouched.
        if (!cancelled) advance(performance.now())
      } finally {
        if (!cancelled) gl.domElement.dataset.warm = 'true'
      }
    }

    let settle: number | undefined
    void entranceDone.then(() => {
      if (cancelled) return
      settle = window.setTimeout(() => {
        if (!cancelled) cancelIdle = onIdle(() => void warm(), 2000)
      }, HERO_SETTLE_MS)
    })
    return () => {
      cancelled = true
      if (settle) window.clearTimeout(settle)
      cancelIdle?.()
    }
  }, [gl, scene, camera, sceneRefs])

  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    onReady()
  }, [onReady])
  return null
}

/**
 * The scene's canvas host: it owns the WebGL surface and every rule that is
 * about the CANVAS rather than about the scene — the WebGL2 probe, the DPR cap,
 * off-screen pausing, the reduced-motion render mode, and context loss.
 *
 * Returns null when WebGL2 is missing; the section renders its DOM fallback
 * instead, permanently for the session (spec Q9).
 */
export function SelectedWorkScene({
  covers,
  titles,
  progress,
  reducedMotion,
  overlayRef,
  pillRef,
  onReady,
  onWebglUnavailable,
}: SelectedWorkSceneProps) {
  const sceneRefs = useRef(createSceneRefs())
  const [{ supported, software }] = useState(probeWebgl)
  const [gl, setGl] = useState<THREE.WebGLRenderer | null>(null)
  const [inView, setInView] = useState(false)
  const [desktopEffects, setDesktopEffects] = useState(
    () => hasDesktopEffects() && !software,
  )
  const failed = useRef(false)

  // The initial frustum and fog: the rig re-derives both from the real canvas
  // size on its first frame, so this only has to be close enough to mount with.
  const [initial] = useState(() =>
    sceneGeometry(
      typeof window === 'undefined' ? 1440 : window.innerWidth,
      typeof window === 'undefined' ? 900 : window.innerHeight,
    ),
  )
  const initialFog = fogRange(initial, 0)

  useEffect(() => {
    if (supported || failed.current) return
    failed.current = true
    onWebglUnavailable()
  }, [supported, onWebglUnavailable])

  // Pause off screen. The canvas element IS the wrap's only content and fills
  // it exactly, so observing it observes the wrap.
  useEffect(() => {
    if (!gl || reducedMotion) return
    const el = gl.domElement
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '10% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [gl, reducedMotion])

  // Data attributes go on the REAL canvas: R3F forwards <Canvas> props to its
  // wrapper div, where the shared canvas-rule selectors would never find them.
  useEffect(() => {
    if (!gl) return
    const el = gl.domElement
    if (reducedMotion) {
      el.dataset.static = 'true'
      delete el.dataset.paused
      return
    }
    delete el.dataset.static
    if (inView) delete el.dataset.paused
    else el.dataset.paused = 'true'
  }, [gl, inView, reducedMotion])

  // Only re-render when the gate actually crosses, not on every resize tick.
  useEffect(() => {
    const onResize = () => {
      setDesktopEffects((current) => {
        const next = hasDesktopEffects() && !software
        return next === current ? current : next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [software])

  // Pointer tilt, in NDC over the canvas. Fine pointers only: a touch drag
  // would otherwise leave the front card stuck at whatever angle it was
  // released at (spec Q7 gives touch nothing).
  useEffect(() => {
    if (!gl || reducedMotion) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const element = gl.domElement
    const pointer = sceneRefs.current.pointer
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    }
    const onLeave = () => {
      pointer.x = 0
      pointer.y = 0
    }
    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
      onLeave()
    }
  }, [gl, reducedMotion])

  // Reduced motion renders on demand: scroll and resize are the only things
  // that can change the frame, so they are the only things that ask for one.
  useMotionValueEvent(progress, 'change', () => {
    if (reducedMotion) invalidate()
  })
  useEffect(() => {
    if (!reducedMotion) return
    const onResize = () => invalidate()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [reducedMotion])

  if (!supported) return null

  return (
    <Canvas
      flat
      dpr={[1, 1.5]}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV_DEG, near: initial.near, far: initial.far }}
      frameloop={reducedMotion ? 'demand' : inView ? 'always' : 'never'}
      onCreated={({ gl: renderer }) => {
        renderer.setClearColor(CREAM)
        renderer.domElement.dataset.canvas = 'selected-work-scene'
        // The fallback is permanent, so the context is deliberately NOT
        // preventDefault()ed back into life.
        renderer.domElement.addEventListener('webglcontextlost', () => {
          if (failed.current) return
          failed.current = true
          onWebglUnavailable()
        })
        setGl(renderer)
      }}
    >
      <fog attach="fog" args={[CREAM, initialFog.near, initialFog.far]} />
      <SceneRig
        progress={progress}
        reducedMotion={reducedMotion}
        sceneRefs={sceneRefs.current}
        overlayRef={overlayRef}
        pillRef={pillRef}
      />
      {/* Outside the Suspense on purpose: SceneTitle must never suspend, or a
          language switch would blank the whole scene for a frame. */}
      <SceneTitle
        titles={titles}
        reducedMotion={reducedMotion}
        sceneRefs={sceneRefs.current}
      />
      <Suspense fallback={null}>
        <Environment desktopEffects={desktopEffects} />
        <Corridor covers={covers} sceneRefs={sceneRefs.current} />
        <ReadySignal onReady={onReady} />
        <SceneWarmup sceneRefs={sceneRefs.current} />
      </Suspense>
    </Canvas>
  )
}
