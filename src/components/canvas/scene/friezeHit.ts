import {
  FRIEZE_CELL_H,
  type Cell,
  type FriezeLayout,
} from '../../../utils/friezeLayout'
import { CELL_INSET_WORLD, YEAR_COUNT_BAND_WORLD } from './friezeText'
import type { FriezePanel } from './friezeTexture'

/**
 * Which archive cell a pointer landed on, from a panel's UV alone.
 *
 * The wall is five meshes, not 171: a raycast returns the panel's UV, and a
 * flat occupancy table turns that into a cell. A 2×2 span writes its index
 * into all four of its slots, so anywhere inside a case study's footprint
 * resolves to the one cell, and a hole stays a hole.
 */

/**
 * R3F fills `event.delta` (px between pointerdown and click) on every hit
 * click but only filters MISSES by it (@react-three/fiber 9.7.0), so a scroll
 * gesture that ends on the wall — or on a corridor card — has to be ignored by
 * hand. One threshold for both surfaces: the corridor imports it from here.
 */
export const TAP_MAX_DELTA_PX = 6

export interface BlockOccupancy {
  /** Zero-based block index into `layout.blocks`. */
  block: number
  /** The block's absolute first column, from the frieze's left edge. */
  startCol: number
  columns: number
  rows: number
  /** Column-major `(col * rows + row)` → index into `layout.cells`, or −1. */
  slots: Int32Array
}

/** The count band a block's first column reserves at its top, as a fraction of one cell. */
const COUNT_BAND_FRAC = (CELL_INSET_WORLD + YEAR_COUNT_BAND_WORLD) / FRIEZE_CELL_H

/** One occupancy table per block, block-relative columns, built once per layout. */
export function blockOccupancy(layout: FriezeLayout, rows: number): BlockOccupancy[] {
  const tables = layout.blocks.map((block, index) => ({
    block: index,
    startCol: block.startCol,
    columns: block.columns,
    rows,
    slots: new Int32Array(block.columns * rows).fill(-1),
  }))
  layout.cells.forEach((cell, index) => {
    const table = tables[cell.block]
    if (!table) throw new Error(`frieze cell ${cell.itemId} has no block ${cell.block}`)
    const col = cell.col - table.startCol
    for (let x = 0; x < cell.span; x++) {
      for (let y = 0; y < cell.span; y++) {
        table.slots[(col + x) * rows + cell.row + y] = index
      }
    }
  })
  return tables
}

/**
 * The cell under a panel's UV, or null on a hole, on blank padding, outside the
 * panel, or inside a year count band.
 *
 * The mask's row 0 is the wall's TOP (`flipY = false`), while three's raycast
 * UV grows upward, so the vertical axis is flipped here exactly as the shader
 * flips it. Both axes are half-open on the texture's own frame: `u = 1` and
 * `v = 0` belong to the next panel and the row below, neither of which exists.
 */
export function cellAtUv(
  u: number,
  v: number,
  panel: FriezePanel,
  occupancy: BlockOccupancy,
  layout: FriezeLayout,
): Cell | null {
  const x = u
  const y = 1 - v
  if (!(x >= 0 && x < 1) || !(y >= 0 && y < 1)) return null

  const { rows } = occupancy
  const col = Math.floor(x * panel.columns) + panel.startCol - occupancy.startCol
  const row = Math.floor(y * rows)
  if (col < 0 || col >= occupancy.columns || row < 0 || row >= rows) return null

  const index = occupancy.slots[col * rows + row]
  if (index < 0) return null
  const cell = layout.cells[index]

  // The block's count is drawn over its own first column's top row, in panel 0.
  // It only displaces text when that slot is a 1×1: under a 2×2 card the count
  // is hidden, so the card keeps its whole footprint.
  if (col === 0 && row === 0 && cell.span === 1 && y * rows - row < COUNT_BAND_FRAC) return null

  return cell
}
