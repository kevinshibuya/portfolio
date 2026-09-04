import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD_COUNT, CARD_W, CARD_H } from '../../../utils/sceneMotion'
import { accentFor, accentDeepLargeFor } from '../../../utils/palette'
import { roundedRectGeometry } from './roundedRect'
import { radialGradientTexture, roundedBlobTexture } from './gradients'
import {
  CARD_RADIUS,
  COVER_W,
  COVER_H,
  COVER_Y,
  COVER_Z,
  COVER_RADIUS,
} from './cardAnatomy'
import type { SceneRefs } from './sceneRefs'

/** The halo reaches well past the card; the shadow pools under it. */
const HALO_SIZE = 2.2 * CARD_W
const HALO_Z = -0.05
const SHADOW_W = 1.25 * CARD_W
const SHADOW_H = 1.25 * CARD_H * 0.6
/** Just off the floor, so the two planes never z-fight. */
const SHADOW_Y = 0.002
/** Below the cards, so a card always draws over its own halo and shadow. */
const BACKDROP_ORDER = -1

interface CorridorProps {
  /** Cover art per card; an empty string renders the frame alone. */
  covers: string[]
  sceneRefs: SceneRefs
}

interface CardCoverProps {
  url: string
  geometry: THREE.BufferGeometry
  onMaterial: (material: THREE.MeshBasicMaterial | null) => void
}

/**
 * One card's cover image. Split out so `useLoader` — which suspends — is only
 * called for cards that actually have art, without a conditional hook.
 */
function CardCover({ url, geometry, onMaterial }: CardCoverProps) {
  const gl = useThree((state) => state.gl)
  const texture = useLoader(THREE.TextureLoader, url)

  useLayoutEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
    texture.needsUpdate = true
  }, [texture, gl])

  // useLoader caches by url, so the cache entry has to go with the texture —
  // disposing alone would hand a remount a disposed texture from the cache.
  useEffect(
    () => () => {
      texture.dispose()
      useLoader.clear(THREE.TextureLoader, url)
    },
    [texture, url],
  )

  return (
    <mesh position={[0, COVER_Y, COVER_Z]} geometry={geometry}>
      <meshBasicMaterial
        ref={onMaterial}
        map={texture}
        transparent
        fog
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * The four project cards standing along the corridor.
 *
 * This component only MOUNTS them — every position, rotation and opacity is
 * written by SceneRig's frame loop through the refs registered below, so a card
 * never re-renders while the camera travels.
 */
export function Corridor({ covers, sceneRefs }: CorridorProps) {
  const groups = useRef<(THREE.Group | null)[]>([])
  const frameMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const coverMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  const halos = useRef<(THREE.Mesh | null)[]>([])
  const haloMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const shadows = useRef<(THREE.Mesh | null)[]>([])
  const shadowMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  const haloTexture = useMemo(() => radialGradientTexture(), [])
  const blobTexture = useMemo(() => roundedBlobTexture(), [])
  useEffect(
    () => () => {
      haloTexture.dispose()
      blobTexture.dispose()
    },
    [haloTexture, blobTexture],
  )

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

  const frameGeometry = useMemo(
    () => roundedRectGeometry(CARD_W, CARD_H, CARD_RADIUS),
    [],
  )
  const coverGeometry = useMemo(
    () => roundedRectGeometry(COVER_W, COVER_H, COVER_RADIUS),
    [],
  )
  useEffect(
    () => () => {
      frameGeometry.dispose()
      coverGeometry.dispose()
    },
    [frameGeometry, coverGeometry],
  )

  // Frame and cover share one opacity, so the rig gets both materials per card.
  useLayoutEffect(() => {
    const { cards, cardMaterials } = sceneRefs
    for (let i = 0; i < CARD_COUNT; i++) {
      cards[i] = groups.current[i] ?? null
      cardMaterials[i] = [frameMaterials.current[i], coverMaterials.current[i]].filter(
        (m): m is THREE.MeshBasicMaterial => !!m,
      )
      sceneRefs.halos[i] = halos.current[i] ?? null
      sceneRefs.haloMaterials[i] = haloMaterials.current[i] ?? null
      sceneRefs.shadows[i] = shadows.current[i] ?? null
      sceneRefs.shadowMaterials[i] = shadowMaterials.current[i] ?? null
    }
    return () => {
      for (let i = 0; i < CARD_COUNT; i++) {
        cards[i] = null
        cardMaterials[i] = []
        sceneRefs.halos[i] = null
        sceneRefs.haloMaterials[i] = null
        sceneRefs.shadows[i] = null
        sceneRefs.shadowMaterials[i] = null
      }
    }
  }, [sceneRefs, covers])

  return (
    <>
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
        >
          {/* Tricolor halo, behind the card. */}
          <mesh
            position={[0, 0, HALO_Z]}
            renderOrder={BACKDROP_ORDER}
            ref={(m) => {
              halos.current[i] = m
            }}
          >
            <planeGeometry args={[HALO_SIZE, HALO_SIZE]} />
            <meshBasicMaterial
              ref={(m) => {
                haloMaterials.current[i] = m
              }}
              map={haloTexture}
              color={accentFor(i)}
              transparent
              depthWrite={false}
              fog
            />
          </mesh>

          <mesh geometry={frameGeometry}>
            <meshBasicMaterial
              ref={(m) => {
                frameMaterials.current[i] = m
              }}
              color="#FFFFFF"
              transparent
              fog
            />
          </mesh>
          {covers[i] ? (
            <CardCover
              url={covers[i]}
              geometry={coverGeometry}
              onMaterial={(m) => {
                coverMaterials.current[i] = m
              }}
            />
          ) : null}
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
