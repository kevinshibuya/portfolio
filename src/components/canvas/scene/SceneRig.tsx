import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useVelocity, type MotionValue } from 'framer-motion'
import * as THREE from 'three'
import {
  CARD_COUNT,
  CARD_W,
  CARD_H,
  DEG,
  HOVER_LIFT,
  HOVER_SCALE,
  HOVER_TAU,
  ARROW_SLIDE_PX,
  FOV_DEG,
  TITLE_CENTER,
  titleBand,
  CORRIDOR_DEPTH,
  overturePose,
  overtureZ,
  segmentFor,
  settleFrac,
  seamFor,
  SEAM_WIDTH_EM,
  SEAM_SIGMA_EM,
  clamp,
  playheadFor,
  actOneSeg,
  easedSeg,
  sceneGeometry,
  cameraPose,
  cardPose,
  ambientOffset,
  frontIndexFor,
  settledness,
  fogRange,
  velocityEnergy,
  velocityYaw,
  frameRects,
  focusDistance,
  actTwoProgress,
  actTwoPose,
  actTwoStill,
  actTwoStillPose,
  actTwoCardFade,
  actOneVelocityScale,
  actTwoTitle,
  actTwoTitleDistance,
  actTwoFogRange,
  actTwoFocusDistance,
  friezeFrame,
  sceneFar,
  ACT_TWO_START,
  type SceneGeometry,
  type Rect,
  type ActTwoStill,
  type FriezeFrame,
} from '../../../utils/sceneMotion'
import type { SceneRefs } from './sceneRefs'
import type { FriezeExtent } from '../../../utils/friezeLayout'

const HALF_FOV_TAN = Math.tan((FOV_DEG * DEG) / 2)
/** Title float, in CSS px at the title's distance. */
const FLOAT_PX = 3
/** Pointer tilt of the settled card, and the title's counter-tilt. */
const TILT_DEG = 6
const TILT_TAU = 0.15
const TITLE_COUNTER_TILT = -0.25
/** Resting shadow density under a settled card. */
const SHADOW_ALPHA = 0.28
/** Ambient bob amplitude, mirrored from sceneMotion so the ratio is exact. */
const AMBIENT_Y = 0.01 * CARD_H
/**
 * The title never shrinks below this. A viewport short enough to close the band
 * entirely would otherwise drive the fit to zero or past it; at this floor the
 * title is tiny but real, and every downstream consumer stays well-defined.
 */
const TITLE_MIN_FIT = 0.05
/** The fit may drift this much from the drawn one before a redraw is asked for. */
const TITLE_REDRAW_TOLERANCE = 0.01

interface SceneRigProps {
  progress: MotionValue<number>
  reducedMotion: boolean
  sceneRefs: SceneRefs
  /** The fixed nav's height in CSS px; the title band starts 16 px under it. */
  navPx: number
  /** The frieze act two is framed against; its column count sizes the playhead. */
  frieze: FriezeExtent
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
  navPx,
  frieze,
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
  const wallFrame = useRef<FriezeFrame | null>(null)
  const lastSlot = useRef(-1)
  const lastAct = useRef(-1)
  /**
   * This frame's act-two state, so `updateTitle` reads the SAME descriptor the
   * camera did rather than resolving a second one off the live playhead.
   */
  const actTwo = useRef<{
    inActTwo: boolean
    u: number
    still: ActTwoStill | null
    poseZ: 0 | number
  }>({ inActTwo: false, u: 0, still: null, poseZ: 0 })
  const lastOverture = useRef<boolean | null>(null)
  const velocity = useVelocity(progress)

