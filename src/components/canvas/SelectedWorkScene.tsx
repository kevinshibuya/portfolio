import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import type * as THREE from 'three'
import { FOV_DEG, sceneGeometry, fogRange } from '../../utils/sceneMotion'
import { createSceneRefs } from './scene/sceneRefs'
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

/** Depth of field and grain are desktop-only (spec Q12/Q14). */
function hasDesktopEffects(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: fine)').matches && window.innerWidth >= 768
}

/** three r185 has no WebGL1 path, so WebGL2 is the whole test. */
function hasWebgl2(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
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
  const [supported] = useState(hasWebgl2)
  const [gl, setGl] = useState<THREE.WebGLRenderer | null>(null)
  const [inView, setInView] = useState(false)
  const [desktopEffects, setDesktopEffects] = useState(hasDesktopEffects)
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
        const next = hasDesktopEffects()
        return next === current ? current : next
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
      </Suspense>
    </Canvas>
  )
}
