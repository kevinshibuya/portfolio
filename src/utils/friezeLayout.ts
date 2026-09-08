/**
 * The archive frieze's grid: cell size, row count, and the extent the scene's
 * act two is framed against.
 *
 * OWNERSHIP. Pipeline 1 (motion) creates this file with the constants, the
 * extent type and a provisional, count-based extent, so the motion branch runs
 * on its own. Pipeline 2 (the wall) COMPLETES it — `friezeLayout(items, rows)`,
 * `friezeExtent(layout, rows)`, a `Cell` type and the block textures — under
 * three rules:
 *
 * 1. It may EXTEND `FriezeExtent` (a block's `count`, the extent's `width` and
 *    `height`) but never replace or re-shape it: `friezeExtent`'s result must
 *    stay structurally assignable to the type below, which is what `sceneMotion`
 *    consumes.
 * 2. It does NOT retune the cell constants. The spec fixes a cell at half a
 *    scene card so a 2×2 span is exactly one card, with no inset, and
 *    `FRIEZE_ROWS` at eight in BOTH orientations (amended decision 15): act two
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
 * Eight rows, in both orientations (amended decision 15). Portrait sees fewer
 * columns at a time, not more rows.
 */
export const FRIEZE_ROWS = 8

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

/** A case study occupies a 2×2 span, so four cells; everything else takes one. */
const CASE_STUDY_CELLS = 4

/**
 * A count-based extent: every year gets as many columns as its cells need at
 * `rows` per column, newest year first, contiguous. It ignores packing, so it
 * over-estimates a little against a first-fit layout — which is the safe
 * direction for a scroll budget.
 *
 * @deprecated pipeline 2 replaces this with `friezeLayout()`.
 */
export function provisionalFriezeExtent(
  items: readonly ArchiveItem[],
  rows: number,
): FriezeExtent {
  const cellsByYear = new Map<number, number>()
  for (const item of items) {
    const year = new Date(item.sortDate).getUTCFullYear()
    const cells = item.kind === 'featured' ? CASE_STUDY_CELLS : 1
    cellsByYear.set(year, (cellsByYear.get(year) ?? 0) + cells)
  }
  const years = [...cellsByYear.keys()].sort((a, b) => b - a)
  const perColumn = Math.max(1, rows)
  const blocks: FriezeBlockExtent[] = []
  let startCol = 0
  for (const year of years) {
    const columns = Math.max(1, Math.ceil((cellsByYear.get(year) ?? 0) / perColumn))
    blocks.push({ year, startCol, columns })
    startCol += columns
  }
  return { columns: startCol, rows, blocks }
}
