import { describe, it, expect } from 'vitest'
import type { Project } from '../../../src/types/content'

function validate(projects: Project[]): void {
  const selectedWork = projects.filter(
    (p) => p.highlight && (p.highlightOrder ?? 99) <= 4
  )
  for (const p of selectedWork) {
    if (!p.mockups?.desktop || !p.mockups?.desktopBento || !p.mockups?.mobile) {
      throw new Error(
        `Project "${p.id}" is a Selected Work highlight but is missing mockups`
      )
    }
  }
}

const baseProject = (overrides: Partial<Project>): Project => ({
  id: 'x',
  slug: 'x',
  title: { en: 'x', pt: 'x' },
  description: { en: 'x', pt: 'x' },
  techStack: [],
  year: 2026,
  coverImage: '/x.png',
  images: [],
  highlight: false,
  ...overrides,
})

describe('projects validator', () => {
  it('passes when all selected-work highlights have all three mockups', () => {
    const projects = [
      baseProject({
        id: 'a',
        highlight: true,
        highlightOrder: 1,
        mockups: { desktop: '/a/d.webp', desktopBento: '/a/db.webp', mobile: '/a/m.webp' },
      }),
    ]
    expect(() => validate(projects)).not.toThrow()
  })

  it('throws when a top-4 highlight is missing mockups entirely', () => {
    const projects = [
      baseProject({ id: 'b', highlight: true, highlightOrder: 1 }),
    ]
    expect(() => validate(projects)).toThrow(/missing mockups/)
  })

  it('throws when a top-4 highlight has only desktop, not mobile', () => {
    const projects = [
      baseProject({
        id: 'c',
        highlight: true,
        highlightOrder: 2,
        mockups: { desktop: '/c/d.webp', desktopBento: '/c/db.webp', mobile: '' },
      }),
    ]
    expect(() => validate(projects)).toThrow(/missing mockups/)
  })

  it('throws when a top-4 highlight is missing desktopBento', () => {
    const projects = [
      baseProject({
        id: 'e',
        highlight: true,
        highlightOrder: 3,
        mockups: { desktop: '/e/d.webp', desktopBento: '', mobile: '/e/m.webp' },
      }),
    ]
    expect(() => validate(projects)).toThrow(/missing mockups/)
  })

  it('does not throw for highlights past position 4', () => {
    const projects = [
      baseProject({ id: 'd', highlight: true, highlightOrder: 5 }),
    ]
    expect(() => validate(projects)).not.toThrow()
  })
})
