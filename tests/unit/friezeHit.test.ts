import { describe, it, expect } from 'vitest'
import type { ArchiveItem } from '../../src/types/content'
import {
  FRIEZE_CELL_H,
  FRIEZE_ROWS,
  countCell,
  friezeLayout,
  type Cell,
} from '../../src/utils/friezeLayout'
import { archive } from '../../src/data/archive'
import { CELL_INSET_WORLD, YEAR_COUNT_BAND_WORLD } from '../../src/components/canvas/scene/friezeText'
import { panelsFor, type FriezePanel } from '../../src/components/canvas/scene/friezeTexture'
import {
  TAP_MAX_DELTA_PX,
  blockOccupancy,
  cellAtUv,
} from '../../src/components/canvas/scene/friezeHit'

function piece(id: string, year: number, project = false): ArchiveItem {
  return {
    id,
    title: id,
    origin: 'professional',
    caseStudy: project ? { slug: id } : undefined,
    date: '01/01/2000',
    sortDate: Date.UTC(2000, 0, 1),
    year,
    href: '#',
    internal: project,
    serial: 1,
  }
}

/** 2025: a Project at the top-left, then editorials; 2024: one editorial at its top-left. */
const items = [
  piece('featured-a', 2025, true),
  piece('editorial-0', 2025),
  piece('editorial-1', 2025),
  piece('editorial-2', 2024),
]
const layout = friezeLayout(items, FRIEZE_ROWS)
const occupancy = blockOccupancy(layout, FRIEZE_ROWS)
const wholeBlock = (block: number): FriezePanel => ({
  block,
  panel: 0,
  startCol: layout.blocks[block].startCol,
  columns: layout.blocks[block].columns,
})

/** UV for the centre of a slot, in three's convention (v grows upward). */
function uvAt(panel: FriezePanel, col: number, row: number, dx = 0.5, dy = 0.5): [number, number] {
  return [(col - panel.startCol + dx) / panel.columns, 1 - (row + dy) / FRIEZE_ROWS]
}

const id = (cell: Cell | null): string | null => cell?.itemId ?? null

describe('TAP_MAX_DELTA_PX', () => {
  it('is the corridor threshold, six pixels', () => {
    expect(TAP_MAX_DELTA_PX).toBe(6)
  })
})

describe('blockOccupancy', () => {
  it('builds one table per block with every slot of a 2×2 span pointing at its cell', () => {
    expect(occupancy).toHaveLength(2)
    const a = layout.cells.findIndex((c) => c.itemId === 'featured-a')
    const table = occupancy[0]
    expect(table.columns).toBe(layout.blocks[0].columns)
    expect(table.rows).toBe(FRIEZE_ROWS)
    for (const [col, row] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      expect(table.slots[col * FRIEZE_ROWS + row]).toBe(a)
    }
    // Holes are −1, never a stale index.
    expect(table.slots[1 * FRIEZE_ROWS + 5]).toBe(-1)
  })
})

