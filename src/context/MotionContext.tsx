import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ENABLE_R3F_ACCENT, MOBILE_BREAKPOINT_PX } from '../utils/motion-flags'

type Resolver = () => void

interface MotionContextValue {
  loaderDone: Promise<void>
  resolveLoader: Resolver
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  const [r3fEnabled, setR3fEnabled] = useState(false)
  useEffect(() => {
    setR3fEnabled(ENABLE_R3F_ACCENT && window.innerWidth >= MOBILE_BREAKPOINT_PX)
  }, [])

  const resolverRef = useRef<Resolver | null>(null)
  const loaderDone = useMemo(
    () => new Promise<void>((res) => { resolverRef.current = res }),
    []
  )

  const value = useMemo<MotionContextValue>(
    () => ({
      loaderDone,
      resolveLoader: () => resolverRef.current?.(),
      prefersReducedMotion: reduced,
      r3fAccentEnabled: r3fEnabled,
    }),
    [loaderDone, reduced, r3fEnabled]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion(): MotionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotion must be used within MotionProvider')
  return v
}
