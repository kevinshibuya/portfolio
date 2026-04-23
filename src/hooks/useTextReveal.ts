import { type RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { splitTextIntoChars } from '../utils/splitText'
import { EASE_REVEAL } from '../utils/gsapConfig'
import { useReducedMotion } from './useReducedMotion'

interface TextRevealConfig {
  /** ScrollTrigger start position. Default: 'top 85%' */
  start?: string
  /** Stagger delay per character in seconds. Default: 0.02 */
  stagger?: number
  /** Extra dependencies that should re-trigger the split (e.g. language key) */
  deps?: unknown[]
}

/**
 * Splits a heading element's text into characters and reveals them
 * with a staggered y-translate animation driven by ScrollTrigger.
 */
export function useTextReveal(
  ref: RefObject<HTMLElement | null>,
  config: TextRevealConfig = {},
): void {
  const { start = 'top 85%', stagger = 0.02, deps = [] } = config
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const el = ref.current
      if (!el || prefersReducedMotion) return

      const chars = splitTextIntoChars(el)
      if (chars.length === 0) return

      gsap.set(chars, { y: '100%', opacity: 0 })

      gsap.to(chars, {
        y: '0%',
        opacity: 1,
        stagger,
        duration: 0.6,
        ease: EASE_REVEAL,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: 'play none none none',
        },
      })
    },
    { dependencies: [prefersReducedMotion, ...deps] },
  )
}
