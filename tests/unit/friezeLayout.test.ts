import { describe, expect, it } from 'vitest'
import { archive } from '../../src/data/archive'
import type { ArchiveItem } from '../../src/types/content'
import {
  FRIEZE_CELL_H,
  FRIEZE_CELL_W,
  FRIEZE_ROWS,
  countCell,
  friezeExtent,
  friezeLayout,
  type Cell,
  type FriezeLayout,
} from '../../src/utils/friezeLayout'
import { actTwoPose, maxRowsInFrame, sceneGeometry } from '../../src/utils/sceneMotion'

function piece(id: string, year = 2026, project = false): ArchiveItem {
  return {
    id,
    title: id,
    origin: 'professional',
    caseStudy: project ? { slug: id } : undefined,
    date: '01/01/2000',
    // Deliberately disagrees with year: packing owns neither dates nor sorting.
    sortDate: Date.UTC(2000, 0, 1),
    year,
    href: '#',
    internal: project,
    serial: 1,
  }
}

/** Read the result as a grid, without deciding where any piece should go. */
function grid(layout: FriezeLayout, rows: number): string[][] {
  const result = Array.from({ length: rows }, () => Array<string>(layout.columns).fill('.'))
  for (const cell of layout.cells) {
    for (let x = 0; x < cell.span; x++) {
      for (let y = 0; y < cell.span; y++) result[cell.row + y][cell.col + x] = cell.itemId
    }
  }
  return result
}

function slots(cells: readonly Cell[]): string[] {
  return cells.flatMap((cell) => Array.from({ length: cell.span ** 2 }, (_, i) =>
    `${cell.col + Math.floor(i / cell.span)},${cell.row + i % cell.span}`,
  ))
}

describe('friezeLayout · hand-computed packing', () => {
  it('places Projects first and backfills odd-row holes from column zero', () => {
    // Incoming order within each pass is z, a; IDs and dates must not re-sort it.
    const items = [piece('ez'), piece('pz', 2026, true), piece('ea'), piece('pa', 2026, true)]
    items[2].sortDate += 1
    items[3].sortDate += 1
    expect(grid(friezeLayout(items, 3), 3)).toEqual([
      ['pz', 'pz', 'pa', 'pa'],
      ['pz', 'pz', 'pa', 'pa'],
      ['ez', 'ea', '.', '.'],
    ])
  })

  it.each([
    { rows: 2, positions: [[0, 0], [2, 0], [4, 0], [6, 0]], columns: 8 },
    { rows: 3, positions: [[0, 0], [2, 0], [4, 0], [6, 0]], columns: 8 },
    { rows: 5, positions: [[0, 0], [0, 2], [2, 0], [2, 2]], columns: 4 },
    { rows: 7, positions: [[0, 0], [0, 2], [0, 4], [2, 0]], columns: 4 },
  ])('packs only Projects at $rows rows through their last occupied column', ({ rows, positions, columns }) => {
    const layout = friezeLayout(['pz', 'py', 'px', 'pw'].map((id) => piece(id, 2026, true)), rows)
    expect(layout).toEqual({
      columns,
      blocks: [{ year: 2026, startCol: 0, columns, count: 4 }],
      cells: ['pz', 'py', 'px', 'pw'].map((itemId, i) => ({
        itemId, block: 0, col: positions[i][0], row: positions[i][1], span: 2,
      })),
    })
  })

  it('packs only Embeds down a column before moving right', () => {
    expect(grid(friezeLayout(['ez', 'ey', 'ex', 'ew'].map((id) => piece(id)), 3), 3)).toEqual([
      ['ez', 'ew'],
      ['ey', '.'],
      ['ex', '.'],
    ])
  })

  it('reserves two columns for a lone Project even when its area fits in one', () => {
    expect(friezeLayout([piece('p', 2026, true)], 6).blocks).toEqual([
      { year: 2026, startCol: 0, columns: 2, count: 1 },
    ])
  })

  it('reserves one column for a lone Embed', () => {
    expect(friezeLayout([piece('e')], 6).blocks).toEqual([
      { year: 2026, startCol: 0, columns: 1, count: 1 },
    ])
  })

  it('groups by item.year newest first and leaves earlier-year holes empty', () => {
    const layout = friezeLayout([
      piece('old', 2024), piece('p', 2026, true), piece('last', 2022), piece('new', 2026),
    ], 3)
    expect(layout).toEqual({
      columns: 4,
      blocks: [
        { year: 2026, startCol: 0, columns: 2, count: 2 },
        { year: 2024, startCol: 2, columns: 1, count: 1 },
        { year: 2022, startCol: 3, columns: 1, count: 1 },
      ],
      cells: [
        { itemId: 'p', block: 0, col: 0, row: 0, span: 2 },
        { itemId: 'new', block: 0, col: 0, row: 2, span: 1 },
        { itemId: 'old', block: 1, col: 2, row: 0, span: 1 },
        { itemId: 'last', block: 2, col: 3, row: 0, span: 1 },
      ],
    })
  })

  it('returns no columns, blocks or cells for empty input', () => {
    expect(friezeLayout([], 6)).toEqual({ columns: 0, blocks: [], cells: [] })
  })

  it.each([2026, 2024])('rejects duplicate IDs even across years (%i)', (year) => {
    expect(() => friezeLayout([piece('duplicate-id'), piece('duplicate-id', year)], 6))
      .toThrow(new Error('Duplicate item.id: duplicate-id'))
  })

  it.each([1, 0, -1, 2.5, NaN])('rejects invalid rows %s even for empty input', (rows) => {
    expect(() => friezeLayout([], rows)).toThrow(new Error(`Invalid rows: ${rows}`))
  })

  it('is deterministic across repeated calls with intervening layouts', () => {
    const first = structuredClone(friezeLayout(archive, 6))
    friezeLayout([...archive].reverse(), 3)
    friezeLayout([], 7)
    expect(friezeLayout(archive, 6)).toEqual(first)
  })

  it('accepts a frozen array of frozen items without writing to either', () => {
    const frozen = Object.freeze([piece('e'), piece('p', 2026, true)].map((item) => {
      if (item.caseStudy) Object.freeze(item.caseStudy)
      return Object.freeze(item)
    }))
    expect(() => friezeLayout(frozen, 3)).not.toThrow()
  })
})

