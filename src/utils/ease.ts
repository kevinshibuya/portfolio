/**
 * The site's curves as functions of time, for motion driven from script.
 * index.css carries the same curves as custom properties.
 *
 *   house  cubic-bezier(0.22, 1, 0.36, 1)   the loader's contraction
 *   E1     cubic-bezier(0.5, 0.6, 0, 1)     page-level moves, arrows, every transition
 *   E2     cubic-bezier(0, 0.56, 0.25, 1)   the pop of words and small parts
 */
export const E1 = 'cubic-bezier(0.5, 0.6, 0, 1)'
export const E2 = 'cubic-bezier(0, 0.56, 0.25, 1)'

const bezier = (t: number, a: number, b: number): number => {
  const u = 1 - t
  return 3 * u * u * t * a + 3 * u * t * t * b + t * t * t
}

function solve(progress: number, x1: number, y1: number, x2: number, y2: number): number {
  const x = Math.min(1, Math.max(0, progress))
  // Solve bezier-x(t) = x by bisection; 24 halvings are exact to a pixel.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (bezier(mid, x1, x2) < x) lo = mid
    else hi = mid
  }
  return bezier((lo + hi) / 2, y1, y2)
}

export function house(progress: number): number {
  return solve(progress, 0.22, 1, 0.36, 1)
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** A power ease-out: fast at first, settling at the end. */
export function outPow(progress: number, power: number): number {
  return 1 - (1 - clamp01(progress)) ** power
}

/** True on a device that hovers with a fine pointer. */
export function finePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** True when the OS asks for reduced motion. */
export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
