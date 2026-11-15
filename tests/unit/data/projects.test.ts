import { describe, it, expect } from 'vitest'
import { projects } from '../../../src/data/projects'
import { leadOf, coverOf } from '../../../src/data/media'
import type { Bilingual } from '../../../src/types/content'

const filled = (value: Bilingual | undefined): boolean => Boolean(value?.en.trim() && value?.pt.trim())

describe('projects data invariants', () => {
  it('every project carries the copy its page and rows read, in both languages', () => {
    for (const p of projects) {
      for (const field of ['title', 'kind', 'line', 'body', 'description', 'role', 'team'] as const) {
        expect(filled(p[field]), `${p.slug} missing ${field}`).toBe(true)
      }
      expect(p.client.trim(), `${p.slug} missing client`).not.toBe('')
      expect(p.techStack.length, `${p.slug} has no stack`).toBeGreaterThan(0)
    }
  })

  it('every project has a lead and a cover in the media manifest', () => {
    // The home page's frames and the more-work rows read these; a project
    // without media would render an empty frame.
    for (const p of projects) {
      expect(leadOf(p.slug), `${p.slug} has no lead`).toBeDefined()
      expect(coverOf(p.slug), `${p.slug} has no cover`).toBeDefined()
    }
  })

  it('the rank order runs 1..n with no gaps and no duplicates', () => {
    const orders = projects.map((p) => p.order).sort((a, b) => a - b)
    expect(orders).toEqual(projects.map((_, i) => i + 1))
  })

  it('every project slug is unique and URL-safe', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('a live address is an https URL', () => {
    for (const p of projects.filter((p) => p.liveUrl)) expect(p.liveUrl).toMatch(/^https:\/\//)
  })
})
