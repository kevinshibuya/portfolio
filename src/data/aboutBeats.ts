/**
 * Single source of truth for the About cinematic beats.
 * Both <AboutScene> (canvas) and <AboutFallback> (DOM) read from this.
 *
 * `partSeeds` is a deterministic per-part scatter seed lookup. Used in
 * scatterMath to compute scattered positions. Keyed by semantic part name
 * — actual key names depend on the chosen .glb's mesh names (resolved at
 * model-load time; missing keys fall back to a hashed default).
 */
export interface AboutBeat {
  /** Stable id for keys, tests, and DOM landmarks. */
  id: 'origin' | 'present' | 'future'
  /** i18n key for the small top-left eyebrow ("01 — origin", etc.). */
  eyebrowKey: string
  /** i18n key for the big headline rendered behind the toy. */
  titleKey: string
  /** i18n key for the body caption at the bottom. */
  bodyKey: string
}

export const ABOUT_BEATS: readonly AboutBeat[] = [
  {
    id: 'origin',
    eyebrowKey: 'sections.about.beats.0.eyebrow',
    titleKey: 'sections.about.beats.0.title',
    bodyKey: 'sections.about.beats.0.body',
  },
  {
    id: 'present',
    eyebrowKey: 'sections.about.beats.1.eyebrow',
    titleKey: 'sections.about.beats.1.title',
    bodyKey: 'sections.about.beats.1.body',
  },
  {
    id: 'future',
    eyebrowKey: 'sections.about.beats.2.eyebrow',
    titleKey: 'sections.about.beats.2.title',
    bodyKey: 'sections.about.beats.2.body',
  },
] as const

/** Returns the active beat index given scrollYProgress 0..1. Clamped. */
export function beatIndexAtProgress(p: number): 0 | 1 | 2 {
  if (p < 1 / 3) return 0
  if (p < 2 / 3) return 1
  return 2
}
