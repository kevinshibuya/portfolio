import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * Thin horizontal line that draws left→right as the user scrolls past it.
 */
export function ScrollLine() {
  const lineRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useGSAP(
    () => {
      if (!lineRef.current || prefersReducedMotion) return

      gsap.fromTo(
        lineRef.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: lineRef.current,
            start: 'top 90%',
            end: 'top 50%',
            scrub: 0.5,
          },
        },
      )
    },
    { dependencies: [prefersReducedMotion] },
  )

  return (
    <div className="px-6 md:px-12 lg:px-24">
      <div
        ref={lineRef}
        className="h-px bg-accent/30 origin-left"
      />
    </div>
  )
}