describe('friezeLayout · real archive', () => {
  it('returns exactly one cell per piece', () => {
    expect(friezeLayout(archive, 6).cells).toHaveLength(archive.length)
  })

  it('returns unique cell itemIds', () => {
    const { cells } = friezeLayout(archive, 6)
    expect(new Set(cells.map((cell) => cell.itemId)).size).toBe(cells.length)
  })

  it('returns only itemIds present in the input', () => {
    const ids = new Set(archive.map((item) => item.id))
    expect(friezeLayout(archive, 6).cells.filter((cell) => !ids.has(cell.itemId))).toEqual([])
  })

  it('never claims an occupied slot twice', () => {
    const occupied = slots(friezeLayout(archive, 6).cells)
    expect(new Set(occupied).size).toBe(occupied.length)
  })

  it('keeps cell tops at or below row zero', () => {
    expect(friezeLayout(archive, 6).cells.every((cell) => cell.row >= 0)).toBe(true)
  })

  it('keeps entire spans above the bottom edge', () => {
    expect(friezeLayout(archive, 6).cells.every((cell) => cell.row + cell.span <= 6)).toBe(true)
  })

  it('uses zero-based block indices belonging to each item year', () => {
    const { cells, blocks } = friezeLayout(archive, 6)
    const years = new Map(archive.map((item) => [item.id, item.year]))
    expect(cells.every((cell) => blocks[cell.block]?.year === years.get(cell.itemId))).toBe(true)
  })

  it('keeps absolute columns at or after their block start', () => {
    const { cells, blocks } = friezeLayout(archive, 6)
    expect(cells.every((cell) => cell.col >= blocks[cell.block].startCol)).toBe(true)
  })

  it('keeps entire spans before the next year block', () => {
    const { cells, blocks } = friezeLayout(archive, 6)
    expect(cells.every((cell) => cell.col + cell.span <= blocks[cell.block].startCol + blocks[cell.block].columns)).toBe(true)
  })

  it('places case studies in the earliest columns of each year', () => {
    const { cells, blocks } = friezeLayout(archive, 6)
    // Each shipped Project-bearing year has three 2×2 spans: all fit at col 0.
    expect(cells.filter((cell) => cell.span === 2).map((cell) => cell.col - blocks[cell.block].startCol))
      .toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('places consecutive Embeds in input order along column-major slots', () => {
    const { cells, blocks } = friezeLayout(archive, 6)
    const byId = new Map(cells.map((cell) => [cell.itemId, cell]))
    const ordered = blocks.every((block) => {
      const positions = archive.filter((item) => item.year === block.year && item.caseStudy === undefined)
        .map((item) => byId.get(item.id)!)
        .map((cell) => cell.col * 6 + cell.row)
      return positions.every((position, i) => i === 0 || positions[i - 1] < position)
    })
    expect(ordered).toBe(true)
  })

  it('produces the four agreed blocks with piece counts', () => {
    expect(friezeLayout(archive, 6).blocks).toEqual([
      { year: 2026, startCol: 0, columns: 2, count: 3 },
      { year: 2025, startCol: 2, columns: 9, count: 42 },
      { year: 2024, startCol: 11, columns: 22, count: 118 },
      { year: 2023, startCol: 33, columns: 2, count: 8 },
    ])
  })

  it('keeps block starts contiguous from zero', () => {
    const { blocks } = friezeLayout(archive, 6)
    expect(blocks.map((block) => block.startCol)).toEqual(
      blocks.map((_, i) => i === 0 ? 0 : blocks[i - 1].startCol + blocks[i - 1].columns),
    )
  })

  it('sums block widths to the total column count', () => {
    const { blocks, columns } = friezeLayout(archive, 6)
    expect(blocks.reduce((sum, block) => sum + block.columns, 0)).toBe(columns)
  })

  it('produces 171 cells including nine case-study spans and 198 occupied slots', () => {
    const { cells, columns } = friezeLayout(archive, 6)
    expect({ columns, cells: cells.length, spans: cells.filter((cell) => cell.span === 2).length, slots: slots(cells).length })
      .toEqual({ columns: 35, cells: 171, spans: 9, slots: 198 })
  })
})

describe('friezeExtent', () => {
  it('exposes columns, configured rows and physical dimensions', () => {
    const layout = friezeLayout(archive, FRIEZE_ROWS)
    expect(friezeExtent(layout, FRIEZE_ROWS)).toEqual({
      columns: 35, rows: 6, blocks: layout.blocks,
      width: 35 * FRIEZE_CELL_W, height: 6 * FRIEZE_CELL_H,
    })
  })

  it('retains the packed blocks including counts by reference', () => {
    const layout = friezeLayout(archive, FRIEZE_ROWS)
    expect(friezeExtent(layout, FRIEZE_ROWS).blocks).toBe(layout.blocks)
  })

  it('retains configured height with zero width for an empty layout', () => {
    expect(friezeExtent(friezeLayout([], 5), 5)).toEqual({
      columns: 0, rows: 5, blocks: [], width: 0, height: 5 * FRIEZE_CELL_H,
    })
  })
})

describe('fixed-row packed extent through Motion', () => {
  // Sweep across and outside the 0.85–1.05 crossover. Motion receives the same
  // packing as Projects; viewport geometry never becomes a packing input.
  it.each([0.46, 0.7, 0.85, 0.95, 1, 1.05, 1.33, 1.6, 1.78, 2.33])(
    'keeps the complete extent identical at aspect %s', (aspect) => {
      const extent = friezeExtent(friezeLayout(archive, FRIEZE_ROWS), FRIEZE_ROWS)
      actTwoPose(1, extent, sceneGeometry(aspect * 851, 851))
      expect(extent).toEqual({
        columns: 35, rows: 6, width: 35 * FRIEZE_CELL_W, height: 6 * FRIEZE_CELL_H,
        blocks: [
          { year: 2026, startCol: 0, columns: 2, count: 3 },
          { year: 2025, startCol: 2, columns: 9, count: 42 },
          { year: 2024, startCol: 11, columns: 22, count: 118 },
          { year: 2023, startCol: 33, columns: 2, count: 8 },
        ],
      })
    },
  )

  // Existing motion tests cover fill and clearance using SHIPPED_FRIEZE. This
  // seam checks the bound against the archive's actual configured extent.
  it.each([
    [1440, 900], [1920, 1080], [1280, 720], [1024, 640],
    [1440, 790], [820, 821], [393, 851],
  ])('fits the real packed rows within the bound at %ix%i', (width, height) => {
    const extent = friezeExtent(friezeLayout(archive, FRIEZE_ROWS), FRIEZE_ROWS)
    expect(maxRowsInFrame(sceneGeometry(width, height))).toBeGreaterThanOrEqual(extent.rows)
  })
})

describe('countCell', () => {
  /** `n` pieces in one year, the first `projects` of them case studies. */
  function year(y: number, n: number, projects: number): ArchiveItem[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `${y}-${i}`,
      title: `${y}-${i}`,
      origin: 'professional' as const,
      caseStudy: i < projects ? { slug: `${y}-${i}` } : undefined,
      date: '01/01/2000',
      sortDate: Date.UTC(2000, 0, 1),
      year: y,
      href: '#',
      internal: i < projects,
      serial: i + 1,
    }))
  }

  it('takes the block top-left when it is a one-cell piece', () => {
    const layout = friezeLayout(year(2023, 4, 0), FRIEZE_ROWS)
    const cell = countCell(layout, 0)
    expect(cell?.col).toBe(0)
    expect(cell?.row).toBe(0)
    expect(cell?.span).toBe(1)
  })

  it('skips a 2x2 case study in the corner and takes the first one-cell after it', () => {
    const layout = friezeLayout(year(2025, 5, 1), FRIEZE_ROWS)
    const cell = countCell(layout, 0)
    expect(cell?.span).toBe(1)
    // The packer fills column-first, so the one-cell pieces stack BELOW the
    // corner card rather than beside it. The count follows them down; what it
    // must never do is land inside the card's footprint.
    expect(cell?.col).toBe(0)
    expect(cell?.row).toBe(2)
  })

  it('drops below every stacked case study, however many there are', () => {
    // Two 2x2s stack in the same two columns, filling rows 0-3; the one-cell
    // pieces start at row 4, and the count goes with them.
    const layout = friezeLayout(year(2022, 4, 2), FRIEZE_ROWS)
    const cell = countCell(layout, 0)
    expect(cell?.span).toBe(1)
    expect(cell?.col).toBe(0)
    expect(cell?.row).toBe(4)
  })

  it('prefers the highest cell over the leftmost one', () => {
    // One card, then ten one-cell pieces: they fill the rest of column 0, then
    // column 1, then reach the top of column 2. Row-major picks that top cell;
    // a column-major scan would pick the lower one in column 0 instead, and the
    // count would sit halfway down the wall.
    const layout = friezeLayout(year(2021, 11, 1), FRIEZE_ROWS)
    const cell = countCell(layout, 0)
    expect(cell?.row).toBe(0)
    expect(cell?.col).toBe(2)
    expect(layout.cells.some((c) => c.span === 1 && c.col === 0 && c.row === 2)).toBe(true)
  })

  it('returns null when a block is nothing but case studies, so a card must carry it', () => {
    // 2026 today: three 2x2 projects exactly fill a 2-column, six-row block.
    const layout = friezeLayout(year(2026, 3, 3), FRIEZE_ROWS)
    expect(layout.blocks[0].columns).toBe(2)
    expect(countCell(layout, 0)).toBeNull()
  })

  it('agrees with the real archive: only 2026 needs the card fallback', () => {
    const layout = friezeLayout(archive, FRIEZE_ROWS)
    const placed = layout.blocks.map((block, i) => [block.year, countCell(layout, i)] as const)
    expect(placed.map(([y, c]) => [y, c && [c.col, c.row]])).toEqual([
      [2026, null],
      [2025, [4, 0]],
      [2024, [13, 0]],
      [2023, [33, 0]],
    ])
  })

  it('never returns a cell from a neighbouring block', () => {
    const layout = friezeLayout([...year(2025, 5, 1), ...year(2024, 4, 0)], FRIEZE_ROWS)
    for (const [i, block] of layout.blocks.entries()) {
      const cell = countCell(layout, i)
      expect(cell?.block).toBe(i)
      expect(cell!.col).toBeGreaterThanOrEqual(block.startCol)
      expect(cell!.col).toBeLessThan(block.startCol + block.columns)
    }
  })
})
