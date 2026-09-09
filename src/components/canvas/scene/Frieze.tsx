import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import type { ArchiveItem } from '../../../types/content'
import type { Cell, FriezeExtent, FriezeLayout } from '../../../utils/friezeLayout'
import type { FriezeFrame } from '../../../utils/sceneMotion'
import { TAP_MAX_DELTA_PX, blockOccupancy, cellAtUv } from './friezeHit'
import {
  applyFriezePanel,
  createFriezeLookups,
  createFriezeMaterial,
  disposeFriezeLookups,
  hoverColorFor,
  panelMeshes,
  setFriezeHover,
} from './friezeMaterial'
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
  onCellClick: (itemId: string) => void
  onCellHover: (itemId: string | null) => void
}

/** Nothing hovered: no panel, no item. */
const NO_HOVER = { panel: -1, itemId: null as string | null }

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
  onCellClick,
  onCellHover,
}: FriezeProps) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const rows = extent.rows

  const occupancy = useMemo(() => blockOccupancy(layout, rows), [layout, rows])
  const meshes = useMemo(() => panelMeshes(layout, rows, masks), [layout, rows, masks])

  // Colour is per BLOCK and independent of the raster, so the lookups survive
  // every mask generation and are rebuilt only when the packing itself changes.
  const lookups = useMemo(() => createFriezeLookups(layout, items, rows), [layout, items, rows])
  useEffect(() => () => disposeFriezeLookups(lookups), [lookups])

  const materials = useMemo(() => meshes.map(() => createFriezeMaterial()), [meshes])
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

  const hover = useRef(NO_HOVER)

  const clearHover = useCallback(() => {
    const { panel } = hover.current
    if (panel < 0) return
    const material = materials[panel]
    const mesh = meshes[panel]
    if (material && mesh) setFriezeHover(material, null, layout.blocks[mesh.panel.block], null)
    hover.current = NO_HOVER
    gl.domElement.style.cursor = ''
    onCellHover(null)
    invalidate()
  }, [materials, meshes, layout, gl, onCellHover, invalidate])

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
      const block = layout.blocks[meshes[panel].panel.block]
      const index = items.findIndex((item) => item.id === cell.itemId)
      setFriezeHover(materials[panel], cell, block, hoverColorFor(index))
      hover.current = { panel, itemId: cell.itemId }
      gl.domElement.style.cursor = 'pointer'
      onCellHover(cell.itemId)
      invalidate()
    },
    [clearHover, materials, meshes, layout, items, gl, onCellHover, invalidate],
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
    </group>
  )
}
