import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ENABLE_R3F_ACCENT, MOBILE_BREAKPOINT_PX } from '../utils/motion-flags'

type Resolver = () => void

interface MotionContextValue {
  /**
   * Resolves once when the LoadingScreen handoff completes. Module-scoped, so
   * the SAME promise instance survives React 19 StrictMode remounts and any
   * future MotionProvider unmount/remount — consumers can safely await it from
   * any hook scope without risking an orphaned cycle-1 promise.
   */
  loaderDone: Promise<void>
  resolveLoader: Resolver
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}

let _loaderResolver: Resolver | null = null
const _loaderDone: Promise<void> = new Promise<void>((res) => { _loaderResolver = res })
const resolveLoader: Resolver = () => _loaderResolver?.()

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  const [r3fEnabled, setR3fEnabled] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    const forceOff = url.searchParams.get('disableR3f') === '1'
    setR3fEnabled(ENABLE_R3F_ACCENT && !forceOff && window.innerWidth >= MOBILE_BREAKPOINT_PX)
  }, [])

  const value = useMemo<MotionContextValue>(
    () => ({
      loaderDone: _loaderDone,
      resolveLoader,
      prefersReducedMotion: reduced,
      r3fAccentEnabled: r3fEnabled,
    }),
    [reduced, r3fEnabled]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion(): MotionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotion must be used within MotionProvider')
  return v
}
