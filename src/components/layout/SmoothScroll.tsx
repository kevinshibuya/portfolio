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
  const { prefersReducedMotion } = useMotion()
  // Hold the instance in state so the provider re-renders with a non-null
  // value once Lenis mounts. (A ref alone wouldn't trigger a re-render, so
  // useLenis() consumers would see null forever on first mount.)
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      setLenis(null)
      return
    }

    const instance = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      // smoothTouch is a Lenis option in some versions; if your installed
      // version doesn't accept it, the touch path defaults to native momentum.
      // @ts-expect-error - present at runtime, may not be in the type defs
      smoothTouch: false,
    })
    setLenis(instance)

    let rafId = 0
    const raf = (time: number) => {
      instance.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      instance.destroy()
      setLenis(null)
    }
  }, [prefersReducedMotion])

  return <LenisCtx.Provider value={lenis}>{children}</LenisCtx.Provider>
}
