import { describe, it, expect } from 'vitest'
import manifest from '../../../src/data/media.json'
import { galleries } from '../../../src/data/galleries'
import { columnOf, galleryOf, leadOf, mediaOf } from '../../../src/data/media'
import { projects } from '../../../src/data/projects'
import type { MediaItem } from '../../../src/types/content'

const MEDIA = manifest as unknown as Record<string, { items: MediaItem[] }>
const slugs = projects.map((p) => p.slug)

/** Ids of every still a recording opens on, directly or as a later state of the same screen. */
function twinIds(slug: string): Set<string> {
  const items = mediaOf(slug)
  const twins = new Set(items.flatMap((item) => (item.type === 'clip' && item.twin ? [item.twin] : [])))
  for (const item of items) if (item.type === 'still' && item.like && twins.has(item.like)) twins.add(item.id)
  return twins
}

describe('media manifest', () => {
  it('has media for every project and for nothing else', () => {
    expect(Object.keys(MEDIA).sort()).toEqual([...slugs].sort())
  })

  it('ids are unique within a project', () => {
    for (const slug of slugs) {
      const ids = mediaOf(slug).map((item) => item.id)
      expect(new Set(ids).size, slug).toBe(ids.length)
    }
  })
})

describe('galleries', () => {
  it('plans pages only for projects that exist', () => {
    for (const slug of Object.keys(galleries)) expect(slugs, slug).toContain(slug)
  })

  it('every id it names exists in that project’s media', () => {
    for (const [slug, plan] of Object.entries(galleries)) {
      const ids = new Set(mediaOf(slug).map((item) => item.id))
      for (const group of plan) {
        for (const row of group.rows) {
          for (const id of row.items) expect(ids.has(id), `${slug}: ${id} is not in media.json`).toBe(true)
        }
      }
    }
  })
})

describe.each(slugs)('%s', (slug) => {
  const lead = leadOf(slug)
  const column = columnOf(slug)
  const items = mediaOf(slug)

  it('columnOf holds each item at most once, never the lead, all from the manifest', () => {
    const ids = column.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(lead).toBeDefined()
    expect(ids).not.toContain(lead?.id)
    for (const item of column) expect(items).toContain(item)
  })

  it('columnOf never shows a desktop still a recording already opens on', () => {
    const twins = twinIds(slug)
    for (const item of column) {
      if (item.type === 'still' && item.shape === 'wide') expect(twins.has(item.id), item.id).toBe(false)
    }
  })

  it('columnOf sets phone captures side by side in pairs; only an odd last one stands alone', () => {
    const positions = column.flatMap((item, index) => (item.shape === 'phone' ? [index] : []))
    for (let k = 0; k + 1 < positions.length; k += 2) {
      expect(positions[k + 1] - positions[k], `phone ${k} and ${k + 1}`).toBe(1)
    }
  })

  it('galleryOf leads with the same item and repeats nothing across its groups', () => {
    const { lead: galleryLead, groups } = galleryOf(slug)
    expect(galleryLead).toBe(lead)
    const ids = groups.flatMap((group) => group.rows.flatMap((row) => row.items.map((item) => item.id)))
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    for (const group of groups) {
      expect(group.rows.length).toBeGreaterThan(0)
      for (const row of group.rows) expect(row.items.length).toBeGreaterThan(0)
    }
  })
})
