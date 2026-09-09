import type { ArchiveItem } from '../../src/types/content'
import type { FriezeExtent, FriezeLayout } from '../../src/utils/friezeLayout'

/**
 * The shape `tests/e2e/fixtures/frieze-cells.json` holds.
 *
 * Playwright's loader cannot follow `src/data/embeds.csv?raw` — a Vite-only
 * import — so an e2e spec cannot reach `archive` at all, and the wall's cells
 * have to arrive as data. This builder is the single definition of that data,
 * used to generate the fixture AND, in `friezeFixture.test.ts`, to recompute it
 * from the live archive and fail if the two have drifted.
 */
export interface FixtureCell {
  itemId: string
  col: number
  row: number
  span: number
  kind: 'caseStudy' | 'embed' | 'other'
  slug?: string
  href?: string
}

export interface FriezeFixture {
  extent: FriezeExtent
  cells: FixtureCell[]
}

export function buildFriezeFixture(
  items: readonly ArchiveItem[],
  layout: FriezeLayout,
  extent: FriezeExtent,
): FriezeFixture {
  const byId = new Map(items.map((item) => [item.id, item]))
  return {
    extent,
    cells: layout.cells.map((cell) => {
      const item = byId.get(cell.itemId)
      const base = { itemId: cell.itemId, col: cell.col, row: cell.row, span: cell.span }
      if (item?.caseStudy) return { ...base, kind: 'caseStudy' as const, slug: item.caseStudy.slug }
      if (item && !item.caseStudy && item.href) return { ...base, kind: 'embed' as const, href: item.href }
      return { ...base, kind: 'other' as const }
    }),
  }
}
