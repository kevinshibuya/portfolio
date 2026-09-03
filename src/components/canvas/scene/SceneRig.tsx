import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import type * as THREE from 'three'
import {
  CARD_COUNT,
  CARD_W,
  FOV_DEG,
  clamp,
  playheadFor,
  easedSeg,
  sceneGeometry,
  cameraPose,
  cardPose,
  projectPoint,
  ambientOffset,
  frontIndexFor,
  settledness,
  fogRange,
  type SceneGeometry,
} from '../../../utils/sceneMotion'
import { CARD_PAD, BAND_TOP_Y, BAND_BOTTOM_Y } from './cardAnatomy'
import type { SceneRefs } from './sceneRefs'

interface SceneRigProps {
  progress: MotionValue<number>
  reducedMotion: boolean
  sceneRefs: SceneRefs
  overlayRef: React.RefObject<HTMLDivElement | null>
  pillRef: React.RefObject<HTMLAnchorElement | null>
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
export function SceneRig({
  progress,
  reducedMotion,
  sceneRefs,
  overlayRef,
  pillRef,
}: SceneRigProps) {
  const geo = useRef<SceneGeometry | null>(null)
  const geoKey = useRef('')

  useFrame((state) => {
    const { size, camera, scene, clock } = state

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

    // The DOM overlay rides the front card's white body band. It is placed from
    // the band's PROJECTED corners rather than tracked by a transform, so it
    // stays glued to the card through the whole dolly without ever mirroring
    // the card's yaw (flat text on a yawed plane reads as a mistake).
    const overlay = overlayRef.current
    if (!overlay) return
    const visualIndex = frontIndexFor(seg, CARD_COUNT, reducedMotion)
    const pose = cardPose(visualIndex, eased, g)
    const bob = reducedMotion ? 0 : ambientOffset(visualIndex, clock.elapsedTime, 0).y
    const cardCentreY = pose.y + bob

    const topLeft = projectPoint(
      pose.x - CARD_W / 2 + CARD_PAD,
      cardCentreY + BAND_TOP_Y,
      pose.z,
      cam,
      g,
    )
    const bottomRight = projectPoint(
      pose.x + CARD_W / 2 - CARD_PAD,
      cardCentreY + BAND_BOTTOM_Y,
      pose.z,
      cam,
      g,
    )

    const settled = settledness(seg, reducedMotion)
    // Whole pixels: a fractional transform makes 13px text shimmer.
    overlay.style.transform = `translate3d(${Math.round(topLeft.fx * size.width)}px, ${Math.round(topLeft.fy * size.height)}px, 0)`
    overlay.style.width = `${Math.round((bottomRight.fx - topLeft.fx) * size.width)}px`
    overlay.style.height = `${Math.round((bottomRight.fy - topLeft.fy) * size.height)}px`
    overlay.style.opacity = String(pose.visible ? settled : 0)

    // A parent's pointer-events: none does not block a child set to auto, so
    // the pill has to be switched off itself while the card is in flight.
    const pill = pillRef.current
    if (pill) pill.style.pointerEvents = settled >= 0.5 && pose.visible ? 'auto' : 'none'
  })

  return null
}
