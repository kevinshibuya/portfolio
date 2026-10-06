import { useCallback } from 'react'
import { useLenisContext } from '../components/layout/SmoothScroll'

interface ScrollOpts {
  /** Lenis tween duration in seconds (default 1.2). */
  duration?: number
  /** Pixel offset from the target's top (e.g. -80 to leave header room). */
  offset?: number
  /** Snap instantly without lerping. Use for scroll restoration / page
   *  resets where any visible animation reads as a glitch. */
  immediate?: boolean
  /** Override Lenis lock/stop state (used when restoring scroll while
   *  the entrance lock is in the process of releasing). */
  force?: boolean
}

export function useLenis(): {
  scrollTo: (target: number | string | HTMLElement, opts?: ScrollOpts) => void
} {
  const lenis = useLenisContext()

  const scrollTo = useCallback(
    (target: number | string | HTMLElement, opts: ScrollOpts = {}) => {
      const { duration = 1.2, offset = 0, immediate = false, force = false } = opts

      if (lenis) {
        // Lenis caches its scroll limit and refreshes it on a debounce. A
        // programmatic scroll fired as lazy sections mount would clamp to the
        // page as it was before they grew: an off-route nav to the archive
        // stopped at the old document's bottom, thousands of px short.
        lenis.resize()
        lenis.scrollTo(target, { duration, offset, immediate, force })
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
