/**
 * The archive frieze's grid: cell size, row count, and the extent the scene's
 * act two is framed against.
 *
 * OWNERSHIP. Pipeline 1 (motion) owns the constants and base extent types.
 * Pipeline 2 (the wall) supplies packing and the extent superset under three
 * rules:
 *
 * 1. It may EXTEND `FriezeExtent` (a block's `count`, the extent's `width` and
 *    `height`) but never replace or re-shape it: `friezeExtent`'s result must
 *    stay structurally assignable to the type below, which is what `sceneMotion`
 *    consumes.
 * 2. It does NOT retune the cell constants. The spec fixes a cell at half a
 *    scene card so a 2×2 span is exactly one card, with no inset, and
 *    `FRIEZE_ROWS` at six in BOTH orientations (amended decision 15): act two
 *    has no vertical camera travel, so a taller frieze would leave rows off
 *    frame forever. `maxRowsInFrame(g)` in `sceneMotion.ts` is the bound.
 * 3. The import direction is one-way: `sceneMotion.ts` imports from here, never
 *    the reverse. That is why `CARD_W` and `CARD_H` are re-declared below
 *    instead of imported; the unit test asserts the two pairs are equal, so the
 *    duplication cannot drift.
 */
import type { ArchiveItem } from '../types/content'

/**
 * Card plane in world units, mirrored from `sceneMotion.ts` because the import
 * direction forbids reading them from there.
 * Guarded by `tests/unit/friezeLayout.provisional.test.ts`.
 */
const CARD_W = 1
const CARD_H = 448 / 620

/**
 * One frieze cell is half a scene card, so a 2×2 case study spans exactly one
 * `CARD_W` × `CARD_H` with no inset. Written as the relation, not as a decimal,
 * so the half-card rule is structural rather than remembered.
 */
export const FRIEZE_CELL_W = CARD_W / 2
export const FRIEZE_CELL_H = CARD_H / 2

/**
 * Six rows, in both orientations (amended decision 15). Portrait sees fewer
 * columns at a time, not more rows.
 *
 * Six, not eight: the frieze is bottom-anchored and act two has no vertical
 * camera travel, so anything that does not fit the frame at the dolly is off
 * the TOP of it forever. Eight rows fill 832.4 / heightPx of the frame, so
 * every viewport shorter than ~833 CSS px overflowed — 1280x720 (Playwright's
 * own desktop project) by 16 %, and `actTwoTopClearFrac` went NEGATIVE there,
 * which is the number pipeline 2 insets the top row's ink by. Seven rows still
 * miss 720 px by 1.2 %. Six clear every viewport in the matrix, at 35 columns
 * and 1025 svh of act two. `friezeFitsFrame` in the test suite is the guard.
 */
export const FRIEZE_ROWS = 6

export interface FriezeBlockExtent {
  year: number
  /** First column of the block, 0 = the newest edge (the reader's left). */
  startCol: number
  /** Width in columns; the sum over blocks equals `FriezeExtent.columns`. */
  columns: number
}

export interface FriezeExtent {
  columns: number
  rows: number
  /** Newest first, contiguous: `blocks[k+1].startCol === blocks[k].startCol + blocks[k].columns`. */
  blocks: readonly FriezeBlockExtent[]
}

export interface Cell {
  itemId: string
  block: number // zero-based block index; not a year
  col: number // absolute column from the frieze's left edge
  row: number // zero-based from the top
  span: 1 | 2
}

export interface FriezeBlock extends FriezeBlockExtent {
  count: number // pieces, not occupied slots
}

export interface FriezeLayout {
  columns: number
  blocks: FriezeBlock[]
  cells: Cell[]
}

export interface PackedFriezeExtent extends FriezeExtent {
  blocks: readonly FriezeBlock[]
  width: number
  height: number
}

/** All slots in a footprint must be vacant and within the configured rows. */
function fits(
  occupied: ReadonlySet<number>,
  col: number,
  row: number,
  span: 1 | 2,
  rows: number,
): boolean {
  if (row + span > rows) return false
  for (let x = 0; x < span; x++) {
    for (let y = 0; y < span; y++) {
      if (occupied.has((col + x) * rows + row + y)) return false
    }
  }
  return true
}

/** Pack each year independently: case studies first, then backfill with Embeds. */
export function friezeLayout(items: readonly ArchiveItem[], rows: number): FriezeLayout {
  if (!Number.isInteger(rows) || rows < 2) throw new Error(`Invalid rows: ${rows}`)

  const ids = new Set<string>()
  const byYear = new Map<number, ArchiveItem[]>()
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate item.id: ${item.id}`)
    ids.add(item.id)
    const yearItems = byYear.get(item.year)
    if (yearItems) yearItems.push(item)
    else byYear.set(item.year, [item])
  }

  const blocks: FriezeBlock[] = []
  const cells: Cell[] = []
  let columns = 0
  for (const [year, yearItems] of [...byYear].sort(([a], [b]) => b - a)) {
    const occupied = new Set<number>()
    const startCol = columns
    let blockColumns = 0

    for (const span of [2, 1] as const) {
      for (const item of yearItems) {
        if ((item.caseStudy !== undefined ? 2 : 1) !== span) continue
        // Flattened slots scan column first, then row; each pass can fill holes.
        let slot = 0
        while (!fits(occupied, Math.floor(slot / rows), slot % rows, span, rows)) slot++
        const col = Math.floor(slot / rows)
        const row = slot % rows
        for (let x = 0; x < span; x++) {
          for (let y = 0; y < span; y++) occupied.add((col + x) * rows + row + y)
        }
        cells.push({ itemId: item.id, block: blocks.length, col: startCol + col, row, span })
        blockColumns = Math.max(blockColumns, col + span)
      }
    }

    blocks.push({ year, startCol, columns: blockColumns, count: yearItems.length })
    columns += blockColumns
  }
  return { columns, blocks, cells }
}

export function friezeExtent(layout: FriezeLayout, rows: number): PackedFriezeExtent {
  return {
    columns: layout.columns,
    rows,
    blocks: layout.blocks,
    width: layout.columns * FRIEZE_CELL_W,
    height: rows * FRIEZE_CELL_H,
  }
}
