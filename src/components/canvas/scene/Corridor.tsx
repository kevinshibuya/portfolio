import { useLayoutEffect, useRef } from 'react'
import type * as THREE from 'three'
import { CARD_COUNT, CARD_W, CARD_H } from '../../../utils/sceneMotion'
import type { SceneRefs } from './sceneRefs'

interface CorridorProps {
  sceneRefs: SceneRefs
}

/**
 * The four project cards standing along the corridor.
 *
 * This component only MOUNTS them — every position, rotation and opacity is
 * written by SceneRig's frame loop through the refs registered below, so a card
 * never re-renders while the camera travels.
 */
export function Corridor({ sceneRefs }: CorridorProps) {
  const groups = useRef<(THREE.Group | null)[]>([])
  const frames = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  useLayoutEffect(() => {
    const { cards, cardMaterials } = sceneRefs
    for (let i = 0; i < CARD_COUNT; i++) {
      cards[i] = groups.current[i] ?? null
      const frame = frames.current[i]
      cardMaterials[i] = frame ? [frame] : []
    }
    return () => {
      for (let i = 0; i < CARD_COUNT; i++) {
        cards[i] = null
        cardMaterials[i] = []
      }
    }
  }, [sceneRefs])

  return (
    <>
      {Array.from({ length: CARD_COUNT }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g
          }}
        >
          <mesh>
            <planeGeometry args={[CARD_W, CARD_H]} />
            <meshBasicMaterial
              ref={(m) => {
                frames.current[i] = m
              }}
              color="#FFFFFF"
              transparent
              fog
            />
          </mesh>
        </group>
      ))}
    </>
  )
}
