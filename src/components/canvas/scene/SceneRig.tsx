import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import type * as THREE from 'three'
import {
  CARD_COUNT,
  FOV_DEG,
  clamp,
  playheadFor,
  easedSeg,
  sceneGeometry,
  cameraPose,
  cardPose,
  fogRange,
  type SceneGeometry,
} from '../../../utils/sceneMotion'
import type { SceneRefs } from './sceneRefs'

interface SceneRigProps {
  progress: MotionValue<number>
  reducedMotion: boolean
  sceneRefs: SceneRefs
}

/**
 * The scene's ONE frame loop.
 *
 * It reads Framer's scroll MotionValue (never React state), derives every
 * visual through the pure helpers in sceneMotion.ts, and writes the result
 * straight onto the three objects. Nothing here calls setState, so scrubbing
 * the whole section costs zero React renders.
 *
 * Lane rule (CLAUDE.md): the R3F loop READS Framer MotionValues; Framer never
 * animates a three object.
 */
export function SceneRig({ progress, reducedMotion, sceneRefs }: SceneRigProps) {
  const geo = useRef<SceneGeometry | null>(null)
  const geoKey = useRef('')

  useFrame((state) => {
    const { size, camera, scene } = state

    // Geometry depends only on the viewport, so recompute it on resize, not
    // per frame — and re-derive the frustum and the fog with it.
    const key = `${size.width}x${size.height}`
    if (key !== geoKey.current && size.width > 0 && size.height > 0) {
      geoKey.current = key
      const next = sceneGeometry(size.width, size.height)
      geo.current = next
      const perspective = camera as THREE.PerspectiveCamera
      perspective.fov = FOV_DEG
      perspective.near = next.near
      perspective.far = next.far
      perspective.updateProjectionMatrix()
      const fog = scene.fog as THREE.Fog | null
      if (fog) {
        const { near, far } = fogRange(next, 0)
        fog.near = near
        fog.far = far
      }
    }
    const g = geo.current
    if (!g) return

    const seg = playheadFor(progress.get())
    // Reduced motion keeps the pin but jumps between slots: no dolly, no ease.
    const eased = reducedMotion ? clamp(Math.round(seg), 0, CARD_COUNT - 1) : easedSeg(seg)

    const cam = cameraPose(eased, g)
    camera.position.set(cam.x, cam.y, cam.z)
    camera.rotation.set(cam.pitch, 0, 0)

    for (let i = 0; i < CARD_COUNT; i++) {
      const group = sceneRefs.cards[i]
      if (!group) continue
      const pose = cardPose(i, eased, g)
      group.position.set(pose.x, pose.y, pose.z)
      group.rotation.y = pose.yaw
      group.visible = pose.visible
      const materials = sceneRefs.cardMaterials[i]
      if (materials) for (const m of materials) m.opacity = pose.opacity
    }
  })

  return null
}
