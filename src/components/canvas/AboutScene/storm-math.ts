const TAU = Math.PI * 2

/** Wraps an angle into [-π, π) — +π maps to -π. */
export function wrapPi(x: number): number {
  const m = ((x + Math.PI) % TAU + TAU) % TAU
  return m - Math.PI
}

/**
 * Reversed smoothstep falloff:
 *   x ≤ edge0 → 1
 *   x ≥ edge1 → 0
 *   in between → smooth cubic ramp (3t² − 2t³)
 */
export function smoothFalloff(x: number, edge0: number, edge1: number): number {
  if (edge1 === edge0) return x < edge0 ? 1 : 0
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return 1 - t * t * (3 - 2 * t)
}

/**
 * Cylinder angle for fragment index i out of N fragments.
 * Picks offsets so fragment i sweeps through camera-front at progress (i + 0.5) / N
 * when the cylinder rotates by progress · 2π.
 *
 * Derivation: with local position (R·sin(θ), y, -R·cos(θ)) and group Y rotation
 * ψ around origin, a fragment reaches world (0, *, -R) when θ_i - ψ = 0 (mod 2π).
 * So we set θ_i = (i + 0.5) · 2π/n and fragment i peaks at ψ = θ_i, which maps
 * to progress = (i + 0.5)/n given ψ = progress · 2π.
 */
export function fragmentAngle(i: number, n: number): number {
  return (i + 0.5) * (TAU / n)
}

/**
 * Per-fragment opacity given its current angle relative to camera-front.
 * fadeStart: angle at which fragment is still fully visible (default 20°)
 * fadeEnd:   angle at which fragment is fully hidden  (default 30°)
 */
export function fragmentOpacityAtAngle(
  angle: number,
  fadeStart: number = Math.PI / 9,
  fadeEnd: number = Math.PI / 6,
): number {
  return smoothFalloff(Math.abs(angle), fadeStart, fadeEnd)
}
