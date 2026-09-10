import { describe, it, expect } from 'vitest'
import { archive } from '../../src/data/archive'
import {
  FRIEZE_ROWS,
  friezeExtent,
  friezeLayout,
  type FriezeLayout,
} from '../../src/utils/friezeLayout'
import {
  playheadFor,
  playheadForColumn,
  scrollTargetFor,
  actTwoProgress,
} from '../../src/utils/sceneMotion'
import { cellFor, playheadForItem } from '../../src/utils/friezeTargets'

const layout: FriezeLayout = friezeLayout(archive, FRIEZE_ROWS)
const extent = friezeExtent(layout, FRIEZE_ROWS)

describe('cellFor', () => {
  it('finds a cell by its item id', () => {
    const cell = layout.cells[7]
    expect(cellFor(cell.itemId, layout)).toBe(cell)
  })

  it('returns null for an id the packing does not hold', () => {
    expect(cellFor('not-an-item', layout)).toBeNull()
  })
})

describe('playheadForItem', () => {
  it('targets a cell by the centre of its span, not its left edge', () => {
    const project = layout.cells.find((c) => c.span === 2)!
    const editorial = layout.cells.find((c) => c.span === 1)!
    // A 2x2 is parked by its middle, so a card is centred rather than
    // half off the reading cursor.
    expect(playheadForItem(project.itemId, layout, extent)).toBeCloseTo(
      playheadForColumn(project.col + 1, extent),
      12,
    )
    expect(playheadForItem(editorial.itemId, layout, extent)).toBeCloseTo(
      playheadForColumn(editorial.col + 0.5, extent),
      12,
    )
  })

  it('returns null for an unknown id, so a caller can decline to move', () => {
    expect(playheadForItem('not-an-item', layout, extent)).toBeNull()
  })

  it('lands inside act two, past the approach beat and never beyond the end', () => {
    for (const cell of layout.cells) {
      const playhead = playheadForItem(cell.itemId, layout, extent)!
      const u = actTwoProgress(playhead)
      expect(u).toBeGreaterThan(0)
      expect(u).toBeLessThanOrEqual(1)
    }
  })

  it('composes with the numeric scrollTargetFor: scrolling there reads back the playhead', () => {
    // The seam Task 8 uses — an item resolves to a number, and Motion's own
    // inverse turns that number into a document offset.
    const wrapperTop = 4000
    const wrapperHeight = 90_000
    const viewport = 900
    for (const id of [layout.cells[0].itemId, layout.cells[40].itemId, layout.cells.at(-1)!.itemId]) {
      const playhead = playheadForItem(id, layout, extent)!
      const top = scrollTargetFor(playhead, wrapperTop, wrapperHeight, viewport, extent.columns)
      const progress = (top - wrapperTop) / (wrapperHeight - viewport)
      expect(playheadFor(progress, extent.columns)).toBeCloseTo(playhead, 9)
    }
  })
})
