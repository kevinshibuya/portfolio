import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { motionValue } from 'framer-motion'
import { MotionProvider } from '../../../src/context/MotionContext'
import {
  HalftonePortrait,
  shouldUseFallback,
} from '../../../src/canvas/halftone/HalftonePortrait'

describe('shouldUseFallback', () => {
  it('falls back on reduced motion, no webgl, or coarse/mobile', () => {
    const base = { reducedMotion: false, hasWebGL: true, coarseOrMobile: false }
    expect(shouldUseFallback(base)).toBe(false)
    expect(shouldUseFallback({ ...base, reducedMotion: true })).toBe(true)
    expect(shouldUseFallback({ ...base, hasWebGL: false })).toBe(true)
    expect(shouldUseFallback({ ...base, coarseOrMobile: true })).toBe(true)
  })
})

describe('HalftonePortrait (jsdom → fallback, no WebGL)', () => {
  it('renders the pre-baked duotone fallback img with alt text in jsdom', () => {
    const { container } = render(
      <MotionProvider>
        <HalftonePortrait
          src="/images/portrait-placeholder.jpg"
          fallbackSrc="/images/portrait-duotone-placeholder.jpg"
          progress={motionValue(0)}
          alt="kevin shibuya, high-contrast portrait"
        />
      </MotionProvider>,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBe('/images/portrait-duotone-placeholder.jpg')
    expect(img!.getAttribute('alt')).toBe('kevin shibuya, high-contrast portrait')
  })
})
