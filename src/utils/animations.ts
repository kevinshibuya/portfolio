import type { Variants, Transition } from 'framer-motion'

// Spring presets (from hotmart-bunde reference). Tune in-place if visual feel needs adjustment.
export const SPRINGS = {
  gentle: { type: 'spring', stiffness: 100, damping: 20, mass: 1.0 },
  snappy: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
  soft:   { type: 'spring', stiffness: 80,  damping: 25, mass: 1.2 },
} as const satisfies Record<string, Transition>

export type SpringName = keyof typeof SPRINGS

// Recipe library — each is a Framer Variants object with hidden + visible states.
export const VARIANTS = {
  fadeUp: {
    hidden:  { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: SPRINGS.gentle },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1, transition: SPRINGS.snappy },
  },
  stampIn: {
    hidden:  { opacity: 0, scale: 1.15, filter: 'blur(2px)' },
    visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: SPRINGS.snappy },
  },
  cardReveal: {
    hidden:  { opacity: 0, y: 30, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: SPRINGS.soft },
  },
  slideInLeft: {
    hidden:  { opacity: 0, x: -32 },
    visible: { opacity: 1, x: 0, transition: SPRINGS.gentle },
  },
  slideInRight: {
    hidden:  { opacity: 0, x: 32 },
    visible: { opacity: 1, x: 0, transition: SPRINGS.gentle },
  },
} as const satisfies Record<string, Variants>

export type RecipeName = keyof typeof VARIANTS

// Stagger presets keyed by section role. Values in seconds.
// Mirrors the recipe→section mapping in spec §2.
export const STAGGER_PRESETS = {
  workRows: 0.1,
  skillsColumns: 0.12,
  skillsItems: 0.06,
  projectCards: 0.1,
  embedRows: 0.05,
  statValues: 0.12,
} as const satisfies Record<string, number>

export function staggerContainer(stagger: number, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  }
}

// Reduced-motion fallback variant. RevealOnView and Stagger consume this when
// prefersReducedMotion is true — pure opacity, no transform, no blur.
export const REDUCED_MOTION_VARIANT: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}

// Backwards-compat shim — LoadingScreen and HeroDataFragments still pass this
// to GSAP tweens. Removed in plan Task 8 step 1a, after Task 7.5 migrates
// LoadingScreen to Motion's animate() and Task 9 deletes HeroDataFragments.
export const projectEaseGsap = 'power3.out'
