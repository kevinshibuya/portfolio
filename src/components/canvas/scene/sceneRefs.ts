import type * as THREE from 'three'
import { CARD_COUNT } from '../../../utils/sceneMotion'

/**
 * The mutable handles the scene's ONE frame loop writes through.
 *
 * Everything the loop touches per frame lives here rather than in React state:
 * the rig reads scroll and the clock, derives poses from the pure helpers in
 * sceneMotion.ts, and writes them straight onto these objects. React only ever
 * mounts and unmounts them (ADR 0010 — zero React state per frame).
 *
 * Every object component registers into these arrays in a layout effect and
 * nulls its slot on unmount, so the rig can always run against whatever is
 * currently mounted without caring which task added it.
 */
export interface SceneRefs {
  cards: (THREE.Group | null)[]
  /** Every material on card i — frame and cover share one opacity. */
  cardMaterials: THREE.MeshBasicMaterial[][]
  halos: (THREE.Mesh | null)[]
  haloMaterials: (THREE.MeshBasicMaterial | null)[]
  shadows: (THREE.Mesh | null)[]
  shadowMaterials: (THREE.MeshBasicMaterial | null)[]
  title: THREE.Group | null
  titleMaterial: THREE.ShaderMaterial | null
  /** Ambient energy from scroll velocity, 0..1. */
  energy: { value: number }
  /** Pointer tilt actually applied, lerped toward the target each frame. */
  tilt: { pitch: number; yaw: number }
  /** Pointer position over the canvas in NDC, [-1, 1]. */
  pointer: { x: number; y: number }
}

export function createSceneRefs(): SceneRefs {
  return {
    cards: Array(CARD_COUNT).fill(null),
    cardMaterials: Array.from({ length: CARD_COUNT }, () => []),
    halos: Array(CARD_COUNT).fill(null),
    haloMaterials: Array(CARD_COUNT).fill(null),
    shadows: Array(CARD_COUNT).fill(null),
    shadowMaterials: Array(CARD_COUNT).fill(null),
    title: null,
    titleMaterial: null,
    energy: { value: 0 },
    tilt: { pitch: 0, yaw: 0 },
    pointer: { x: 0, y: 0 },
  }
}
