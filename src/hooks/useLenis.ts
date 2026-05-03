import { useCallback } from 'react'
import { useLenisContext } from '../components/layout/SmoothScroll'

interface ScrollOpts {
  /** Lenis tween duration in seconds (default 1.2). */
  duration?: number
  /** Pixel offset from the target's top (e.g. -80 to leave header room). */
  offset?: number
}

export function useLenis(): {
  scrollTo: (target: number | string | HTMLElement, opts?: ScrollOpts) => void
} {
  const lenis = useLenisContext()

  const scrollTo = useCallback(
    (target: number | string | HTMLElement, opts: ScrollOpts = {}) => {
      const { duration = 1.2, offset = 0 } = opts

      if (lenis) {
        lenis.scrollTo(target, { duration, offset })
        return
      }

      // Fallback: reduced-motion or pre-mount path. Use native scroll.
      if (typeof target === 'number') {
        window.scrollTo({ top: target + offset, behavior: 'auto' })
        return
      }
      const el = typeof target === 'string'
        ? document.querySelector(target) as HTMLElement | null
        : target
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY + offset
      window.scrollTo({ top, behavior: 'auto' })
    },
    [lenis]
  )

  return { scrollTo }
}