  // The DEV-only handle the smokes read to sample live object state. Stripped
  // from the production build, which is why those smokes run on the dev server.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const holder = window as unknown as {
      __scene?: SceneRefs
      __sceneCamera?: RefObject<THREE.Camera | null>
    }
    holder.__scene = sceneRefs
    // The ref object, not the camera: `.current` is then always the live one,
    // and the identity dump can read the pose without a second frame.
    holder.__sceneCamera = cameraRef
    // Released on unmount: without this the handle outlives the scene and pins
    // `sceneRefs` and every disposed three resource behind it. DEV only — the
    // whole effect is stripped from the production build.
    return () => {
      if (holder.__scene === sceneRefs) delete holder.__scene
      if (holder.__sceneCamera === cameraRef) delete holder.__sceneCamera
    }
  }, [sceneRefs])

  useFrame((state, delta) => {
    const { size, camera, scene, clock } = state

    // Geometry depends only on the viewport, so recompute it on resize, not
    // per frame — and re-derive the frustum and the fog with it.
    const key = `${size.width}x${size.height}:${frieze.columns}x${frieze.rows}`
    if (key !== geoKey.current && size.width > 0 && size.height > 0) {
      geoKey.current = key
      const next = sceneGeometry(size.width, size.height)
      geo.current = next
      cardRect.current = frameRects(next).card
      wallFrame.current = friezeFrame(frieze, next)
      const perspective = camera as THREE.PerspectiveCamera
      perspective.fov = FOV_DEG
      perspective.near = next.near
      // The volume shot stands well past act one's far plane. Applied HERE,
      // with the frustum, never per frame: act one's image does not depend on
      // the far plane, so this changes depth precision and nothing else.
      perspective.far = sceneFar(frieze, next)
      // Yaw-then-pitch, so the approach's yaw composes with the pitch the way
      // the pose intends. With yaw 0 a single-axis rotation is identical in any
      // order, so act one's view matrix does not change.
      camera.rotation.order = 'YXZ'
      perspective.updateProjectionMatrix()
    }
    const g = geo.current
    if (!g) return

    // `actOneSeg` is not cosmetic. The wrapper is now 1350 svh, so without the
    // clamp at 3 the act-one code would receive a segment up to 4 and the
    // corridor would scrub a card PAST its slot the moment the reader enters
    // act two. With it, every frame of act one is exactly today's frame and
    // card four holds its slot for the rest of the wrapper.
    const playhead = playheadFor(progress.get(), frieze.columns)
    const seg = actOneSeg(playhead)
    const u = actTwoProgress(playhead)
    const inActTwo = playhead > ACT_TWO_START

    // ONE descriptor under reduced motion, resolved once. Camera, fog, focus,
    // the card-four fade and the title all read `uAct` below — never the live
    // `u` while a still is set. Four channels each sampling the live playhead is
    // how a "still" acquires a slow drift no test looks for, and reduced motion
    // renders on demand, so that drift would show up between two frames a
    // reader never asked for.
    const still = inActTwo && reducedMotion ? actTwoStill(u, frieze, g) : null
    const uAct = still ? still.u : u
    // The ambient time term is 0 in act two under reduced motion, always.
    const fogT = inActTwo && reducedMotion ? 0 : clock.elapsedTime

    // Fog drifts on its own slow clock, so the depth of the scene never sits
    // perfectly still even when the page does. In act two it walks out to the
    // wall across the release, off act one's exact values at u = 0.
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      const { near, far } = inActTwo
        ? actTwoFogRange(uAct, frieze, g, fogT)
        : fogRange(g, clock.elapsedTime)
      fog.near = near
      fog.far = far
    }

    const overture = overturePose(seg, reducedMotion)
    // Reduced motion keeps the pin but jumps between slots: no dolly, no ease.
    // While the overture stands it shows the overture's start frame (the line
    // at 0.7 width, card 0 in the fog) instead of a slot.
    const eased = reducedMotion
      ? overture.visible
        ? -CORRIDOR_DEPTH
        : clamp(Math.round(seg), 0, CARD_COUNT - 1)
      : easedSeg(seg)

    // The breath. Scroll owns sequence and position; time owns everything here
    // (ADR 0010). Under reduced motion none of it runs and energy stays 0.
    const t = clock.elapsedTime
    const v = reducedMotion ? 0 : velocity.get() * actOneVelocityScale(frieze.columns)
    const energy = reducedMotion
      ? 0
      : velocityEnergy(sceneRefs.energy.value, v, delta)
    sceneRefs.energy.value = energy
    const leanYaw = reducedMotion ? 0 : velocityYaw(energy, v)
    const settledNow = settledness(seg, reducedMotion)
    const frontCard = frontIndexFor(seg, CARD_COUNT, reducedMotion)

    // Non-visual, test-only. Written when it CHANGES, never per frame.
    if (frontCard !== lastSlot.current) {
      lastSlot.current = frontCard
      state.gl.domElement.dataset.slot = String(frontCard)
    }

    // Pointer tilt eases toward its target rather than snapping to the cursor.
    const tilt = sceneRefs.tilt
    if (reducedMotion) {
      tilt.pitch = 0
      tilt.yaw = 0
    } else {
      const k = 1 - Math.exp(-delta / TILT_TAU)
      tilt.pitch += (sceneRefs.pointer.y * TILT_DEG * DEG - tilt.pitch) * k
      tilt.yaw += (sceneRefs.pointer.x * -TILT_DEG * DEG - tilt.yaw) * k
    }

    // `cam` stays the ACT-ONE pose throughout: the hover lift's direction and
    // the overture line are placed from it, and neither is act two's business.
    const cam = cameraPose(eased, g)
    const actTwoCam = inActTwo
      ? still
        ? actTwoStillPose(still, frieze, g)
        : actTwoPose(u, frieze, g)
      : null
    if (actTwoCam) {
      camera.position.set(actTwoCam.x, actTwoCam.y, actTwoCam.z)
      camera.rotation.set(actTwoCam.pitch, actTwoCam.yaw, 0)
    } else {
      camera.position.set(cam.x, cam.y, cam.z)
      camera.rotation.set(cam.pitch, 0, 0)
    }
    cameraRef.current = camera
    actTwo.current = {
      inActTwo,
      u: uAct,
      still,
      poseZ: actTwoCam ? actTwoCam.z : cam.z,
    }

    // Depth of field focuses on the slot in act one and walks out to the wall
    // across act two's release; Environment reads this every frame.
    sceneRefs.focus.distance = inActTwo
      ? actTwoFocusDistance(uAct, frieze, g)
      : focusDistance(g)

    // Non-visual, test-only. Written when it CHANGES, never per frame.
    const act = inActTwo ? 2 : 1
    if (act !== lastAct.current) {
      lastAct.current = act
      state.gl.domElement.dataset.act = String(act)
    }

    // The hover lift eases toward 1 only while the pointer is over the card
    // that is actually settled in the slot; reduced motion never lifts.
    const hover = sceneRefs.hover
    if (reducedMotion) {
      hover.amount = 0
    } else {
      const target = hover.index === frontCard && settledNow > 0.5 ? 1 : 0
      hover.amount += (target - hover.amount) * (1 - Math.exp(-delta / HOVER_TAU))
      if (Math.abs(hover.amount - target) < 1e-4) hover.amount = target
    }
    // "Toward the camera" is the camera's backward axis, which only pitches.
    const liftY = -Math.sin(cam.pitch) * HOVER_LIFT
    const liftZ = Math.cos(cam.pitch) * HOVER_LIFT
    const worldPerCardPx = CARD_W / (g.fraction * g.widthPx)

    for (let i = 0; i < CARD_COUNT; i++) {
      const group = sceneRefs.cards[i]
      if (!group) continue
      const pose = cardPose(i, eased, g)
      // Card four dissolves across act two's release. Without it the act-one
      // segment is clamped at 3, so it would still sit in its settled slot with
      // the camera closing to the dolly distance and the card between the lens
      // and the wall — full size in front of the frieze on a desktop, filling
      // the frame on a phone.
      const fade =
        inActTwo && i === CARD_COUNT - 1 ? actTwoCardFade(uAct, frieze) : inActTwo ? 0 : 1
      const opacity = pose.opacity * fade
      // Out of the render once it is gone. Do not read more into `visible` than
      // that: three's raycaster tests `layers` and never `visible` (measured on
      // r185 — a hidden group still returns its children's hits), so this flag
      // is not by itself what keeps the pointer off a faded card. Measured on
      // the preview build at both projects: past the fade nothing hovers and
      // nothing navigates, and a hover parked on the card clears itself as the
      // card goes. Whatever provides that is not this line. When the wall lands
      // behind these cards, verify a cell BEHIND card four still takes its own
      // hover and click rather than assuming this covers it.
      const visible = pose.visible && opacity > 0
      const amb = reducedMotion
        ? { y: 0, yaw: 0, pitch: 0 }
        : ambientOffset(i, t, energy)
      const isFront = i === frontCard
      const lift = isFront ? hover.amount : 0
      group.position.set(pose.x, pose.y + amb.y + lift * liftY, pose.z + lift * liftZ)
      group.rotation.y =
        pose.yaw + amb.yaw + leanYaw + (isFront ? tilt.yaw * settledNow : 0)
      group.rotation.x = amb.pitch + (isFront ? tilt.pitch * settledNow : 0)
      group.scale.setScalar(1 + lift * (HOVER_SCALE - 1))
      group.visible = visible
      const arrow = sceneRefs.arrows[i]
      if (arrow) {
        const slide = lift * ARROW_SLIDE_PX * worldPerCardPx
        arrow.position.set(slide, slide, 0)
      }
      const materials = sceneRefs.cardMaterials[i]
      if (materials) for (const m of materials) m.opacity = opacity
      // The caption belongs to the card: same opacity, same fog, same fate.
      const captions = sceneRefs.captionMaterials[i]
      if (captions) for (const m of captions) m.opacity = opacity

      // The shadow lives and dies with its card, so a card passing the lens
      // never leaves its shadow pooled on an empty floor.
      const shadow = sceneRefs.shadows[i]
      const shadowMaterial = sceneRefs.shadowMaterials[i]
      if (shadow) {
        shadow.position.set(pose.x, shadow.position.y, pose.z)
        shadow.visible = visible
      }
      if (shadowMaterial) {
        // The shadow lightens as the card breathes upward, which is what sells
        // the hover; amb.y is bounded by AMBIENT_Y so the ratio stays in [-1,1].
        const rise = AMBIENT_Y === 0 ? 0 : amb.y / AMBIENT_Y
        shadowMaterial.opacity = SHADOW_ALPHA * (1 - 0.4 * rise) * opacity
      }
    }

    updateTitle(state.clock.elapsedTime, state.viewport.dpr)

    // The overture line: placed on the camera's eye line where the camera will
    // be at the start of the approach, so the pass-through is a true one — a
    // point on the eye line stays on the eye line at every distance. Under the
    // pitch that is the upper third of the frame, where the title stands later.
    const line = sceneRefs.overture
    const lineMaterial = sceneRefs.overtureMaterial
    if (line && lineMaterial) {
      const amb = reducedMotion
        ? { y: 0, yaw: 0, pitch: 0 }
        : ambientOffset(CARD_COUNT, t, energy) // a fifth phase, not card 0's
      line.visible = overture.visible && lineMaterial.map !== null
      lineMaterial.opacity = overture.alpha
      line.position.set(0, g.camY + amb.y, overtureZ(g))
      line.rotation.set(cam.pitch + amb.pitch, amb.yaw + leanYaw, 0)
      // Reduced motion: the overture frame is a still with no title in it.
      // updateTitle() sets title.visible every frame, so this is the last word.
      if (reducedMotion && overture.visible && sceneRefs.title) sceneRefs.title.visible = false
    }

    // Non-visual, test-only. Written when it CHANGES, never per frame.
    if (overture.visible !== lastOverture.current) {
      lastOverture.current = overture.visible
      state.gl.domElement.dataset.overture = String(overture.visible)
    }
  })

  /** The title's pose, size and morph — everything camera-relative. */
  function updateTitle(elapsed: number, viewportDpr: number): void {
    const g = geo.current
    const title = sceneRefs.title
    const material = sceneRefs.titleMaterial
    const textures = sceneRefs.titleTextures
    const metrics = sceneRefs.titleMetrics
    if (!g || !title || !material || textures.length === 0) return
    title.visible = true
    const n = textures.length

    const seg = actOneSeg(playheadFor(progress.get(), frieze.columns))
    const { inActTwo, u: uAct, still, poseZ } = actTwo.current
    // In act two the title plane moves IN FRONT of the wall — at 393x851 the
    // act-one distance is 5.0 and the dolly sits at 4.69, so the title would
    // otherwise be drawn inside it. The switch is invisible: `worldPerPx`
    // scales with the distance, so the title's PIXEL size is distance-invariant.
    const frame = wallFrame.current
    const titleDistance =
      inActTwo && frame ? actTwoTitleDistance(poseZ - frame.z, g) : g.titleDistance
    const worldPerPx = (2 * titleDistance * HALF_FOV_TAN) / g.heightPx
    const visibleH = 2 * titleDistance * HALF_FOV_TAN
    const visibleW = visibleH * g.aspect

    // Which two titles are on screen, and how far the seam has crossed.
    // Everything below is derived from this, so the band moves in step with
    // the morph rather than jumping when the front project flips.
    let indexA: number
    let indexB: number
    let blend: number
    /** Raw segment fraction the seam runs on; the helper settles it. */
    let seamFrac: number
    let presentA: number
    let presentB: number
    /** Act-two title space → texture index: −1 is card four, 0 is `all work`. */
    const mapActTwo = (i: number): number => (i < 0 ? CARD_COUNT - 1 : CARD_COUNT + i)
    if (inActTwo) {
      if (still) {
        // From the DESCRIPTOR, not a second `blockIndexAt(u)` call: one still,
        // one index, no chance of the title disagreeing with the camera.
        indexA = still.index < 0 ? CARD_COUNT : CARD_COUNT + 1 + still.index
        indexB = indexA
        blend = 0
        seamFrac = 0
        presentA = 1
        presentB = 0
      } else {
        const tt = actTwoTitle(uAct, frieze)
        indexA = mapActTwo(tt.from)
        indexB = mapActTwo(tt.to)
        seamFrac = tt.from === tt.to ? 0 : tt.frac
        blend = settleFrac(seamFrac)
        presentA = 1
        presentB = tt.from === tt.to ? 0 : 1
      }
      // The textures may still be drawing after a language switch, so the
      // act-two entries can briefly be absent from the list.
      if (indexA >= n) {
        indexA = n - 1
        indexB = indexA
        presentB = 0
      } else if (indexB >= n) {
        indexB = indexA
        presentB = 0
      }
    } else if (reducedMotion) {
      indexA = clamp(Math.round(seg), 0, CARD_COUNT - 1)
      indexB = indexA
      blend = 0
      seamFrac = 0
      presentA = 1
      presentB = 0
    } else if (seg < 0) {
      // Approach: card 0's name writes itself in as the card surfaces.
      indexA = 0
      indexB = 0
      blend = 0
      seamFrac = clamp((seg + 0.5) / 0.5, 0, 1)
      presentA = 0
      presentB = 1
    } else {
      const { index, frac } = segmentFor(seg, CARD_COUNT)
      const hasNext = index + 1 < CARD_COUNT
      indexA = index
      indexB = hasNext ? index + 1 : index
      blend = hasNext ? settleFrac(frac) : 0
      seamFrac = hasNext ? frac : 0
      presentA = 1
      presentB = hasNext ? 1 : 0
    }

    // Every title renders at the SAME size, so a language switch cannot change
    // it. The plane is sized to the widest title and the tallest stack, and
    // each texture is fitted inside it at natural size: centred in x, and
    // REGISTERED ON ITS LAST BASELINE in y. A one-line name and a two-line one
    // therefore share the line the seam rewrites, and the extra line unfolds
    // above it instead of the two layouts colliding at different baselines.
    let planeW = 0
    let maxAbove = 0
    let maxBelow = 0
    const naturalW: number[] = []
    /** World units per texture px, per title. */
    const k: number[] = []
    /** Per title: how far act two's fit-down shrank it below its natural scale. */
    const titleFit: number[] = []
    // THE PLANE'S ENVELOPE IS ACT ONE'S ALONE, and that is structural, not a
    // data argument. `titleTexture.ts` grows `canvas.height` with the line
    // count, so a single act-two string wrapping to one more line than the
    // tallest act-one title would raise `maxAbove`/`maxBelow`, move `planeH`
    // and `baseY`, and resize act one — on DATA, not on code. Reducing over
    // `i < CARD_COUNT` makes act one's plane arithmetically independent of
    // every act-two string. SceneTitle's two-phase draw complements this by
    // keeping act-two strings from needing the fit-down below on today's copy;
    // it is the optimisation, this loop bound is the guarantee. Neither covers
    // the other, so neither may be simplified away on the belief that it does.
    for (let i = 0; i < n; i++) {
      const m = metrics[i]
      const scale = m ? (g.titleCapPx / m.emPx) * worldPerPx : 0
      k.push(scale)
      titleFit.push(1)
      naturalW.push(m ? m.widthPx * scale : 1)
      if (i >= CARD_COUNT) continue
      if (naturalW[i] > planeW) planeW = naturalW[i]
      if (m) {
        maxAbove = Math.max(maxAbove, m.baselinePx * scale)
        maxBelow = Math.max(maxBelow, (m.heightPx - m.baselinePx) * scale)
      }
    }
    const planeH = Math.max(maxAbove + maxBelow, 1e-6)
    // …and every act-two texture is fitted INTO the envelope act one produced.
    // One that would have overflowed renders a touch smaller; that is the whole
    // cost of the guarantee.
    for (let i = CARD_COUNT; i < n; i++) {
      const m = metrics[i]
      if (!m || naturalW[i] <= 0) continue
      const naturalH = m.heightPx * k[i]
      const fitIn = Math.min(1, planeW / naturalW[i], naturalH > 0 ? planeH / naturalH : 1)
      if (fitIn < 1) {
        k[i] *= fitIn
        naturalW[i] = m.widthPx * k[i]
        // The rest LOD below is derived from the NATURAL scale. A fitted-down
        // title draws its glyphs smaller, so more texture pixels land on each
        // device pixel and the LOD has to rise with it, or the title shimmers.
        // Inert while the two-phase draw keeps every act-two string inside the
        // envelope; the day one does not, this is what keeps it clean.
        titleFit[i] = fitIn
      }
    }
    /** The shared baseline, as a height above the plane centre. */
    const baseY = planeH / 2 - maxAbove
    // Where each title's glyphs actually reach either side of the plane
    // centre. The canvas is padded well past the ink, so the padded box is a
    // poor stand-in for the title band.
    const inkAbove: number[] = []
    const inkBelow: number[] = []
    for (let i = 0; i < n; i++) {
      const m = metrics[i]
      inkAbove.push(m ? baseY + (m.baselinePx - m.inkTopPx) * k[i] : 0)
      inkBelow.push(m ? (m.inkBottomPx - m.baselinePx) * k[i] - baseY : 0)
    }

    // The title band is BOTTOM-ANCHORED. The title plane sits farther from the
    // camera than the settled card, so any ink below the card's top edge is
    // occluded by it — that edge is the hard constraint. Pinning the lowest
    // glyph row just above it and letting the band grow UPWARD keeps one-line
    // titles at the size and place the geometry contract intends, while giving
    // PT's two-line "painel da reconstrução" the headroom it needs. Centring
    // every title on TITLE_CENTER instead would force a scale-down driven by
    // the tallest one, halving every one-line title to pay for it. The band's
    // ceiling is the nav: 16 px under it, never behind it.
    let fit = Math.min(1, (g.titleWidthCap * visibleW) / planeW)
    const below = inkBelow[indexA] + (inkBelow[indexB] - inkBelow[indexA]) * blend
    const above = inkAbove[indexA] + (inkAbove[indexB] - inkAbove[indexA]) * blend
    let centreFrac = TITLE_CENTER
    const cardTop = cardRect.current?.top
    const band = cardTop !== undefined
      ? titleBand(cardTop, navPx, g.heightPx, g.titleClearance)
      : null
    if (band) {
      // CLAMPED: `band.bottom - band.top` goes NEGATIVE once the viewport is
      // shorter than ~225 CSS px (the nav ceiling crosses the card's top edge),
      // and an unclamped shrink then drove a negative fit all the way into the
      // rasteriser — `document.fonts.load('400 -0.74px Anton')` rejects, and
      // because the draw is fired as `void draw()` that is an unhandled
      // rejection. Worse, `scaleRef` had already taken the negative value, so
      // `titleRedraw`'s equality guard swallowed every retry and the title
      // stayed dead for the session. Observed at 1440×220; reachable by
      // dragging a window short or embedding the page in a short frame.
      const available = Math.max(0, band.bottom - band.top)
      // Shrink only if even the whole band cannot hold the tallest title.
      // Act one's envelope again: the band shrink is shared across every
      // title, so an act-two string in this reduce would shrink act one too.
      const tallest = Math.max(
        ...inkAbove.slice(0, CARD_COUNT).map((a, i) => a + inkBelow[i]),
      )
      const tallestFrac = (fit * tallest) / visibleH
      if (tallestFrac > available && tallest > 0) fit *= available / tallestFrac
    }
    // Whatever the band did, the title stays a real, drawable size.
    fit = clamp(fit, TITLE_MIN_FIT, 1)
    // The textures are rasterised for a fit; hold that exact value while the
    // computed one stays within tolerance (so the rest LOD is exactly 0), and
    // ask for one redraw when it moves. The redraw converges in one step: the
    // natural size is em-independent, so the fit does not depend on the draw.
    const drawnScale = metrics[0]?.drawnScale ?? 1
    let capScale = drawnScale
    if (Math.abs(fit - drawnScale) > TITLE_REDRAW_TOLERANCE) {
      capScale = fit
      sceneRefs.titleRedraw?.(fit)
    }
    if (band) {
      centreFrac = band.bottom - (capScale * below) / visibleH
      // Never let a tall title climb under the nav.
      const top = centreFrac - (capScale * above) / visibleH
      if (top < band.top) centreFrac += band.top - top
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
        .addScaledVector(scratch.forward, titleDistance)
        .addScaledVector(scratch.up, lift + float)
      title.quaternion.copy(camera.quaternion)
      // The title parallaxes against the pointer at a quarter of the card's
      // tilt, which is what gives the frame its sense of depth.
      const tilt = sceneRefs.tilt
      title.rotateX(tilt.pitch * TITLE_COUNTER_TILT)
      title.rotateY(tilt.yaw * TITLE_COUNTER_TILT)
    }

    const u = material.uniforms
    const setSlot = (slot: 'A' | 'B', i: number, present: number): void => {
      const m = metrics[i]
      u[`uTex${slot}`].value = textures[i]
      u[`uPresent${slot}`].value = present
      if (!m) return
      // uv = vUv · scale + offset: x centred, y registered on the baseline.
      // CanvasTexture flips Y, so texture v runs from the bottom.
      const sx = planeW / naturalW[i]
      const sy = planeH / (m.heightPx * k[i])
      const vBase = (m.heightPx - m.baselinePx) / m.heightPx
      const pBase = maxBelow / planeH
      ;(u[`uScale${slot}`].value as THREE.Vector2).set(sx, sy)
      ;(u[`uOffset${slot}`].value as THREE.Vector2).set(0.5 - 0.5 * sx, vBase - pBase * sy)
      ;(u[`uTexel${slot}`].value as THREE.Vector2).set(1 / m.widthPx, 1 / m.heightPx)
      // The rest LOD is the natural minification — texture px per DEVICE px,
      // exactly 0 at the drawn scale because the texture was drawn at the
      // displayed em. The seam's blur pushes further up the chain from there.
      const texPxPerDevicePx = m.emPx / (g.titleCapPx * viewportDpr * capScale * titleFit[i])
      u[`uBaseLod${slot}`].value = Math.max(0, Math.log2(texPxPerDevicePx))
      u[`uSigma${slot}`].value = SEAM_SIGMA_EM * m.emPx
    }
    setSlot('A', indexA, presentA)
    setSlot('B', indexB, presentB)

    // The seam itself, in plane uv: the pair's wider canvas decides the travel
    // and one CSS em at the title's distance sizes the seam.
    // `capScale` included so the seam is measured in the em the title is
    // DISPLAYED at — `uSigma` above already uses the drawn em (`m.emPx`), so
    // without it a phone (capScale ≈ 0.9) got a 1.33-em seam around a 0.1-em
    // blur and the two constants meant different things.
    const emWorld = g.titleCapPx * capScale * worldPerPx
    const halfExtent = Math.max(naturalW[indexA], naturalW[indexB]) / (2 * planeW)
    const seam = seamFor(seamFrac, halfExtent, (SEAM_WIDTH_EM * emWorld) / planeW)
    u.uFront.value = seam.front
    u.uSeamWidth.value = seam.width
    u.uSeam.value = seam.travelling ? 1 : 0
    u.uPlateauT.value = settleFrac(clamp(seamFrac, 0, 1))
  }

  return null
}
