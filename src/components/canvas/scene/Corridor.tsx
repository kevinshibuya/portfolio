import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD_COUNT, CARD_W, CARD_H } from '../../../utils/sceneMotion'
import { accentDeepLargeFor } from '../../../utils/palette'
import { roundedBlobTexture } from './gradients'
import { TAP_MAX_DELTA_PX } from './friezeHit'
import type { SceneRefs } from './sceneRefs'
import type { SceneCard } from '../SelectedWorkScene'
import { Caption, type CaptionHandles } from './Caption'
import { CardObject } from './CardObject'

/** The shadow pools under the card, a little wider than it. */
const SHADOW_W = 1.25 * CARD_W
const SHADOW_H = 1.25 * CARD_H * 0.6
/** Just off the floor, so the two planes never z-fight. */
const SHADOW_Y = 0.002
/** Below the cards, so a card always draws over its own shadow. */
const BACKDROP_ORDER = -1

interface CorridorProps {
  /** The featured projects in corridor order; an empty `art` renders the frame alone. */
  cards: SceneCard[]
  sceneRefs: SceneRefs
  /** A press on card i. Navigation and scrolling happen in the Router root. */
  onCardClick: (index: number) => void
}

/**
 * The four project cards standing along the corridor.
 *
 * This component only MOUNTS them — every position, rotation and opacity is
 * written by SceneRig's frame loop through the refs registered below, so a card
 * never re-renders while the camera travels.
 */
export function Corridor({ cards, sceneRefs, onCardClick }: CorridorProps) {
  const gl = useThree((state) => state.gl)

  // The pointer reaches a card ONLY through these (plan, lanes). Hover is a
  // ref the rig lerps, never state; the cursor is the one DOM write, on the
  // canvas element itself. stopPropagation keeps a press on the settled card
  // from also reaching the card standing behind it.
  const onPointerOver = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    sceneRefs.hover.index = i
    gl.domElement.style.cursor = 'pointer'
  }
  const onPointerOut = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (sceneRefs.hover.index !== i) return
    sceneRefs.hover.index = -1
    gl.domElement.style.cursor = ''
  }
  const onClick = (i: number) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > TAP_MAX_DELTA_PX) return
    onCardClick(i)
  }
  const groups = useRef<(THREE.Group | null)[]>([])
  const frameMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const registrations = useRef(0)

  const shadows = useRef<(THREE.Mesh | null)[]>([])
  const shadowMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  const blobTexture = useMemo(() => roundedBlobTexture(), [])
  useEffect(() => () => blobTexture.dispose(), [blobTexture])

  // The shadow takes a quarter of the card's deep tint into ink, so each card
  // pools a shadow that belongs to it rather than a neutral grey.
  //
  // The DEEP-LARGE channel, not accentDeepFor: this is decoration, and
  // accentDeepFor's yellow slot is the ink-muted `rgba(11,14,20,.62)` string —
  // THREE.Color drops the alpha and warns, which silently rendered card 2's
  // shadow as flat ink. Deep-large emits the real olive #7A6800 (CLAUDE.md:
  // decorative marks read --row-tint-deep-large).
  const shadowColors = useMemo(
    () =>
      Array.from({ length: CARD_COUNT }, (_, i) =>
        new THREE.Color('#0B0E14').lerp(new THREE.Color(accentDeepLargeFor(i)), 0.25),
      ),
    [],
  )

  // Stable per card, so the caption's handle effect runs once: a new callback
  // identity every render would re-register the corridor on every re-render.
  const onFrameMaterial = useMemo(
    () =>
      Array.from({ length: CARD_COUNT }, (_, i) => (material: THREE.MeshBasicMaterial | null) => {
        frameMaterials.current[i] = material
      }),
    [],
  )
  const onCaptionHandles = useMemo(
    () =>
      Array.from({ length: CARD_COUNT }, (_, i) => (handles: CaptionHandles | null) => {
        sceneRefs.captionMaterials[i] = handles ? handles.materials : []
        sceneRefs.arrows[i] = handles ? handles.arrow : null
      }),
    [sceneRefs],
  )

  // Registers the groups, the frame materials and the shadows ONCE, at mount.
  // Frame and cover share one opacity, so both sit in cardMaterials[i]; the
  // cover adds and removes itself (CardObject's CardCover), so nothing here
  // depends on the covers and a language switch never re-registers the
  // corridor. The count on the canvas is what the e2e reads (ADR 0011).
  useLayoutEffect(() => {
    const { cards, cardMaterials } = sceneRefs
    const frames: (THREE.MeshBasicMaterial | null)[] = []
    for (let i = 0; i < CARD_COUNT; i++) {
      cards[i] = groups.current[i] ?? null
      const frame = frameMaterials.current[i] ?? null
      frames[i] = frame
      if (frame && !cardMaterials[i].includes(frame)) cardMaterials[i].push(frame)
      sceneRefs.shadows[i] = shadows.current[i] ?? null
      sceneRefs.shadowMaterials[i] = shadowMaterials.current[i] ?? null
    }
    registrations.current += 1
    gl.domElement.dataset.registrations = String(registrations.current)
    return () => {
      for (let i = 0; i < CARD_COUNT; i++) {
        cards[i] = null
        const frame = frames[i]
        const at = frame ? cardMaterials[i].indexOf(frame) : -1
        if (at >= 0) cardMaterials[i].splice(at, 1)
        sceneRefs.shadows[i] = null
        sceneRefs.shadowMaterials[i] = null
      }
    }
  }, [sceneRefs, gl])

  return (
    <>
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
          onPointerOver={onPointerOver(i)}
          onPointerOut={onPointerOut(i)}
          onClick={onClick(i)}
        >
          <CardObject
            coverUrl={cards[i]?.art || null}
            mode="corridor"
            materials={sceneRefs.cardMaterials[i]}
            onFrameMaterial={onFrameMaterial[i]}
          >
            {cards[i] ? (
              <Caption
                index={i}
                title={cards[i].title}
                subtitle={cards[i].subtitle}
                onHandles={onCaptionHandles[i]}
              />
            ) : null}
          </CardObject>
        </group>
      ))}

      {/* Floor shadows are SIBLINGS of the cards, not children: a card group
          picks up ambient pitch and bob, and a shadow that inherited those
          would tilt off the floor and rise with the card instead of staying
          pooled beneath it. The rig places each one under its card. */}
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <mesh
          key={`shadow-${i}`}
          position={[0, SHADOW_Y, 0]}
          rotation-x={-Math.PI / 2}
          renderOrder={BACKDROP_ORDER}
          ref={(m) => {
            shadows.current[i] = m
          }}
        >
          <planeGeometry args={[SHADOW_W, SHADOW_H]} />
          <meshBasicMaterial
            ref={(m) => {
              shadowMaterials.current[i] = m
            }}
            map={blobTexture}
            color={shadowColors[i]}
            transparent
            depthWrite={false}
            fog
          />
        </mesh>
      ))}
    </>
  )
}
