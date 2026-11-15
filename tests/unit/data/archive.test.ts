import { describe, it, expect } from 'vitest'
import { ARCHIVE_TOTALS, interactives, rankedProjects, typeCounts, yearBlocks } from '../../../src/data/archive'
import type { ArchiveEntry } from '../../../src/data/archive'
import { projects } from '../../../src/data/projects'

function piece(link: string, year: number, month = 1): ArchiveEntry {
  return {
    publicationDate: `01/${String(month).padStart(2, '0')}/${year}`,
    editorial: 'notícias',
    type: 'QUIZ',
    link,
    title: link,
    sortDate: Date.UTC(year, month - 1, 1),
    year,
    day: `01.${String(month).padStart(2, '0')}`,
  }
}

describe('rankedProjects', () => {
  it('holds the ten case studies in rank order, first to last', () => {
    expect(rankedProjects.map((p) => p.slug).sort()).toEqual([
      'chat-da-hora',
      'consilia-ia',
      'enquetes-gzh',
      'fotos-do-ano-2024',
      'fotos-do-ano-2025',
      'hotmart-bunde',
      'ia-na-redacao',
      'painel-da-reconstrucao',
      'promptfall',
      'radar-legislativo',
    ])
    for (let i = 1; i < rankedProjects.length; i++) {
      expect(rankedProjects[i - 1].order).toBeLessThan(rankedProjects[i].order)
    }
  })

  it('is a sorted copy: the source array keeps its own order', () => {
    expect(rankedProjects).not.toBe(projects)
    expect([...projects].sort((a, b) => a.order - b.order)).toEqual(rankedProjects)
  })
})

describe('interactives', () => {
  it('every newsroom piece is an outside link with a parsed date', () => {
    // Relations, never the census: the count moves with every published piece.
    expect(interactives.length).toBeGreaterThan(0)
    for (const item of interactives) {
      expect(item.link).toMatch(/^https?:\/\//)
      expect(item.publicationDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(item.sortDate).toBeGreaterThan(0)
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.editorial.length).toBeGreaterThan(0)
    }
  })

  it('sorts newest first and derives the year and day from the date, in UTC', () => {
    for (let i = 1; i < interactives.length; i++) {
      expect(interactives[i - 1].sortDate).toBeGreaterThanOrEqual(interactives[i].sortDate)
    }
    for (const item of interactives) {
      const [dd, mm, yyyy] = item.publicationDate.split('/')
      expect(item.year).toBe(new Date(item.sortDate).getUTCFullYear())
      expect(item.year).toBe(Number(yyyy))
      expect(item.day).toBe(`${dd}.${mm}`)
    }
  })
})

describe('typeCounts', () => {
  it('counts every piece once, most frequent type first', () => {
    expect(typeCounts.reduce((sum, { count }) => sum + count, 0)).toBe(interactives.length)
    expect(new Set(typeCounts.map(({ type }) => type)).size).toBe(typeCounts.length)
    for (let i = 1; i < typeCounts.length; i++) {
      expect(typeCounts[i - 1].count).toBeGreaterThanOrEqual(typeCounts[i].count)
    }
    for (const { type, count } of typeCounts) {
      expect(interactives.filter((item) => item.type === type)).toHaveLength(count)
    }
  })
})

describe('ARCHIVE_TOTALS', () => {
  it('is the sum of the case studies and the newsroom pieces', () => {
    expect(ARCHIVE_TOTALS.caseStudies).toBe(projects.length)
    expect(ARCHIVE_TOTALS.interactives).toBe(interactives.length)
    expect(ARCHIVE_TOTALS.pieces).toBe(projects.length + interactives.length)
  })

  it('spans the earliest to the latest year of either', () => {
    const years = [...projects.map((p) => p.year), ...interactives.map((i) => i.year)]
    expect(ARCHIVE_TOTALS.firstYear).toBe(Math.min(...years))
    expect(ARCHIVE_TOTALS.lastYear).toBe(Math.max(...years))
  })
})

describe('yearBlocks', () => {
  it('groups every newsroom piece into newest-first year blocks that lose nothing', () => {
    const blocks = yearBlocks(interactives)
    expect(blocks.length).toBeGreaterThan(0)
    for (let i = 1; i < blocks.length; i++) expect(blocks[i - 1].year).toBeGreaterThan(blocks[i].year)
    expect(blocks.flatMap((block) => block.items)).toEqual(interactives)
    for (const block of blocks) for (const item of block.items) expect(item.year).toBe(block.year)
  })

  it('groups unordered input newest-first without mutating it or reordering pieces within a year', () => {
    const input = Object.freeze([
      Object.freeze(piece('oldest', 2023)),
      Object.freeze(piece('z-first', 2024, 3)),
      Object.freeze(piece('newest', 2025)),
      Object.freeze(piece('a-second', 2024, 5)),
    ])
    const before = structuredClone(input)
    const blocks = yearBlocks(input)
    expect(blocks.map(({ year, items }) => ({ year, links: items.map((item) => item.link) }))).toEqual([
      { year: 2025, links: ['newest'] },
      { year: 2024, links: ['z-first', 'a-second'] },
      { year: 2023, links: ['oldest'] },
    ])
    blocks[1].items.pop()
    expect(input).toEqual(before)
  })

  it('returns no year blocks for no pieces', () => {
    expect(yearBlocks([])).toEqual([])
  })
})
