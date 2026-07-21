import type { Variants, Transition } from 'framer-motion'

// Duration palette (seconds) + signature ease — the TS mirror of the CSS motion tokens
// in index.css (:root). Keep the two in sync.
export const DURATIONS = { quick: 0.18, standard: 0.6, slow: 0.9 } as const
export const EASE_HOUSE = [0.22, 1, 0.36, 1] as const

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

// --- Project detail page variants ---

export const titleCharSplit: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.03, delayChildren: 0.2 },
  },
}

export const titleChar: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

export const taglineWordSplit: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.5 },
  },
}

export const taglineWord: Variants = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteStripe: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

export const pullquoteText: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
}
