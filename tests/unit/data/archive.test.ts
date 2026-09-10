import { describe, it, expect } from 'vitest'
import { archive, deriveArchive, yearBlocks } from '../../../src/data/archive'
import { resolveTitle } from '../../../src/types/content'
import type { ArchiveItem, Embed, Project } from '../../../src/types/content'

function project(id: string, year: number, overrides: Partial<Project> = {}): Project {
  return {
    id,
    slug: id,
    title: { en: 'Project', pt: 'Projeto' },
    year,
    highlight: false,
    description: { en: 'Description', pt: 'Descrição' },
    pitch: { en: 'Pitch', pt: 'Apresentação' },
    techStack: [],
    ...overrides,
  }
}

function embed(title: string, publicationDate: string, link = 'https://example.com/piece'): Embed {
  return { title, publicationDate, link, editorial: 'notícias', type: 'QUIZ' }
}

function piece(id: string, year: number, serial: number): ArchiveItem {
  return {
    id,
    title: { en: 'Piece', pt: 'Trabalho' },
    origin: 'professional',
    date: '01/01/' + year,
    sortDate: Date.UTC(year, 0, 1),
    year,
    href: 'https://example.com/' + id,
    internal: false,
    serial,
  }
}

describe('archive', () => {
  it('contains 171 pieces with nine case-study slugs and 162 external embeds', () => {
    expect(archive).toHaveLength(171)
    expect(archive.flatMap((item) => item.caseStudy ? [item.caseStudy.slug] : []).sort()).toEqual([
      'chat-da-hora',
      'enquetes-gzh',
      'fotos-do-ano-2024',
      'fotos-do-ano-2025',
      'hotmart-bunde',
      'ia-na-redacao',
      'painel-da-reconstrucao',
      'peleia-gre-nal',
      'radar-legislativo',
    ])
    const external = archive.filter((item) => !item.internal)
    expect(external).toHaveLength(162)
    for (const item of external) {
      expect(item).not.toHaveProperty('caseStudy')
      expect(item.href).toMatch(/^https?:\/\//)
      expect(item.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(item.type).toBeDefined()
      expect(item.editorial).toBeDefined()
    }
    for (const item of archive.filter((item) => item.caseStudy !== undefined)) {
      expect(item.internal).toBe(true)
      expect(item.href).toBe('/projects/' + item.caseStudy?.slug)
      expect(item.date).toMatch(/^\d{4}$/)
      expect(item).not.toHaveProperty('type')
      expect(item).not.toHaveProperty('editorial')
    }
  })

  it('sorts newest first and assigns every serial from 171 down to 1 exactly once', () => {
    expect(archive[0].serial).toBe(171)
    expect(archive.at(-1)?.serial).toBe(1)
    expect(new Set(archive.map((item) => item.serial)).size).toBe(171)
    expect(new Set(archive.map((item) => item.id)).size).toBe(171)
    for (let i = 1; i < archive.length; i++) {
      expect(archive[i - 1].sortDate).toBeGreaterThanOrEqual(archive[i].sortDate)
      expect(archive[i - 1].serial - archive[i].serial).toBe(1)
    }
  })

  it('defaults to professional, with only hotmart-bunde marked freelance', () => {
    expect(archive.find((item) => item.id === 'featured-hotmart-bunde')?.origin).toBe('freelance')
    expect(archive.filter((item) => item.origin === 'professional')).toHaveLength(170)
    expect(archive.filter((item) => item.origin === 'personal')).toHaveLength(0)
    for (const item of archive.filter((item) => item.id !== 'featured-hotmart-bunde')) {
      expect(item.origin).toBe('professional')
    }
  })

  it('derives UTC years with the four specified counts', () => {
    const counts: Record<number, number> = {}
    for (const item of archive) {
      expect(item.year).toBe(new Date(item.sortDate).getUTCFullYear())
      counts[item.year] = (counts[item.year] ?? 0) + 1
    }
    expect(counts).toEqual({ 2026: 3, 2025: 42, 2024: 118, 2023: 8 })
  })

  it('omits the retired archive classification and presentation fields', () => {
    for (const item of archive) {
      for (const field of ['kind', 'gradient', 'highlight', 'highlightOrder']) {
        expect(item).not.toHaveProperty(field)
      }
    }
  })
})

describe('deriveArchive', () => {
  it('puts Projects before a 31 December embed and keeps source order within tied dates', () => {
    const result = deriveArchive([
      project('z-first', 2024, { highlight: true, highlightOrder: 9 }),
      project('older', 2023),
      project('a-second', 2024, { highlight: true, highlightOrder: 1 }),
    ], [
      embed('Z primeiro', '31/12/2024'),
      embed('Mais novo', '01/01/2025'),
      embed('A segundo', '31/12/2024'),
      embed('Mais antigo', '30/12/2023'),
    ])

    expect(result.map((item) => item.id)).toEqual([
      'editorial-1', 'featured-z-first', 'featured-a-second', 'editorial-0',
      'editorial-2', 'featured-older', 'editorial-3',
    ])
    expect(result.map((item) => item.serial)).toEqual([7, 6, 5, 4, 3, 2, 1])
    expect(result.slice(1, 5).map((item) => item.sortDate)).toEqual([
      Date.UTC(2024, 11, 31), Date.UTC(2024, 11, 31),
      Date.UTC(2024, 11, 31), Date.UTC(2024, 11, 31),
    ])
    expect(result.map((item) => item.year)).toEqual([2025, 2024, 2024, 2024, 2024, 2023, 2023])
  })

  it('preserves Project origins and defaults Projects and embeds to professional', () => {
    const result = deriveArchive([
      project('default', 2024),
      project('freelance', 2024, { origin: 'freelance' }),
      project('personal', 2024, { origin: 'personal' }),
    ], [embed('Notícia', '31/12/2024')])
    expect(result.map((item) => item.origin)).toEqual([
      'professional', 'freelance', 'personal', 'professional',
    ])
    expect(result[0]).toMatchObject({
      id: 'featured-default', caseStudy: { slug: 'default' },
      date: '2024', href: '/projects/default', internal: true,
    })
    expect(result[3]).toMatchObject({
      id: 'editorial-0', title: 'Notícia', date: '31/12/2024',
      type: 'QUIZ', editorial: 'notícias', internal: false,
    })
    expect(result[3]).not.toHaveProperty('caseStudy')
    expect(resolveTitle(result[0], 'en')).toBe('Project')
    expect(resolveTitle(result[0], 'pt')).toBe('Projeto')
    expect(resolveTitle(result[3], 'en')).toBe('Notícia')
    expect(resolveTitle(result[3], 'pt')).toBe('Notícia')
  })

  it('keeps distinct ids and serials for pieces sharing a duplicate href', () => {
    const result = deriveArchive([], [
      embed('Primeiro', '01/01/2024', 'https://example.com/shared'),
      embed('Segundo', '02/01/2024', 'https://example.com/shared'),
      embed('Terceiro', '01/01/2024', 'https://example.com/shared'),
    ])
    expect(result.map((item) => item.href)).toEqual([
      'https://example.com/shared', 'https://example.com/shared', 'https://example.com/shared',
    ])
    expect(result.map((item) => item.id)).toEqual(['editorial-1', 'editorial-0', 'editorial-2'])
    expect(result.map((item) => item.serial)).toEqual([3, 2, 1])
  })

  it('does not mutate frozen source arrays or their contents and is deterministic', () => {
    const sourceProjects = Object.freeze([
      Object.freeze(project('older', 2023)), Object.freeze(project('newer', 2025)),
    ])
    const sourceEmbeds = Object.freeze([
      Object.freeze(embed('Antigo', '01/01/2024')), Object.freeze(embed('Novo', '01/01/2025')),
    ])
    const before = structuredClone({ sourceProjects, sourceEmbeds })
    const first = deriveArchive(sourceProjects, sourceEmbeds)
    expect(first.map((item) => item.id)).toEqual([
      'featured-newer', 'editorial-1', 'editorial-0', 'featured-older',
    ])
    expect({ sourceProjects, sourceEmbeds }).toEqual(before)
    expect(deriveArchive(sourceProjects, sourceEmbeds)).toEqual(first)
  })

  it('returns an empty archive for empty sources', () => {
    expect(deriveArchive([], [])).toEqual([])
  })
})

describe('yearBlocks', () => {
  it('groups all 171 pieces into the four newest-first year blocks', () => {
    const blocks = yearBlocks(archive)
    expect(blocks.map(({ year, count }) => ({ year, count }))).toEqual([
      { year: 2026, count: 3 },
      { year: 2025, count: 42 },
      { year: 2024, count: 118 },
      { year: 2023, count: 8 },
    ])
    expect(blocks.reduce((total, block) => total + block.count, 0)).toBe(171)
    expect(blocks.flatMap((block) => block.items)).toEqual(archive)
    for (const block of blocks) {
      expect(block.count).toBe(block.items.length)
      for (const item of block.items) expect(item.year).toBe(block.year)
    }
  })

  it('groups unordered input newest-first without mutating it or reordering pieces within a year', () => {
    const input = Object.freeze([
      Object.freeze(piece('oldest', 2023, 1)),
      Object.freeze(piece('z-first', 2024, 3)),
      Object.freeze(piece('newest', 2025, 4)),
      Object.freeze(piece('a-second', 2024, 2)),
    ])
    const before = structuredClone(input)
    const blocks = yearBlocks(input)
    expect(blocks.map(({ year, count, items }) => ({ year, count, ids: items.map((item) => item.id) }))).toEqual([
      { year: 2025, count: 1, ids: ['newest'] },
      { year: 2024, count: 2, ids: ['z-first', 'a-second'] },
      { year: 2023, count: 1, ids: ['oldest'] },
    ])
    expect(blocks.reduce((total, block) => total + block.count, 0)).toBe(4)
    blocks[1].items.pop()
    expect(input).toEqual(before)
  })

  it('returns no year blocks for an empty archive', () => {
    expect(yearBlocks([])).toEqual([])
  })
})
