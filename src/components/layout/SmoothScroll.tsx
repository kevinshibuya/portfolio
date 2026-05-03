import React, { createContext, useContext, useEffect, useState } from 'react'
import Lenis from 'lenis'
import { useMotion } from '../../context/MotionContext'

const LenisCtx = createContext<Lenis | null>(null)

export function useLenisContext(): Lenis | null {
  return useContext(LenisCtx)
}

interface SmoothScrollProps {
  children: React.ReactNode
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const { prefersReducedMotion, entranceDone } = useMotion()
  // Hold the instance in state so the provider re-renders with a non-null
  // value once Lenis mounts. (A ref alone wouldn't trigger a re-render, so
  // useLenis() consumers would see null forever on first mount.)
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      setLenis(null)
      return
    }

    // Touch handling: Lenis 1.3+ uses `syncTouch` (default false) — leaving it
    // off preserves native iOS momentum + pull-to-refresh, which is what
    // spec §3 wants. We don't pass it explicitly because the default already
    // matches our intent and passing it would just be noise.
    const instance = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })
    // Hold scroll inert until the hero entrance animation completes.
    // Lenis intercepts wheel/touch events directly, so the
    // body[data-loader-state] CSS lock alone doesn't stop it — we need
    // to stop the instance.
    instance.stop()
    setLenis(instance)

    let rafId = 0
    const raf = (time: number) => {
      instance.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    let cancelled = false
    entranceDone
      .then(() => {
        if (!cancelled) instance.start()
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      instance.destroy()
      setLenis(null)
    }
  }, [prefersReducedMotion, entranceDone])

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}
