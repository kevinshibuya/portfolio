import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Mockup } from '../../../../src/components/projectDetail/blocks/Mockup'
import type { Project } from '../../../../src/types/content'

const baseProject = (overrides: Partial<Project>): Project => ({
  id: 'x',
  slug: 'x',
  title: { en: 'sample title', pt: 'título exemplo' },
  description: { en: '', pt: '' },
  techStack: [],
  year: 2026,
  coverImage: '/x.png',
  images: [],
  highlight: false,
  ...overrides,
})

describe('Mockup block', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('renders an <img> with the desktop src for variant=desktop', () => {
    const project = baseProject({
      mockups: { desktop: '/foo/desktop.webp', mobile: '/foo/mobile.webp' },
    })
    const { container } = render(
      <Mockup block={{ type: 'mockup', variant: 'desktop' }} project={project} lang="en" />
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/foo/desktop.webp')
    expect(img?.getAttribute('alt')).toContain('sample title')
    expect(img?.getAttribute('alt')).toContain('desktop')
  })

  it('renders an <img> with the mobile src for variant=mobile', () => {
    const project = baseProject({
      mockups: { desktop: '/foo/desktop.webp', mobile: '/foo/mobile.webp' },
    })
    const { container } = render(
      <Mockup block={{ type: 'mockup', variant: 'mobile' }} project={project} lang="pt" />
    )
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('/foo/mobile.webp')
    expect(img?.getAttribute('alt')).toContain('título exemplo')
  })

  it('returns null and warns when project.mockups is undefined', () => {
    const project = baseProject({ mockups: undefined })
    const { container } = render(
      <Mockup block={{ type: 'mockup', variant: 'desktop' }} project={project} lang="en" />
    )
    expect(container.firstChild).toBeNull()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Mockup block referenced desktop on project "x"')
    )
  })

  it('uses lazy loading on the image', () => {
    const project = baseProject({
      mockups: { desktop: '/d.webp', mobile: '/m.webp' },
    })
    const { container } = render(
      <Mockup block={{ type: 'mockup', variant: 'desktop' }} project={project} lang="en" />
    )
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy')
  })
})
