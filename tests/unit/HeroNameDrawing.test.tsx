import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { MotionProvider } from '../../src/context/MotionContext'
import { HeroNameDrawing } from '../../src/components/ui/HeroNameDrawing'

describe('HeroNameDrawing', () => {
  beforeEach(() => {
    ;(document as unknown as { fonts: { ready: Promise<void> } }).fonts = {
      ready: Promise.resolve(),
    }
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders 5 kevin glyphs and 8 shibuya glyphs as SVG paths', () => {
    const { container } = render(
      <MotionProvider><HeroNameDrawing /></MotionProvider>
    )
    const kevinSvg = container.querySelector('[data-name-word="kevin"]')
    const shibuyaSvg = container.querySelector('[data-name-word="shibuya"]')
    expect(kevinSvg).not.toBeNull()
    expect(shibuyaSvg).not.toBeNull()
    expect(kevinSvg!.querySelectorAll('path')).toHaveLength(5)
    expect(shibuyaSvg!.querySelectorAll('path')).toHaveLength(8)
  })

  it('renders a screen-reader-only h1 with the full name', () => {
    const { container } = render(
      <MotionProvider><HeroNameDrawing /></MotionProvider>
    )
    const sr = container.querySelector('h1.sr-only')
    expect(sr?.textContent).toBe('kevin shibuya.')
  })

  it('exposes data-name-glyph indices on each path', () => {
    const { container } = render(
      <MotionProvider><HeroNameDrawing /></MotionProvider>
    )
    expect(container.querySelector('[data-name-glyph="0"]')).not.toBeNull()
    expect(container.querySelector('[data-name-glyph="5"]')).not.toBeNull()
    expect(container.querySelector('[data-name-glyph="12"]')).not.toBeNull()
  })
})
