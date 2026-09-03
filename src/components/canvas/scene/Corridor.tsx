import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CARD_COUNT, CARD_W, CARD_H } from '../../../utils/sceneMotion'
import { roundedRectGeometry } from './roundedRect'
import {
  CARD_RADIUS,
  COVER_W,
  COVER_H,
  COVER_Y,
  COVER_Z,
  COVER_RADIUS,
} from './cardAnatomy'
import type { SceneRefs } from './sceneRefs'

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
    }
    return () => {
      for (let i = 0; i < CARD_COUNT; i++) {
        cards[i] = null
        cardMaterials[i] = []
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
    </>
  )
}
