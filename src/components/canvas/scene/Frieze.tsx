import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import type { ArchiveItem } from '../../../types/content'
import { projects } from '../../../data/projects'
import {
  FRIEZE_CELL_H,
  FRIEZE_CELL_W,
  countCell,
  type Cell,
  type FriezeExtent,
  type FriezeLayout,
} from '../../../utils/friezeLayout'
import type { FriezeFrame } from '../../../utils/sceneMotion'
import { Caption, type CaptionHandles } from './Caption'
import { CardObject } from './CardObject'
import { coverUrlFor } from './cardResources'
import { TAP_MAX_DELTA_PX, blockOccupancy, cellAtUv } from './friezeHit'
import {
  ORIGIN_INK,
  applyFriezePanel,
  createFriezeLookups,
  createFriezeMaterial,
  disposeFriezeLookups,
  hoverColorFor,
  panelKey,
  panelMeshes,
  setFriezeHover,
} from './friezeMaterial'
import { cellText } from './friezeText'
import type { FriezeTexture } from './friezeTexture'

interface FriezeProps {
  /** The archive in its own order; an item's index picks its hover tint. */
  items: readonly ArchiveItem[]
  layout: FriezeLayout
  /** The committed extent act two is framed against; `rows` comes from here. */
  extent: FriezeExtent
  /** Where the wall stands, computed by the host at resize, never per frame. */
  frame: FriezeFrame
  /** Null until the raster delivers: a cream wall that takes no hits. */
  masks: readonly FriezeTexture[] | null
  /** False outside act two: the wall still draws, but nothing responds. */
  active: boolean
  /**
   * Texels per world unit for the cards' captions — the wall's own density, so
   * a card's caption and the cells around it are set at the same sharpness.
   */
  texelsPerWorld: number
  /** The active language; the cards' titles and origin words follow it. */
  lang: 'en' | 'pt'
  onCellClick: (itemId: string) => void
  onCellHover: (itemId: string | null) => void
}

/** Nothing hovered: no panel, no item. */
const NO_HOVER = { panel: -1, itemId: null as string | null }

/** The card stands just proud of the wall; renderOrder does the real sorting. */
const CARD_Z = 0.001

/** One Project's card, resolved once from the layout, the archive and the data. */
interface WallCard {
  cell: Cell
  /** Index in `items`: the hover accent is keyed the same way cells are. */
  index: number
  origin: ArchiveItem['origin']
  title: string
  coverUrl: string | null
  /** The origin word, or empty for a professional piece. */
  originWord: string
  serial: string
  /** Set only on the one card whose block has no 1x1 cell to hold its count. */
  count?: string
  /** The card's own materials; nothing in act two drives their opacity. */
  materials: THREE.MeshBasicMaterial[]
}

/**
 * The archive wall: one mesh per mask panel, and the pointer resolved through
 * the occupancy table rather than through 171 objects.
 *
 * Hover lives in a ref and in the panel's uniforms, never in React state — a
 * pointer crossing the wall must not re-render a tree that the rig is driving,
 * so the only writes are a uniform, the canvas cursor and the host's callback,
 * and the callback fires on identity change alone.
 */
