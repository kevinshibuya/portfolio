/**
 * Pure, unit-tested math helpers for the rosette halftone shader primitive.
 * Kept framework-free (no three / no GLSL) so they can be exercised in jsdom;
 * the shader's GLSL correctness is verified by the browser smoke + visual review.
 */

/** Authentic CMYK rosette screen angles, in DEGREES (C=15, M=75, Y=0, K=45). */
export const ROSETTE_ANGLES_DEG: { c: 15; m: 75; y: 0; k: 45 } = {
  c: 15,
  m: 75,
  y: 0,
  k: 45,
}

const DEG_TO_RAD = Math.PI / 180

/** [C, M, Y, K] authentic rosette screen angles in RADIANS. */
export function rosetteAnglesRad(): [number, number, number, number] {
  return [
    ROSETTE_ANGLES_DEG.c * DEG_TO_RAD,
    ROSETTE_ANGLES_DEG.m * DEG_TO_RAD,
    ROSETTE_ANGLES_DEG.y * DEG_TO_RAD,
    ROSETTE_ANGLES_DEG.k * DEG_TO_RAD,
  ]
}

/** Coarse→fine dot frequency scrub. Clamps p to [0,1]. Defaults coarse=8, fine=120. */
export function frequencyForProgress(p: number, coarse = 8, fine = 120): number {
  const t = Math.min(1, Math.max(0, p))
  return coarse + (fine - coarse) * t
}

/** Device-pixel-ratio cap for dot math. Returns min(max(raw,1), cap). Default cap=2. */
export function cappedDpr(raw: number, cap = 2): number {
  return Math.min(Math.max(raw, 1), cap)
}
