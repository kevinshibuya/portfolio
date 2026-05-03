import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  VARIANTS,
  REDUCED_MOTION_VARIANT,
  type RecipeName,
} from '../../utils/animations'

const LEGACY_ALIASES: Record<string, RecipeName> = {
  'fade': 'fadeUp',
  'fade-up': 'fadeUp',
}

type LegacyVariant = keyof typeof LEGACY_ALIASES

interface RevealOnViewProps {
  recipe?: RecipeName | LegacyVariant
  /** Seconds added to the visible transition delay. */
  delay?: number
  className?: string
  children: React.ReactNode
  /** Override the default viewport-amount (0.2). Use 0.0 when an element is
   *  taller than the viewport and would otherwise never trigger. */
  amount?: number
  /** Defer the hidden→visible transition until this flag is true. Used by
   *  Hero to chain the staged reveal AFTER the loader has fully faded out;
   *  without this gate, RevealOnView triggers on mount and the early frames
   *  play behind the loader. When undefined, the default whileInView
   *  behavior applies. */
  gate?: boolean
}

function resolveRecipe(input: RecipeName | LegacyVariant | undefined): RecipeName {
  if (!input) return 'fadeUp'
  if (input in LEGACY_ALIASES) return LEGACY_ALIASES[input as LegacyVariant]
  return input as RecipeName
}

export function RevealOnView({
  recipe,
  delay = 0,
  className,
  children,
  amount = 0.2,
  gate,
}: RevealOnViewProps) {
  const { prefersReducedMotion } = useMotion()
  const useGate = gate !== undefined

  if (prefersReducedMotion) {
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate={useGate ? (gate ? 'visible' : 'hidden') : undefined}
        whileInView={useGate ? undefined : 'visible'}
        viewport={useGate ? undefined : { once: true, amount }}
        variants={REDUCED_MOTION_VARIANT}
      >
        {children}
      </motion.div>
    )
  }

  const recipeName = resolveRecipe(recipe)
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
      animate={useGate ? (gate ? 'visible' : 'hidden') : undefined}
      whileInView={useGate ? undefined : 'visible'}
      viewport={useGate ? undefined : { once: true, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}
