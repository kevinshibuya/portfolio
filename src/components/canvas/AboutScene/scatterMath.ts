import { Vector3 } from 'three'

// Deterministic LCG seeded by index. Mulberry-like, returns floats in [-1, 1].
function rand(seed: number, salt: number): number {
  let s = (seed * 9301 + salt * 49297) % 233280
  s = (s + 233280) % 233280
  return (s / 116640) - 1  // -> roughly [-1, 1]
}

/**
 * Deterministic per-part scatter offset. Used to compute the "scattered"
 * starting position: `scattered = assembled + scatterOffset(index)`.
 *
 * Bounded so all parts stay visible inside the camera's frustum even
 * at fully-scattered (progress = 0).
 */
export function scatterOffset(index: number): Vector3 {
  return new Vector3(
    rand(index, 13) * 2,
    rand(index, 27) * 2,
    rand(index, 41) * 1.5,
  )
}

/**
 * Per-part outward spread direction (beat 3 — "spreading"). Normalized,
 * with a +0.2 upward bias to evoke "lift / agency" rather than just
 * radial scatter. Falls back to a unit-Y vector if the part sits exactly
 * at origin.
 */
export function spreadDirection(assembledPosition: Vector3): Vector3 {
  const radial = assembledPosition.clone()
  if (radial.length() < 1e-4) {
    return new Vector3(0, 1, 0)
  }
  radial.normalize()
  radial.y += 0.2
  return radial.normalize()
}
