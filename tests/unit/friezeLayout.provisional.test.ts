/**
 * The frieze stub pipeline 1 needs to run on its own.
 *
 * Two things are guarded here and nowhere else: the cell constants really are
 * half a scene card (so a 2×2 span is exactly one `CARD_W` × `CARD_H`, with no
 * inset), and the provisional extent's column arithmetic is the one the wrapper
 * height is computed from. The test may import from both modules; the module
 * may only import one way (`sceneMotion` → `friezeLayout`, never the reverse).
 */
import { describe, it, expect } from 'vitest'
import {
  FRIEZE_CELL_W,
  FRIEZE_CELL_H,
  FRIEZE_ROWS,
  provisionalFriezeExtent,
} from '../../src/utils/friezeLayout'
import { CARD_W, CARD_H } from '../../src/utils/sceneMotion'
import { archive } from '../../src/data/archive'
import type { ArchiveItem } from '../../src/types/content'

/** A synthetic year: `count` items of which `featured` are case studies. */
function yearItems(year: number, count: number, featured: number): ArchiveItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${year}-${i}`,
    kind: i < featured ? ('featured' as const) : ('editorial' as const),
    title: `${year}-${i}`,
    date: String(year),
    sortDate: Date.UTC(year, 5, 1 + (i % 20)),
    href: '#',
    internal: false,
    gradient: 'none',
  }))
}

describe('frieze cell constants', () => {
  it('are exactly half a scene card, so a 2×2 span is one card', () => {
    expect(FRIEZE_CELL_W).toBe(CARD_W / 2)
    expect(FRIEZE_CELL_H).toBe(CARD_H / 2)
    expect(2 * FRIEZE_CELL_W).toBe(CARD_W)
    expect(2 * FRIEZE_CELL_H).toBe(CARD_H)
  })

  it('is eight rows, in both orientations (amended decision 15)', () => {
    expect(FRIEZE_ROWS).toBe(8)
  })
})

describe('provisionalFriezeExtent', () => {
  const items = [
    ...yearItems(2026, 3, 3),
    ...yearItems(2025, 42, 3),
    ...yearItems(2024, 118, 3),
    ...yearItems(2023, 8, 0),
  ]

  it('packs today’s shape into 26 columns, newest year first', () => {
    const extent = provisionalFriezeExtent(items, 8)
    expect(extent.rows).toBe(8)
    expect(extent.columns).toBe(26)
    expect(extent.blocks.map((b) => b.year)).toEqual([2026, 2025, 2024, 2023])
    expect(extent.blocks.map((b) => b.columns)).toEqual([2, 7, 16, 1])
    expect(extent.blocks.map((b) => b.startCol)).toEqual([0, 2, 9, 25])
  })

  it('leaves no gap between blocks', () => {
    const { blocks, columns } = provisionalFriezeExtent(items, 8)
    for (let k = 1; k < blocks.length; k++) {
      expect(blocks[k].startCol).toBe(blocks[k - 1].startCol + blocks[k - 1].columns)
    }
    expect(blocks.reduce((sum, b) => sum + b.columns, 0)).toBe(columns)
  })

  it('gives a year with items at least one column', () => {
    const extent = provisionalFriezeExtent(yearItems(2020, 1, 0), 8)
    expect(extent.blocks).toHaveLength(1)
    expect(extent.blocks[0].columns).toBe(1)
  })

  it('omits years with no items', () => {
    const extent = provisionalFriezeExtent(
      [...yearItems(2026, 2, 0), ...yearItems(2024, 2, 0)],
      8,
    )
    expect(extent.blocks.map((b) => b.year)).toEqual([2026, 2024])
  })

  it('is contiguous and non-empty on the real archive', () => {
    const extent = provisionalFriezeExtent(archive, FRIEZE_ROWS)
    expect(extent.columns).toBeGreaterThan(0)
    expect(extent.blocks.length).toBeGreaterThan(0)
    let expected = 0
    for (const block of extent.blocks) {
      expect(block.columns).toBeGreaterThanOrEqual(1)
      expect(block.startCol).toBe(expected)
      expected += block.columns
    }
    expect(expected).toBe(extent.columns)
  })
})

/**
 * `sceneMotion.test.ts` hardcodes this same extent as `SHIPPED_FRIEZE` and
 * derives the whole act-two budget from it. Nothing else ties that fixture to
 * the real archive, so adding one item would move `sceneWrapperSvh` on the
 * running site while every unit test stayed green against a stale copy. This is
 * the link: if the data moves, this fails and the fixture gets updated with it.
 */
describe('the shipped extent is the one the pose fixtures assume', () => {
  it('matches what today\'s archive produces', () => {
    expect(provisionalFriezeExtent(archive, FRIEZE_ROWS)).toEqual({
      columns: 26,
      rows: 8,
      blocks: [
        { year: 2026, startCol: 0, columns: 2 },
        { year: 2025, startCol: 2, columns: 7 },
        { year: 2024, startCol: 9, columns: 16 },
        { year: 2023, startCol: 25, columns: 1 },
      ],
    })
  })
})
