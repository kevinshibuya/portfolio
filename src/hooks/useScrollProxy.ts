import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useScrollContext } from '../contexts/ScrollContext'

/**
 * Bridges our custom smooth scroll system with GSAP ScrollTrigger.
 * Must be called once inside the ScrollProvider.
 */
export function useScrollProxy(): void {
  const { scrollYRef, contentRef, registerScrollCallback } = useScrollContext()

  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    ScrollTrigger.scrollerProxy(container, {
      scrollTop(value?: number): number {
        if (typeof value === 'number') {
          scrollYRef.current = value
        }
        return scrollYRef.current
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }
      },
      pinType: 'transform',
    })

    // Tell every ScrollTrigger to use our container as scroller
    ScrollTrigger.defaults({ scroller: container })

    // Sync ScrollTrigger on every smooth-scroll frame
    const unsubscribe = registerScrollCallback(() => {
      ScrollTrigger.update()
    })

    return () => {
      unsubscribe()
      ScrollTrigger.killAll()
    }
  }, [scrollYRef, contentRef, registerScrollCallback])
}
