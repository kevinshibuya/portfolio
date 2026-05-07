import { describe, it, expect } from 'vitest'
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
  byFeatured,
} from '../../../src/data/archive'
import type { ArchiveItem } from '../../../src/types/content'

describe('archive', () => {
  it('contains all featured projects + all embeds', () => {
    const featuredCount = archive.filter((i) => i.kind === 'featured').length
    const editorialCount = archive.filter((i) => i.kind === 'editorial').length
    expect(featuredCount).toBe(7)
    expect(editorialCount).toBeGreaterThan(100) // 142 in current CSV
  })

  it('is sorted by sortDate descending', () => {
    for (let i = 1; i < archive.length; i++) {
      expect(archive[i - 1].sortDate).toBeGreaterThanOrEqual(archive[i].sortDate)
    }
  })

  it('flags featured projects as internal links', () => {
    const featured = archive.find((i) => i.kind === 'featured')
    expect(featured?.internal).toBe(true)
    expect(featured?.href.startsWith('/projects/')).toBe(true)
  })

  it('flags editorial entries as external links', () => {
    const editorial = archive.find((i) => i.kind === 'editorial')
    expect(editorial?.internal).toBe(false)
    expect(editorial?.href.startsWith('http')).toBe(true)
  })

  it('formats editorial dates as dd/mm/yyyy and project dates as yyyy', () => {
    const editorial = archive.find((i) => i.kind === 'editorial')
    expect(editorial?.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    const featured = archive.find((i) => i.kind === 'featured')
    expect(featured?.date).toMatch(/^\d{4}$/)
  })

  it('exposes sorted unique types from editorial entries', () => {
    expect(archiveTypes.length).toBeGreaterThan(0)
    expect([...archiveTypes].sort()).toEqual(archiveTypes)
  })

  it('exposes sorted unique editorials', () => {
    expect(archiveEditorials.length).toBeGreaterThan(0)
    expect([...archiveEditorials].sort()).toEqual(archiveEditorials)
  })

  it('exposes years descending', () => {
    expect(archiveYears.length).toBeGreaterThan(0)
    for (let i = 1; i < archiveYears.length; i++) {
      expect(archiveYears[i - 1]).toBeGreaterThanOrEqual(archiveYears[i])
    }
  })
})

function mkItem(over: Partial<ArchiveItem>): ArchiveItem {
  return {
    id: 'x',
    kind: 'editorial',
    title: 't',
    date: '01/01/2024',
    sortDate: 0,
    href: '#',
    internal: false,
    gradient: '',
    ...over,
  }
}

describe('byFeatured', () => {
  it('puts highlights before non-highlights', () => {
    const h = mkItem({ kind: 'featured', highlight: true, highlightOrder: 3, sortDate: 1 })
    const n = mkItem({ kind: 'editorial', sortDate: 9999 })
    expect(byFeatured(h, n)).toBeLessThan(0)
    expect(byFeatured(n, h)).toBeGreaterThan(0)
  })

  it('orders highlights by highlightOrder ascending', () => {
    const h1 = mkItem({ kind: 'featured', highlight: true, highlightOrder: 1 })
    const h2 = mkItem({ kind: 'featured', highlight: true, highlightOrder: 2 })
    expect(byFeatured(h1, h2)).toBeLessThan(0)
    expect(byFeatured(h2, h1)).toBeGreaterThan(0)
  })

  it('orders non-highlights by sortDate desc', () => {
    const a = mkItem({ kind: 'editorial', sortDate: 100 })
    const b = mkItem({ kind: 'editorial', sortDate: 200 })
    expect(byFeatured(a, b)).toBeGreaterThan(0) // a is older, sorts after
    expect(byFeatured(b, a)).toBeLessThan(0)
  })

  it('treats kind=featured without highlight=true as non-highlight', () => {
    const fakeFeatured = mkItem({ kind: 'featured', highlight: false, sortDate: 100 })
    const editorial = mkItem({ kind: 'editorial', sortDate: 200 })
    expect(byFeatured(fakeFeatured, editorial)).toBeGreaterThan(0)
  })
})
