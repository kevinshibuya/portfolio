import { createContext, useContext, useEffect, useState, type ReactElement, type ReactNode } from 'react'
import type Lenis from 'lenis'
import { useMotion } from '../../context/MotionContext'

const LenisCtx = createContext<Lenis | null>(null)

export function useLenisContext(): Lenis | null {
  return useContext(LenisCtx)
}

/**
 * How fast the page catches up with the wheel: each frame closes this share of
 * the remaining distance (at 60 fps). Measured on the home page with a burst of
 * six 100 px wheel ticks, the page has covered 90 % of the distance in about
 * 420 ms and 99 % in about 555 ms: weight without lag.
 */
const LERP = 0.3

export function SmoothScroll({ children }: { children: ReactNode }): ReactElement {
  const { prefersReducedMotion, entranceDone } = useMotion()
  // Held in state so the provider re-renders once the instance exists.
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) return

    let cancelled = false
    let instance: Lenis | null = null
    let rafId = 0

    // The library loads once the entrance has played: the page is scroll-locked
    // until then, so nothing needs it sooner.
    entranceDone
      .then(() => import('lenis'))
      .then(({ default: LenisClass }) => {
        if (cancelled) return
        // Touch keeps its native momentum and pull-to-refresh: only the wheel is smoothed.
        const created = new LenisClass({ lerp: LERP, smoothWheel: true })
        instance = created
        setLenis(created)
        const raf = (time: number): void => {
          created.raf(time)
          rafId = requestAnimationFrame(raf)
        }
        rafId = requestAnimationFrame(raf)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      instance?.destroy()
      setLenis(null)
    }
  }, [prefersReducedMotion, entranceDone])

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}
