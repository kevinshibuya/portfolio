import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  HalftoneMaterial,
  type HalftoneUniformValues,
} from './HalftoneMaterial'
import { cappedDpr, frequencyForProgress } from './halftoneMath'

// Importing HalftoneMaterial runs its `extend({ HalftoneMaterial })`, so the
// <halftoneMaterial /> JSX intrinsic (typed via the module augmentation) is
// registered before this Canvas mounts.

export interface HalftonePortraitProps {
  src: string // source image url (sampled by the shader)
  fallbackSrc: string // pre-baked duotone <img> for mobile / no-webgl / reduced-motion
  progress: MotionValue<number> // 0→1 develop scrub (coarse→fine dot frequency)
  alt: string
  inkDark?: string // default '#111822'
  inkLight?: string // default '#F7F5F1'
  className?: string
}

/**
 * Pure mount-path predicate — extracted so the RED test can drive every branch
 * without a browser. Fallback wins if the viewer can't (or shouldn't) run the
 * live shader: reduced motion, no WebGL, or a coarse-pointer / mobile viewport.
 */
export function shouldUseFallback(env: {
  reducedMotion: boolean
  hasWebGL: boolean
  coarseOrMobile: boolean
}): boolean {
  return env.reducedMotion || !env.hasWebGL || env.coarseOrMobile
}

/** True only if a real WebGL context can be created (false in jsdom, false on failure). */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    return gl != null
  } catch {
    return false
  }
}

/** Coarse-pointer or small-viewport devices take the static duotone story. */
function isCoarseOrMobile(): boolean {
  return (
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768
  )
}

type HalftoneMaterialInstance = InstanceType<typeof HalftoneMaterial>

interface HalftoneSceneProps {
  src: string
  progress: MotionValue<number>
  inkDark: string
  inkLight: string
}

/**
 * The live shader mesh. Only ever rendered inside a browser <Canvas> (never in
 * jsdom — the predicate routes jsdom to the fallback). A single full-frame quad
 * runs the duotone-develop material (mode 0); `uFrequency` is scrubbed by the
 * `progress` MotionValue with the frameloop="demand" + invalidate() pattern —
 * no useFrame loop, nothing renders unless progress changes or the guard fires.
 */
function HalftoneScene({
  src,
  progress,
  inkDark,
  inkLight,
}: HalftoneSceneProps): React.JSX.Element {
  const texture = useTexture(src)
  const materialRef = useRef<HalftoneMaterialInstance | null>(null)
  const invalidate = useThree((state) => state.invalidate)
  const size = useThree((state) => state.size)
  const viewport = useThree((state) => state.viewport)

  // Stale-mount guard (review-gate finding): the Canvas mounts late (IO-gated)
  // while `progress` may already be nonzero. On material/texture ready, seed
  // uSource + all statics and initialise uFrequency from the CURRENT progress,
  // then invalidate() once. First paint never waits for a future scroll event.
  useEffect(() => {
    // drei infers each uniform's type from its initial value, so the instance
    // types `uSource` as `null` (its default). View it through the wider
    // HalftoneUniformValues contract to seed a real Texture — no `any`.
    const material = materialRef.current as HalftoneUniformValues | null
    if (!material) return
    material.uSource = texture
    material.uResolution = new THREE.Vector2(size.width, size.height)
    material.uInkDark.set(inkDark)
    material.uInkLight.set(inkLight)
    material.uMode = 0
    material.uDpr = cappedDpr(viewport.dpr)
    material.uFrequency = frequencyForProgress(progress.get())
    invalidate()
  }, [
    texture,
    size.width,
    size.height,
    viewport.dpr,
    inkDark,
    inkLight,
    progress,
    invalidate,
  ])

  // Demand-driven scrub: recompute the dot frequency and request one frame.
  useMotionValueEvent(progress, 'change', (value) => {
    const material = materialRef.current
    if (!material) return
    material.uFrequency = frequencyForProgress(value)
    invalidate()
  })

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <halftoneMaterial ref={materialRef} />
    </mesh>
  )
}

/**
 * Portrait "develops" from coarse to fine halftone dots as `progress` scrubs
 * 0→1. Chooses its render path once at mount:
 *  • fallback `<img>` — reduced motion, no WebGL, or coarse/mobile (static story);
 *  • live shader `<Canvas frameloop="demand">` — otherwise, its single WebGL
 *    context gated by an IntersectionObserver so it only initialises near the
 *    viewport and unmounts when far. One GL context total.
 */
export function HalftonePortrait({
  src,
  fallbackSrc,
  progress,
  alt,
  inkDark = '#111822',
  inkLight = '#F7F5F1',
  className,
}: HalftonePortraitProps): React.JSX.Element {
  const { prefersReducedMotion } = useMotion()

  // Browser capabilities are stable for the component's life — probe once.
  const [caps] = useState(() => ({
    webgl: hasWebGL(),
    coarseOrMobile: isCoarseOrMobile(),
  }))

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)

  const fallback = shouldUseFallback({
    reducedMotion: prefersReducedMotion,
    hasWebGL: caps.webgl,
    coarseOrMobile: caps.coarseOrMobile,
  })

  // IntersectionObserver gates the one WebGL context: mount only near the
  // viewport, unmount when far. Skipped entirely on the fallback path.
  useEffect(() => {
    if (fallback) return
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setNear(entry.isIntersecting)
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fallback])

  if (fallback) {
    return <img src={fallbackSrc} alt={alt} className={className} />
  }

  return (
    <div ref={containerRef} className={className}>
      {near && (
        <Canvas frameloop="demand" dpr={cappedDpr(window.devicePixelRatio)}>
          <Suspense fallback={null}>
            <HalftoneScene
              src={src}
              progress={progress}
              inkDark={inkDark}
              inkLight={inkLight}
            />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
