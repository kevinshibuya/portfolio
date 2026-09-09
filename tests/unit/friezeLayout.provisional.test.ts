/**
 * The cell constants really are half a scene card, so a 2×2 span is exactly
 * one card with no inset. The test may import from both modules; the module
 * may only import one way (`sceneMotion` → `friezeLayout`, never the reverse).
 */
import { describe, it, expect } from 'vitest'
import {
  FRIEZE_CELL_W,
  FRIEZE_CELL_H,
  FRIEZE_ROWS,
  friezeLayout,
  friezeExtent,
} from '../../src/utils/friezeLayout'
import { CARD_W, CARD_H } from '../../src/utils/sceneMotion'
import { archive } from '../../src/data/archive'

describe('frieze cell constants', () => {
  it('keeps cell width at exactly half a scene card', () => {
    expect(FRIEZE_CELL_W).toBe(CARD_W / 2)
  })

  it('keeps cell height at exactly half a scene card', () => {
    expect(FRIEZE_CELL_H).toBe(CARD_H / 2)
  })

  it('uses six rows in both orientations (amended decision 15)', () => {
    expect(FRIEZE_ROWS).toBe(6)
  })
})

/**
 * `sceneMotion.test.ts` hardcodes this same extent as `SHIPPED_FRIEZE` and
 * derives the whole act-two budget from it. Nothing else ties that fixture to
 * the real archive, so adding one item would move `sceneWrapperSvh` on the
 * running site while every unit test stayed green against a stale copy. This is
 * the link: if the data moves, this fails and the fixture gets updated with it.
 * Project only the base fields: Motion's fixture needs no counts or dimensions.
 */
describe('the shipped extent is the one the pose fixtures assume', () => {
  it('matches what today\'s archive produces', () => {
    const extent = friezeExtent(friezeLayout(archive, FRIEZE_ROWS), FRIEZE_ROWS)
    expect({
      columns: extent.columns,
      rows: extent.rows,
      blocks: extent.blocks.map(({ year, startCol, columns }) => ({ year, startCol, columns })),
    }).toEqual({
      columns: 35,
      rows: 6,
      blocks: [
        { year: 2026, startCol: 0, columns: 2 },
        { year: 2025, startCol: 2, columns: 9 },
        { year: 2024, startCol: 11, columns: 22 },
        { year: 2023, startCol: 33, columns: 2 },
      ],
    })
  })
})