describe('cellAtUv', () => {
  it('resolves all four slots of a Project to the one cell', () => {
    const panel = wholeBlock(0)
    for (const [col, row] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      expect(id(cellAtUv(...uvAt(panel, col, row), panel, occupancy[0], layout))).toBe('featured-a')
    }
  })

  it('returns null for holes and for blank padding', () => {
    const panel = wholeBlock(0)
    expect(id(cellAtUv(...uvAt(panel, 1, 5), panel, occupancy[0], layout))).toBeNull()
    expect(id(cellAtUv(...uvAt(panel, 1, 2), panel, occupancy[0], layout))).toBeNull()
  })

  it('reads the texture frame top-down: v = 1 is the top row, v = 0 is rejected', () => {
    const panel = wholeBlock(0)
    const topLeft = cellAtUv(0.25, 1, panel, occupancy[0], layout)
    expect(id(topLeft)).toBe('featured-a')
    expect(cellAtUv(0.25, 0, panel, occupancy[0], layout)).toBeNull()
  })

  it('is half-open: u = 1 and anything outside [0, 1) is rejected', () => {
    const panel = wholeBlock(0)
    expect(cellAtUv(1, 0.9, panel, occupancy[0], layout)).toBeNull()
    expect(cellAtUv(-0.001, 0.9, panel, occupancy[0], layout)).toBeNull()
    expect(cellAtUv(0.5, 1.001, panel, occupancy[0], layout)).toBeNull()
    expect(cellAtUv(0.999, 0.999, panel, occupancy[0], layout)).not.toBeNull()
  })

  it('hits the editorial cells at their own rows, half-open on the row seam', () => {
    const panel = wholeBlock(0)
    const e0 = layout.cells.find((c) => c.itemId === 'editorial-0')!
    expect(id(cellAtUv(...uvAt(panel, e0.col, e0.row), panel, occupancy[0], layout))).toBe('editorial-0')
    // Exactly on the seam between rows r and r+1 belongs to r+1 (top-down, floor).
    const seam = 1 - (e0.row + 1) / FRIEZE_ROWS
    const below = cellAtUv((e0.col - panel.startCol + 0.5) / panel.columns, seam, panel, occupancy[0], layout)
    expect(below?.row).toBe(e0.row + 1)
  })

  it('keeps the year count band noninteractive on whichever cell carries the count', () => {
    const bandFrac = (CELL_INSET_WORLD + YEAR_COUNT_BAND_WORLD) / FRIEZE_CELL_H

    // Block 1's first 1x1 IS its top-left, so nothing moves there.
    const panel = wholeBlock(1)
    const e2 = countCell(layout, 1)!
    expect(e2.itemId).toBe('editorial-2')
    expect(e2.col).toBe(layout.blocks[1].startCol)
    expect(e2.row).toBe(0)
    expect(cellAtUv(...uvAt(panel, e2.col, e2.row, 0.5, bandFrac * 0.5), panel, occupancy[1], layout)).toBeNull()
    expect(id(cellAtUv(...uvAt(panel, e2.col, e2.row, 0.5, bandFrac * 1.5), panel, occupancy[1], layout))).toBe('editorial-2')

    // Block 0's top-left is a Project, so its count moved down to the first
    // 1x1 and the band moved with it — the raster and the hit test read the
    // one rule (countCell), or they drift.
    const project = wholeBlock(0)
    const e0 = countCell(layout, 0)!
    expect(e0.itemId).toBe('editorial-0')
    expect(e0.row).toBeGreaterThan(0)
    expect(cellAtUv(...uvAt(project, e0.col, e0.row, 0.5, bandFrac * 0.5), project, occupancy[0], layout)).toBeNull()
    expect(id(cellAtUv(...uvAt(project, e0.col, e0.row, 0.5, bandFrac * 1.5), project, occupancy[0], layout))).toBe('editorial-0')

    // And the card keeps its whole footprint: no band crosses it any more.
    expect(id(cellAtUv(...uvAt(project, 0, 0, 0.5, bandFrac * 0.5), project, occupancy[0], layout))).toBe('featured-a')
  })

  it("maps a second panel's u = 0 to its own first column, not the block edge", () => {
    const packed = friezeLayout(archive, FRIEZE_ROWS)
    const tables = blockOccupancy(packed, FRIEZE_ROWS)
    const block = packed.blocks[2]
    const panels = panelsFor({ ...block, index: 2 }, packed.cells, 432)
    expect(panels).toHaveLength(2)
    const second = panels[1]
    const hit = cellAtUv(0.5 / second.columns, 0.5, second, tables[2], packed)
    const expected = packed.cells.find(
      (c) => c.block === 2 && c.col <= second.startCol && second.startCol < c.col + c.span && c.row <= 3 && 3 < c.row + c.span,
    )
    expect(id(hit)).toBe(expected?.itemId ?? null)
    // The first panel's last column is the block's column right before the boundary.
    const first = panels[0]
    const edge = cellAtUv(1 - 0.5 / first.columns, 0.5, first, tables[2], packed)
    if (edge) expect(edge.col + edge.span).toBeLessThanOrEqual(second.startCol)
    // u = 1 is the SECOND panel's first column, so the first panel must reject
    // it. Block 0's own right edge is also the block's, so only a split block
    // can tell a half-open bound from the occupancy table's bounds check.
    expect(cellAtUv(1, 0.5, first, tables[2], packed)).toBeNull()
  })

  it('never returns a cell belonging to another block', () => {
    const panel = wholeBlock(1)
    for (let u = 0.01; u < 1; u += 0.07) {
      for (let v = 0.01; v <= 1; v += 0.07) {
        const cell = cellAtUv(u, v, panel, occupancy[1], layout)
        if (cell) expect(cell.block).toBe(1)
      }
    }
  })
})
