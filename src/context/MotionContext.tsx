import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ENABLE_R3F_ACCENT, MOBILE_BREAKPOINT_PX } from '../utils/motion-flags'

type Resolver = () => void

interface MotionContextValue {
  /** Resolves once the hero name's trace + ink-fill entrance animation
   *  completes. Header, SmoothScroll, and the rest of the hero cascade
   *  await this before becoming visible / interactive.
   *
   *  Module-scoped so the SAME promise instance survives React 19
   *  StrictMode remounts and any future MotionProvider unmount/remount —
   *  consumers can safely await it from any hook scope without risking
   *  an orphaned cycle-1 promise. */
  entranceDone: Promise<void>
  resolveEntrance: Resolver
  /** Skips the hero entrance animation entirely and resolves the gate.
   *  Used when restoring Home from back-navigation so the ink-trace
   *  doesn't replay. */
  bypassEntrance: Resolver
  /** True once bypassEntrance() has been called. HeroNameDrawing and
   *  useScrollLockDuringEntrance read this to skip animation / lock. */
  entranceBypassed: boolean
  /** Backward-compat alias — some legacy consumers still read `loaderDone`. */
  loaderDone: Promise<void>
  prefersReducedMotion: boolean
  r3fAccentEnabled: boolean
}

let _resolveEntrance: Resolver | null = null
const _entranceDone: Promise<void> = new Promise<void>((res) => {
  _resolveEntrance = res
})
const resolveEntrance: Resolver = () => _resolveEntrance?.()

let _entranceBypassed = false
const bypassEntrance: Resolver = () => {
  _entranceBypassed = true
  resolveEntrance()
}

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  const [r3fEnabled, setR3fEnabled] = useState(false)
  useEffect(() => {
    const url = new URL(window.location.href)
    const forceOff = url.searchParams.get('disableR3f') === '1'
    setR3fEnabled(
      ENABLE_R3F_ACCENT && !forceOff && window.innerWidth >= MOBILE_BREAKPOINT_PX
    )
  }, [])

  const value = useMemo<MotionContextValue>(
    () => ({
      entranceDone: _entranceDone,
      resolveEntrance,
      bypassEntrance,
      entranceBypassed: _entranceBypassed,
      loaderDone: _entranceDone,
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
