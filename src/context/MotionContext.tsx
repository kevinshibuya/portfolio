import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ENABLE_R3F_ACCENT, MOBILE_BREAKPOINT_PX } from '../utils/motion-flags'
import { useLoaderProgress } from '../hooks/useLoaderProgress'

interface MotionContextValue {
  /** 0..1 loader progress; drives HeroNameDrawing stroke pathLengths and
   *  LoadingCursor X position during the draw phase. */
  progress: number
  /** Resolves when progress reaches 1 (visual draw complete, before
   *  ink-fill / period bloom / float-to-nav). */
  drawDone: Promise<void>
  /** Resolves when the cursor's flight to the nav completes (or
   *  immediately under reduced motion / non-home routes). */
  handoffDone: Promise<void>
  /** Backward-compat alias for handoffDone. */
  loaderDone: Promise<void>
  /** Called by LoadingCursor (or route-aware code) to resolve handoffDone. */
  resolveHandoff: () => void
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  const { progress, drawDone, handoffDone, resolveHandoff } =
    useLoaderProgress(reduced)

  const [r3fEnabled, setR3fEnabled] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    const forceOff = url.searchParams.get('disableR3f') === '1'
    setR3fEnabled(ENABLE_R3F_ACCENT && !forceOff && window.innerWidth >= MOBILE_BREAKPOINT_PX)
  }, [])

  const value = useMemo<MotionContextValue>(
    () => ({
      progress,
      drawDone,
      handoffDone,
      loaderDone: handoffDone,
      resolveHandoff,
      prefersReducedMotion: reduced,
      r3fAccentEnabled: r3fEnabled,
    }),
    [progress, drawDone, handoffDone, resolveHandoff, reduced, r3fEnabled]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion(): MotionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotion must be used within MotionProvider')
  return v
}
