import { describe, it, expect } from 'vitest'
import {
  archive,
  archiveTypes,
  archiveEditorials,
  archiveYears,
} from '../../../src/data/archive'

describe('archive', () => {
  it('contains all featured projects + all embeds', () => {
    const featuredCount = archive.filter((i) => i.kind === 'featured').length
    const editorialCount = archive.filter((i) => i.kind === 'editorial').length
    expect(featuredCount).toBe(4)
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
