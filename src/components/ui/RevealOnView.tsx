import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  VARIANTS,
  REDUCED_MOTION_VARIANT,
  type RecipeName,
} from '../../utils/animations'

// Legacy string aliases so any not-yet-migrated call sites still render.
// Removed in Task 18 step 0 once every consumer uses RecipeName directly.
const LEGACY_ALIASES: Record<string, RecipeName> = {
  'fade': 'fadeUp',
  'fade-up': 'fadeUp',
  'stagger-children': 'fadeUp',  // legacy stagger now handled by <Stagger>
}

type LegacyVariant = keyof typeof LEGACY_ALIASES

interface RevealOnViewProps {
  recipe?: RecipeName | LegacyVariant
  /** Backwards-compat alias for `recipe`. Removed in Task 18 step 0. */
  variant?: LegacyVariant
  /** Backwards-compat — silently ignored. Stagger now lives in <Stagger>. Removed in Task 18 step 0. */
  staggerAmount?: number
  /** Seconds added to the visible transition delay. */
  delay?: number
  className?: string
  children: React.ReactNode
  /** Override the default viewport-amount (0.2). Use 0.0 when an element is
   *  taller than the viewport and would otherwise never trigger. */
  amount?: number
}

function resolveRecipe(input: RecipeName | LegacyVariant | undefined): RecipeName {
  if (!input) return 'fadeUp'
  if (input in LEGACY_ALIASES) return LEGACY_ALIASES[input as LegacyVariant]
  return input as RecipeName
}

export function RevealOnView({
  recipe,
  variant,
  staggerAmount: _staggerAmount,
  delay = 0,
  className,
  children,
  amount = 0.2,
}: RevealOnViewProps) {
  const { prefersReducedMotion } = useMotion()

  if (prefersReducedMotion) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount }}
        variants={REDUCED_MOTION_VARIANT}
      >
        {children}
      </motion.div>
    )
  }

  const recipeName = resolveRecipe(recipe ?? variant)
  const base = VARIANTS[recipeName]

  // If a delay was requested, splice it into the visible variant's transition
  // without mutating the shared VARIANTS object.
  const variants: Variants = delay
    ? {
        hidden: base.hidden,
        visible: {
          ...(base.visible as object),
          transition: {
            ...((base.visible as { transition?: object }).transition ?? {}),
            delay,
          },
        },
      }
    : base

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

// Backwards-compat re-export — five section files still import { childVariants }
// from this module to drive the inner motion.div in their stagger lists.
// Removed in Task 18 step 0 once those sections migrate to <Stagger> (Tasks 11-15).
export const childVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
