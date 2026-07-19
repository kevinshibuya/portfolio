import { createContext, useContext, useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

type Resolver = () => void

interface MotionContextValue {
  /** Resolves once the hero's GSAP entrance timeline completes (or is
   *  bypassed / reduced-motion-snapped). Header, SmoothScroll, and the
   *  rest of the hero cascade await this before becoming visible /
   *  interactive.
   *
   *  Module-scoped so the SAME promise instance survives React 19
   *  StrictMode remounts and any future MotionProvider unmount/remount —
   *  consumers can safely await it from any hook scope without risking
   *  an orphaned cycle-1 promise. */
  entranceDone: Promise<void>
  resolveEntrance: Resolver
  /** Skips the hero entrance animation entirely and resolves the gate.
   *  Used when restoring Home from back-navigation so the GSAP entrance
   *  doesn't replay. */
  bypassEntrance: Resolver
  /** True once bypassEntrance() has been called. The Hero entrance effect
   *  and useScrollLockDuringEntrance read this to skip animation / lock. */
  entranceBypassed: boolean
  prefersReducedMotion: boolean
}

let _resolveEntrance: Resolver | null = null
const _entranceDone: Promise<void> = new Promise<void>((res) => {
  _resolveEntrance = res
})
const resolveEntrance: Resolver = () => _resolveEntrance?.()

// Module-scoped curtain handshake. The static loader in index.html paints
// at first frame. main.tsx calls resolveCurtain() after the curtain
// transition finishes lifting; the Hero GSAP entrance effect awaits
// curtainGone before starting its timeline, so the paint-bloom + clipped
// rises play on a clean stage rather than under the curtain.
let _resolveCurtain: Resolver | null = null
const _curtainGone: Promise<void> = new Promise<void>((res) => {
  _resolveCurtain = res
})
const resolveCurtain: Resolver = () => _resolveCurtain?.()

// Module-scoped flag is the survive-everything source of truth (StrictMode
// double-mount, MotionProvider remount). The provider also mirrors it in
// state so calling bypassEntrance() triggers a context re-render and
// consumers see the new value.
let _entranceBypassed = false

const Ctx = createContext<MotionContextValue | null>(null)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion() ?? false

  // Initialise from the module flag so a remounted provider picks up an
  // already-bypassed state instead of resetting to false.
  const [bypassed, setBypassed] = useState(_entranceBypassed)
  const bypassEntrance: Resolver = () => {
    _entranceBypassed = true
    setBypassed(true)
    resolveEntrance()
    // Back-nav from project detail: there's no full reload, so the loader
    // never rendered. Pre-resolve the curtain so the Hero entrance effect's
    // await in this scenario doesn't stall.
    resolveCurtain()
  }

  const value = useMemo<MotionContextValue>(
    () => ({
      entranceDone: _entranceDone,
      resolveEntrance,
      bypassEntrance,
      entranceBypassed: bypassed,
      prefersReducedMotion: reduced,
    }),
    // bypassEntrance is recreated each render but its identity changing
    // doesn't matter to consumers — it's a one-shot side-effecting call.
    [reduced, bypassed]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useMotion(): MotionContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useMotion must be used within MotionProvider')
  return v
}

// Module-level exports for non-React consumers (main.tsx) and for components
// that need to await the curtain handoff (the Hero entrance effect) without
// going through the React context. Mirrors the `_entranceDone` accessor pattern.
export const curtainGone = _curtainGone
export const entranceDone = _entranceDone
export { resolveCurtain, resolveEntrance }
