import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import {
  HalftoneMaterial,
  type HalftoneUniformValues,
} from './HalftoneMaterial'
import { cappedDpr, frequencyForProgress } from './halftoneMath'

// This module is the ONLY static importer of three / fiber / drei on the
// portrait path. `HalftonePortrait` loads it via lazy(import()) strictly when
// the live-shader path is taken, so fallback-only devices (mobile / coarse /
// reduced-motion / no-WebGL) never download three.js for a static <img>.
//
// Importing HalftoneMaterial runs its `extend({ HalftoneMaterial })`, so the
// <halftoneMaterial /> JSX intrinsic (typed via the module augmentation) is
// registered before this Canvas mounts.

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

export interface HalftoneCanvasProps {
  src: string
  progress: MotionValue<number>
  inkDark: string
  inkLight: string
}

/**
 * The live-shader subtree: one demand-frameloop Canvas wrapping the halftone
 * scene. Default export so `HalftonePortrait` can `lazy(() => import(...))` it.
 */
export default function HalftoneCanvas({
  src,
  progress,
  inkDark,
  inkLight,
}: HalftoneCanvasProps): React.JSX.Element {
  return (
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
  )
}
