import { type RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { EASE_SMOOTH } from '../utils/gsapConfig'
import { useReducedMotion } from './useReducedMotion'

interface ScrollRevealConfig {
  /** CSS selector for child elements to stagger. If omitted, animates the ref itself. */
  childSelector?: string
  /** ScrollTrigger start position. Default: 'top 80%' */
  start?: string
  /** Stagger delay between children. Default: 0.1 */
  stagger?: number
  /** Y offset to animate from. Default: 40 */
  yOffset?: number
  /** Animation duration. Default: 0.6 */
  duration?: number
  /** Extra dependencies */
  deps?: unknown[]
}

/**
 * Generic scroll-reveal hook. Animates a single element or staggers its children
 * from opacity:0 + y-offset into view using GSAP ScrollTrigger.
 */
export function useScrollReveal(
  ref: RefObject<HTMLElement | null>,
  config: ScrollRevealConfig = {},
): void {
  const {
    childSelector,
    start = 'top 80%',
    stagger = 0.1,
    yOffset = 40,
    duration = 0.6,
    deps = [],
  } = config
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      const container = ref.current
      if (!container || prefersReducedMotion) return

      const targets = childSelector
        ? container.querySelectorAll(childSelector)
        : [container]

      if (targets.length === 0) return

      gsap.set(targets, { y: yOffset, opacity: 0 })

      gsap.to(targets, {
        y: 0,
        opacity: 1,
        stagger: childSelector ? stagger : 0,
        duration,
        ease: EASE_SMOOTH,
        scrollTrigger: {
          trigger: container,
          start,
          toggleActions: 'play none none none',
        },
      })
    },
    { dependencies: [prefersReducedMotion, ...deps] },
  )
}
