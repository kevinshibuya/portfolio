import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { projects } from '../../../src/data/projects'

// Inline JSON-LD in index.html is hand-maintained. This test catches drift
// between the ItemList of CreativeWorks and src/data/projects.ts. If a project
// is renamed, removed, or promoted, this test fails until the JSON-LD is
// updated to match.

interface ListItem {
  position: number
  item: {
    url: string
    name: string
    dateCreated: string
  }
}

function readFeaturedItemList(): ListItem[] {
  const html = readFileSync(resolve(__dirname, '../../../index.html'), 'utf8')
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []
  for (const block of blocks) {
    const json = block.replace(/^[\s\S]*?<script[^>]*>/, '').replace(/<\/script>$/, '').trim()
    const parsed = JSON.parse(json) as { '@type'?: string; itemListElement?: ListItem[] }
    if (parsed['@type'] === 'ItemList' && parsed.itemListElement) {
      return parsed.itemListElement
    }
  }
  throw new Error('No ItemList JSON-LD block found in index.html')
}

describe('JSON-LD featured projects', () => {
  const items = readFeaturedItemList()

  it('lists every project from projects.ts exactly once', () => {
    const ldSlugs = items.map((li) => li.item.url.split('/').pop()).sort()
    const dataSlugs = projects.map((p) => p.slug).sort()
    expect(ldSlugs).toEqual(dataSlugs)
  })

  it('every entry has matching name + dateCreated', () => {
    const bySlug = new Map(projects.map((p) => [p.slug, p]))
    for (const li of items) {
      const slug = li.item.url.split('/').pop()!
      const project = bySlug.get(slug)
      expect(project, `unknown slug in JSON-LD: ${slug}`).toBeDefined()
      expect(li.item.name).toBe(project!.title.en)
      expect(li.item.dateCreated).toBe(String(project!.year))
    }
  })

  it('positions are 1-indexed and contiguous', () => {
    const positions = items.map((li) => li.position).sort((a, b) => a - b)
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
