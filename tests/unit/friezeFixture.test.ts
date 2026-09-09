import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { archive } from '../../src/data/archive'
import { FRIEZE_ROWS, friezeExtent, friezeLayout } from '../../src/utils/friezeLayout'
import { buildFriezeFixture, type FriezeFixture } from './friezeFixture.shared'

/**
 * The e2e fixture must never drift from the real archive.
 *
 * `tests/e2e/frieze-click.spec.ts` clicks coordinates derived from
 * `tests/e2e/fixtures/frieze-cells.json`, because Playwright's loader cannot
 * follow the Vite-only `embeds.csv?raw` import that `archive` depends on. A
 * fixture that quietly went stale would leave that suite clicking where cells
 * USED to be — passing or failing for reasons that have nothing to do with the
 * code under test. This is the guard: change the archive data or the packing
 * and this fails, naming the regeneration step.
 */
describe('the frieze e2e fixture', () => {
  it('still matches the layout the site actually ships', () => {
    const layout = friezeLayout(archive, FRIEZE_ROWS)
    const extent = friezeExtent(layout, FRIEZE_ROWS)
    const expected = buildFriezeFixture(archive, layout, extent)

    const onDisk = JSON.parse(
      readFileSync('tests/e2e/fixtures/frieze-cells.json', 'utf8'),
    ) as FriezeFixture

    expect(
      onDisk,
      'tests/e2e/fixtures/frieze-cells.json is stale — regenerate it from the archive',
    ).toEqual(expected)
  })

  it('holds the cells the click suite needs to find a target', () => {
    const onDisk = JSON.parse(
      readFileSync('tests/e2e/fixtures/frieze-cells.json', 'utf8'),
    ) as FriezeFixture
    expect(onDisk.cells.filter((c) => c.kind === 'caseStudy').length).toBeGreaterThan(0)
    expect(onDisk.cells.filter((c) => c.kind === 'embed').length).toBeGreaterThan(0)
    for (const cell of onDisk.cells) {
      if (cell.kind === 'caseStudy') expect(cell.slug, cell.itemId).toBeTruthy()
      if (cell.kind === 'embed') expect(cell.href, cell.itemId).toMatch(/^https?:\/\//)
    }
  })
})
