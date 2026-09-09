import type * as THREE from 'three'
import { CARD_COUNT } from '../../../utils/sceneMotion'
import type { TitleMetrics } from './titleTexture'

/** The title (and the overture) render on this layer; the composer never sees it. */
export const TITLE_LAYER = 1

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
  shadows: (THREE.Mesh | null)[]
  shadowMaterials: (THREE.MeshBasicMaterial | null)[]
  /** Card i's caption text and arrow materials; they fade with the card. */
  captionMaterials: THREE.MeshBasicMaterial[][]
  /** Card i's arrow wrapper, offset by the rig for the hover slide. */
  arrows: (THREE.Object3D | null)[]
  /** Which card the pointer is over (−1 none) and the lerped 0..1 lift. */
  hover: { index: number; amount: number }
  title: THREE.Group | null
  titleMaterial: THREE.ShaderMaterial | null
  /** The overture line's plane and material; the rig places and fades them. */
  overture: THREE.Mesh | null
  overtureMaterial: THREE.MeshBasicMaterial | null
  /** One texture per project title, in corridor order. */
  titleTextures: THREE.CanvasTexture[]
  /** Sizes of those textures, so the rig can map each to its natural size. */
  titleMetrics: TitleMetrics[]
  /**
   * Asks SceneTitle for one redraw at the fit the rig settled on, so the
   * textures are rasterised at their displayed em and rest at mip LOD 0.
   */
  titleRedraw: ((scale: number) => void) | null
  /** Ambient energy from scroll velocity, 0..1. */
  energy: { value: number }
  /** Pointer tilt actually applied, lerped toward the target each frame. */
  tilt: { pitch: number; yaw: number }
  /** Pointer position over the canvas in NDC, [-1, 1]. */
  pointer: { x: number; y: number }
  /**
   * Where depth of field focuses, in world units, written every frame by the
   * rig and read by Environment's DoF effect. Act one holds the slot; act two
   * walks it out to the wall across the release.
   */
  focus: { distance: number }
}

export function createSceneRefs(): SceneRefs {
  return {
    cards: Array(CARD_COUNT).fill(null),
    cardMaterials: Array.from({ length: CARD_COUNT }, () => []),
    shadows: Array(CARD_COUNT).fill(null),
    shadowMaterials: Array(CARD_COUNT).fill(null),
    captionMaterials: Array.from({ length: CARD_COUNT }, () => []),
    arrows: Array(CARD_COUNT).fill(null),
    hover: { index: -1, amount: 0 },
    title: null,
    titleMaterial: null,
    overture: null,
    overtureMaterial: null,
    titleTextures: [],
    titleMetrics: [],
    titleRedraw: null,
    energy: { value: 0 },
    tilt: { pitch: 0, yaw: 0 },
    pointer: { x: 0, y: 0 },
    focus: { distance: 0 },
  }
}
