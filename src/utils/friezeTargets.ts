import type { Cell, FriezeExtent, FriezeLayout } from './friezeLayout'
import { playheadForColumn } from './sceneMotion'

/**
 * Where an archive ITEM sits, as a scroll target.
 *
 * The seam exists because the two halves must not know about each other.
 * `sceneMotion` targets a continuous column and has no idea what an archive
 * item is (Assumption 15); `friezeLayout` packs cells and has no idea what a
 * playhead is. This module is the one place that holds both, so neither grows
 * a string overload and nobody duplicates the beat maths.
 *
 * Act two's click path and pipeline 3's stream focus both come through here,
 * which is what keeps a focused row and a clicked cell landing in the same
 * place.
 */

/** The cell holding `itemId`, or null when the packing does not hold it. */
export function cellFor(itemId: string, layout: FriezeLayout): Cell | null {
  return layout.cells.find((cell) => cell.itemId === itemId) ?? null
}

/**
 * The playhead that parks the reading cursor on `itemId`, or null for an id
 * the packing does not hold — a caller with no target declines to move rather
 * than scrolling somewhere arbitrary.
 *
 * A cell is targeted by the CENTRE of its span, so a Project's 2x2 card comes
 * to rest in frame instead of half past the cursor.
 */
export function playheadForItem(
  itemId: string,
  layout: FriezeLayout,
  extent: FriezeExtent,
): number | null {
  const cell = cellFor(itemId, layout)
  if (!cell) return null
  return playheadForColumn(cell.col + cell.span / 2, extent)
}
