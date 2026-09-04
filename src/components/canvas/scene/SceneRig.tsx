import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import {
  CARD_COUNT,
  CARD_W,
  CARD_H,
  DEG,
  FOV_DEG,
  TITLE_CENTER,
  segmentFor,
  settleFrac,
  morphValues,
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
  frameRects,
  type SceneGeometry,
  type Rect,
} from '../../../utils/sceneMotion'
import { CARD_PAD, BAND_TOP_Y, BAND_BOTTOM_Y } from './cardAnatomy'
import type { SceneRefs } from './sceneRefs'

const HALF_FOV_TAN = Math.tan((FOV_DEG * DEG) / 2)
/** A mip level approximates a box blur, not a Gaussian; this compensates. */
const LOD_GAIN = 2.5
/** Title float, in CSS px at the title's distance. */
const FLOAT_PX = 3
/** Resting shadow density under a settled card. */
const SHADOW_ALPHA = 0.28
/** Ambient bob amplitude, mirrored from sceneMotion so the ratio is exact. */
const AMBIENT_Y = 0.01 * CARD_H
/** Frame fractions the title keeps between its lowest ink and the card top. */
const TITLE_CLEARANCE = 0.012
/** The title may grow upward to here, but never off the top of the frame. */
const TITLE_TOP_LIMIT = 0.02

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
  // Scratch vectors, reused every frame so the loop allocates nothing.
  const scratch = useMemo(
    () => ({ forward: new THREE.Vector3(), up: new THREE.Vector3() }),
    [],
  )
  const cameraRef = useRef<THREE.Camera | null>(null)
  const cardRect = useRef<Rect | null>(null)

  useFrame((state) => {
    const { size, camera, scene, clock } = state

    // Geometry depends only on the viewport, so recompute it on resize, not
    // per frame — and re-derive the frustum and the fog with it.
    const key = `${size.width}x${size.height}`
    if (key !== geoKey.current && size.width > 0 && size.height > 0) {
      geoKey.current = key
      const next = sceneGeometry(size.width, size.height)
      geo.current = next
      cardRect.current = frameRects(next).card
      const perspective = camera as THREE.PerspectiveCamera
      perspective.fov = FOV_DEG
      perspective.near = next.near
      perspective.far = next.far
      perspective.updateProjectionMatrix()
    }
    const g = geo.current
    if (!g) return

    // Fog drifts on its own slow clock, so the depth of the scene never sits
    // perfectly still even when the page does.
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      const { near, far } = fogRange(g, clock.elapsedTime)
      fog.near = near
      fog.far = far
    }

    const seg = playheadFor(progress.get())
    // Reduced motion keeps the pin but jumps between slots: no dolly, no ease.
    const eased = reducedMotion ? clamp(Math.round(seg), 0, CARD_COUNT - 1) : easedSeg(seg)

    const cam = cameraPose(eased, g)
    camera.position.set(cam.x, cam.y, cam.z)
    camera.rotation.set(cam.pitch, 0, 0)
    cameraRef.current = camera

    for (let i = 0; i < CARD_COUNT; i++) {
      const group = sceneRefs.cards[i]
      if (!group) continue
      const pose = cardPose(i, eased, g)
      group.position.set(pose.x, pose.y, pose.z)
      group.rotation.y = pose.yaw
      group.visible = pose.visible
      const materials = sceneRefs.cardMaterials[i]
      if (materials) for (const m of materials) m.opacity = pose.opacity

      // Halo and shadow live and die with their card, so a card passing the
      // lens never leaves its halo flooding the frame behind it.
      const amb = ambientOffset(i, clock.elapsedTime, sceneRefs.energy.value)
      const halo = sceneRefs.halos[i]
      const haloMaterial = sceneRefs.haloMaterials[i]
      if (halo) halo.visible = pose.visible
      if (haloMaterial) haloMaterial.opacity = amb.haloAlpha * pose.opacity

      const shadow = sceneRefs.shadows[i]
      const shadowMaterial = sceneRefs.shadowMaterials[i]
      if (shadow) {
        shadow.position.set(pose.x, shadow.position.y, pose.z)
        shadow.visible = pose.visible
      }
      if (shadowMaterial) {
        // The shadow lightens as the card breathes upward, which is what sells
        // the hover; amb.y is bounded by AMBIENT_Y so the ratio stays in [-1,1].
        const rise = AMBIENT_Y === 0 ? 0 : amb.y / AMBIENT_Y
        shadowMaterial.opacity = SHADOW_ALPHA * (1 - 0.4 * rise) * pose.opacity
      }
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

    updateTitle(state.clock.elapsedTime)
  })

  /** The title's pose, size and morph — everything camera-relative. */
  function updateTitle(elapsed: number): void {
    const g = geo.current
    const title = sceneRefs.title
    const material = sceneRefs.titleMaterial
    const textures = sceneRefs.titleTextures
    const metrics = sceneRefs.titleMetrics
    if (!g || !title || !material || textures.length === 0) return
    title.visible = true
    const n = textures.length

    const seg = playheadFor(progress.get())
    const worldPerPx = (2 * g.titleDistance * HALF_FOV_TAN) / g.heightPx
    const visibleH = 2 * g.titleDistance * HALF_FOV_TAN
    const visibleW = visibleH * g.aspect

    // Which two titles are on screen, and how far the morph has crossed.
    // Everything below is derived from this, so the band moves in step with
    // the morph rather than jumping when the front project flips.
    let indexA: number
    let indexB: number
    let blend: number
    let blurA: number
    let blurB: number
    let opacityA: number
    let opacityB: number
    if (reducedMotion) {
      indexA = clamp(Math.round(seg), 0, n - 1)
      indexB = indexA
      blend = 0
      blurA = 0
      blurB = 0
      opacityA = 1
      opacityB = 0
    } else if (seg < 0) {
      // Approach: the title resolves out of blur as card 0 surfaces.
      const approach = clamp((seg + 0.5) / 0.5, 0, 1)
      const { incoming } = morphValues(approach)
      indexA = 0
      indexB = 0
      blend = 0
      blurA = incoming.blur
      blurB = 0
      opacityA = incoming.opacity
      opacityB = 0
    } else {
      const { index, frac } = segmentFor(seg, n)
      const { incoming, outgoing } = morphValues(frac)
      const hasNext = index + 1 < n
      indexA = index
      indexB = hasNext ? index + 1 : index
      blend = hasNext ? settleFrac(frac) : 0
      blurA = outgoing.blur
      blurB = incoming.blur
      opacityA = outgoing.opacity
      opacityB = hasNext ? incoming.opacity : 0
    }

    // Every title renders at the SAME size, so a language switch cannot change
    // it. The plane is sized to the largest title and each texture is fitted
    // inside it at natural size by uScale.
    let planeW = 0
    let planeH = 0
    const naturalW: number[] = []
    const naturalH: number[] = []
    const inkBelow: number[] = []
    const inkAbove: number[] = []
    for (let i = 0; i < n; i++) {
      const m = metrics[i]
      const texPxToCssPx = m ? g.titleCapPx / m.emPx : 0
      naturalW.push(m ? m.widthPx * texPxToCssPx * worldPerPx : 1)
      naturalH.push(m ? m.heightPx * texPxToCssPx * worldPerPx : 1)
      if (naturalW[i] > planeW) planeW = naturalW[i]
      if (naturalH[i] > planeH) planeH = naturalH[i]
      // Where this title's glyphs actually reach either side of the plane
      // centre. The canvas is padded well past the ink, so the padded box is
      // a poor stand-in for the title band.
      inkBelow.push(m ? (m.inkBottomPx - m.heightPx / 2) * texPxToCssPx * worldPerPx : 0)
      inkAbove.push(m ? (m.heightPx / 2 - m.inkTopPx) * texPxToCssPx * worldPerPx : 0)
    }

    // The title band is BOTTOM-ANCHORED. The title plane sits farther from the
    // camera than the settled card, so any ink below the card's top edge is
    // occluded by it — that edge is the hard constraint. Pinning the lowest
    // glyph row just above it and letting the band grow UPWARD keeps one-line
    // titles at the size and place the geometry contract intends, while giving
    // PT's two-line "painel da reconstrução" the headroom it needs. Centring
    // every title on TITLE_CENTER instead would force a scale-down driven by
    // the tallest one, halving every one-line title to pay for it.
    let capScale = Math.min(1, (0.9 * visibleW) / planeW)
    const below = inkBelow[indexA] + (inkBelow[indexB] - inkBelow[indexA]) * blend
    const above = inkAbove[indexA] + (inkAbove[indexB] - inkAbove[indexA]) * blend
    let centreFrac = TITLE_CENTER
    const cardTop = cardRect.current?.top
    if (cardTop !== undefined) {
      const bottomTarget = cardTop - TITLE_CLEARANCE
      const available = bottomTarget - TITLE_TOP_LIMIT
      // Shrink only if even the whole band cannot hold the tallest title.
      const tallest = Math.max(...inkAbove.map((a, i) => a + inkBelow[i]))
      const tallestFrac = (capScale * tallest) / visibleH
      if (tallestFrac > available && tallest > 0) capScale *= available / tallestFrac
      centreFrac = bottomTarget - (capScale * below) / visibleH
      // Never let a tall title climb off the top of the frame.
      const top = centreFrac - (capScale * above) / visibleH
      if (top < TITLE_TOP_LIMIT) centreFrac += TITLE_TOP_LIMIT - top
    }
    title.scale.set(planeW * capScale, planeH * capScale, 1)

    // Pose: the title is NOT parented to the camera (R3F's default camera is
    // outside the scene graph), so it is placed from the camera's pose instead.
    const camera = cameraRef.current
    if (camera) {
      scratch.forward.set(0, 0, -1).applyQuaternion(camera.quaternion)
      scratch.up.set(0, 1, 0).applyQuaternion(camera.quaternion)
      const lift = (0.5 - centreFrac) * visibleH
      const float = reducedMotion
        ? 0
        : FLOAT_PX * worldPerPx * Math.sin((2 * Math.PI * elapsed) / 6)
      title.position
        .copy(camera.position)
        .addScaledVector(scratch.forward, g.titleDistance)
        .addScaledVector(scratch.up, lift + float)
      title.quaternion.copy(camera.quaternion)
    }

    const setSlot = (slot: 'A' | 'B', i: number, blurPx: number, opacity: number): void => {
      const m = metrics[i]
      material.uniforms[`uTex${slot}`].value = textures[i]
      material.uniforms[`uOpacity${slot}`].value = opacity
      ;(material.uniforms[`uScale${slot}`].value as THREE.Vector2).set(
        planeW / (naturalW[i] || planeW),
        planeH / (naturalH[i] || planeH),
      )
      // Sample the mip chain to blur. baseLod is the natural minification, so
      // a crisp title does not alias; blur pushes it further up the chain.
      const texPxPerCssPx = m ? m.emPx / g.titleCapPx / capScale : 1
      const baseLod = Math.max(0, Math.log2(texPxPerCssPx))
      const blurLod = Math.log2(Math.max(blurPx * texPxPerCssPx * LOD_GAIN, 1))
      material.uniforms[`uLod${slot}`].value = Math.max(baseLod, blurLod)
    }
    setSlot('A', indexA, blurA, opacityA)
    setSlot('B', indexB, blurB, opacityB)
  }

  return null
}
