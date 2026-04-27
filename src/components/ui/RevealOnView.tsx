import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'

type Variant = 'fade' | 'fade-up' | 'stagger-children'

const variants: Record<Variant, Variants> = {
  'fade': {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  },
  'fade-up': {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  },
  'stagger-children': {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
}

export const childVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

interface RevealOnViewProps {
  variant?: Variant
  staggerAmount?: number
  className?: string
  children: React.ReactNode
}

export function RevealOnView({
  variant = 'fade-up',
  staggerAmount,
  className,
  children,
}: RevealOnViewProps) {
  const { prefersReducedMotion } = useMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const v =
    variant === 'stagger-children' && typeof staggerAmount === 'number'
      ? {
          hidden: {},
          visible: {
            transition: { staggerChildren: staggerAmount, delayChildren: 0.05 },
          },
        }
      : variants[variant]

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-10% 0px' }}
      variants={v}
    >
      {children}
    </motion.div>
  )
}