export function Frieze({
  items,
  layout,
  extent,
  frame,
  masks,
  active,
  texelsPerWorld,
  lang,
  onCellClick,
  onCellHover,
}: FriezeProps) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const rows = extent.rows

  const occupancy = useMemo(() => blockOccupancy(layout, rows), [layout, rows])
  const meshes = useMemo(
    () => panelMeshes(layout, rows, masks, texelsPerWorld),
    [layout, rows, masks, texelsPerWorld],
  )

  // Colour is per BLOCK and independent of the raster, so the lookups survive
  // every mask generation and are rebuilt only when the packing itself changes.
  const lookups = useMemo(() => createFriezeLookups(layout, items, rows), [layout, items, rows])
  useEffect(() => () => disposeFriezeLookups(lookups), [lookups])

  // Keyed on the panel PLAN, not on the meshes. The warm-up compiles these and
  // three's compileAsync then polls them by identity until the GPU reports the
  // programs ready; a mask landing meanwhile rebuilds the meshes, and a rebuild
  // of the materials would dispose the ones being polled, and the warm-up
  // would hang inside three. Same plan, same materials: a swap writes uniforms.
  const plan = panelKey(meshes)
  const materials = useMemo(
    () => plan.split('|').map(() => createFriezeMaterial()),
    [plan],
  )
  useEffect(
    () => () => {
      for (const material of materials) material.dispose()
    },
    [materials],
  )

  useLayoutEffect(() => {
    meshes.forEach((mesh, i) => {
      applyFriezePanel(materials[i], {
        mask: mesh.mask?.texture ?? null,
        lookup: lookups[mesh.panel.block],
        panel: mesh.panel,
        block: layout.blocks[mesh.panel.block],
        rows,
      })
    })
    invalidate()
  }, [meshes, materials, lookups, layout, rows, invalidate])

  // The nine Project cards. A Project's mask cell is drawn blank, so this is
  // the only thing that renders inside a 2x2 footprint.
  //
  // Deliberately NOT gated on the masks. The cards carry nine cover textures,
  // and mounting them only once a generation lands puts their first GPU upload
  // on a live frame during scroll — measured at 855 ms against a 300 ms budget
  // in `perf-budget.spec.ts`. Mounted from the start they are in the scene for
  // the warm-up's `initTexture` pass and its one offscreen frame, which is
  // exactly what that warm-up exists to pay for.
  const cards = useMemo<WallCard[]>(() => {
    const bySlug = new Map(projects.map((p) => [p.slug, p]))
    const out: WallCard[] = []
    for (const cell of layout.cells) {
      if (cell.span !== 2) continue
      const index = items.findIndex((item) => item.id === cell.itemId)
      const item = items[index]
      const slug = item?.caseStudy?.slug
      const project = slug ? bySlug.get(slug) : undefined
      if (!item || !project) {
        throw new Error(`frieze Project cell ${cell.itemId} has no project to draw`)
      }
      const text = cellText(item, lang)
      const block = layout.blocks[cell.block]
      // A block whose every cell is a Project has nowhere of its own to put
      // its count, so its top-left card carries it (third amendment).
      const carriesCount =
        countCell(layout, cell.block) === null && cell.col === block.startCol && cell.row === 0
      out.push({
        cell,
        index,
        origin: item.origin,
        title: project.title[lang],
        coverUrl: coverUrlFor(project.mockups),
        originWord: text.meta,
        serial: text.serial,
        count: carriesCount ? String(block.count) : undefined,
        materials: [],
      })
    }
    return out
  }, [layout, items, lang])

  // A card's title is tinted by writing its material, not by the shader: its
  // caption is white coverage, and the colour IS the ink (third amendment).
  const cardTitles = useRef(new Map<string, THREE.MeshBasicMaterial>())
  const onCardHandles = useMemo(
    () =>
      new Map(
        cards.map((card) => [
          card.cell.itemId,
          (handles: CaptionHandles | null) => {
            if (handles) cardTitles.current.set(card.cell.itemId, handles.title)
            else cardTitles.current.delete(card.cell.itemId)
          },
        ]),
      ),
    [cards],
  )
  const restCardTitle = useCallback(
    (itemId: string | null) => {
      if (!itemId) return
      const material = cardTitles.current.get(itemId)
      const item = items.find((i) => i.id === itemId)
      if (material && item) material.color.set(ORIGIN_INK[item.origin])
    },
    [items],
  )

  const hover = useRef(NO_HOVER)

  const clearHover = useCallback(() => {
    const { panel } = hover.current
    if (panel < 0) return
    const material = materials[panel]
    const mesh = meshes[panel]
    if (material && mesh) setFriezeHover(material, null, layout.blocks[mesh.panel.block], null)
    restCardTitle(hover.current.itemId)
    hover.current = NO_HOVER
    gl.domElement.style.cursor = ''
    onCellHover(null)
    invalidate()
  }, [materials, meshes, layout, gl, onCellHover, invalidate, restCardTitle])

  const setHover = useCallback(
    (panel: number, cell: Cell | null) => {
      if (hover.current.itemId === (cell?.itemId ?? null) && hover.current.panel === (cell ? panel : -1)) {
        return
      }
      if (!cell) {
        clearHover()
        return
      }
      const previous = hover.current.panel
      if (previous >= 0 && previous !== panel) {
        setFriezeHover(materials[previous], null, layout.blocks[meshes[previous].panel.block], null)
      }
      restCardTitle(hover.current.itemId)
      const block = layout.blocks[meshes[panel].panel.block]
      const index = items.findIndex((item) => item.id === cell.itemId)
      setFriezeHover(materials[panel], cell, block, hoverColorFor(index))
      // A Project's cell is blank in the mask, so the card's own title is the
      // whole affordance: the same tint every other cell gets.
      cardTitles.current.get(cell.itemId)?.color.set(hoverColorFor(index))
      hover.current = { panel, itemId: cell.itemId }
      gl.domElement.style.cursor = 'pointer'
      onCellHover(cell.itemId)
      invalidate()
    },
    [clearHover, materials, meshes, layout, items, gl, onCellHover, invalidate, restCardTitle],
  )

  // A cream wall has no cells to hit, and act one must not take the pointer
  // through the wall standing behind it.
  const live = active && masks !== null

  const cellUnder = useCallback(
    (i: number, uv: { x: number; y: number } | undefined): Cell | null => {
      if (!uv) return null
      const mesh = meshes[i]
      return cellAtUv(uv.x, uv.y, mesh.panel, occupancy[mesh.panel.block], layout)
    },
    [meshes, occupancy, layout],
  )

  const onPointerMove = (i: number) => (event: ThreeEvent<PointerEvent>) => {
    if (!live) return
    setHover(i, cellUnder(i, event.uv))
  }
  const onPointerOut = (i: number) => () => {
    if (hover.current.panel === i) clearHover()
  }
  const onClick = (i: number) => (event: ThreeEvent<MouseEvent>) => {
    if (!live) return
    // A scroll gesture that ends on the wall is not a tap (see TAP_MAX_DELTA_PX).
    if (event.delta > TAP_MAX_DELTA_PX) return
    const cell = cellUnder(i, event.uv)
    if (cell) onCellClick(cell.itemId)
  }

  // Leaving act two, a new mask generation and unmount all drop the hover: the
  // uniform, the cursor and the host's caption have to fall together.
  useEffect(() => {
    if (!live) clearHover()
  }, [live, clearHover])
  useEffect(() => clearHover, [clearHover])

  return (
    <group position={[frame.left, frame.top, frame.z]}>
      {meshes.map((mesh, i) => (
        <mesh
          key={`${mesh.panel.block}-${mesh.panel.panel}`}
          position={mesh.centre}
          material={materials[i]}
          onPointerMove={onPointerMove(i)}
          onPointerOut={onPointerOut(i)}
          onClick={onClick(i)}
        >
          <planeGeometry args={mesh.size} />
        </mesh>
      ))}

      {/* The card fills its 2x2 exactly (Q9): a 2-column, 2-row footprint is
          CARD_W by CARD_H, so no scaling is needed and none is applied. Its
          layers take no hits — the occupancy table under them is act two's one
          interaction source. */}
      {cards.map((card) => (
        <group
          key={card.cell.itemId}
          position={[
            (card.cell.col + 1) * FRIEZE_CELL_W,
            -(card.cell.row + 1) * FRIEZE_CELL_H,
            CARD_Z,
          ]}
        >
          <CardObject coverUrl={card.coverUrl} mode="wall" materials={card.materials}>
            <Caption
              index={card.index}
              title={card.title}
              wall={{
                texelsPerWorld,
                origin: card.originWord,
                serial: card.serial,
                count: card.count,
              }}
              titleColor={ORIGIN_INK[card.origin]}
              onHandles={onCardHandles.get(card.cell.itemId)}
            />
          </CardObject>
        </group>
      ))}
    </group>
  )
}
