import React from 'react'
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import {
  VARIANTS,
  REDUCED_MOTION_VARIANT,
  staggerContainer,
  type RecipeName,
} from '../../utils/animations'

interface StaggerProps {
  /** Recipe applied to each direct child */
  recipe: RecipeName
  /** Stagger delay between children, seconds */
  stagger: number
  /** Delay before the first child fires, seconds */
  delayChildren?: number
  amount?: number
  className?: string
  children: React.ReactNode
}

export function Stagger({
  recipe,
  stagger,
  delayChildren = 0,
  amount = 0.2,
  className,
  children,
}: StaggerProps) {
  const { prefersReducedMotion } = useMotion()

  // Reduced motion: no stagger, no transform — children just opacity-fade in unison.
  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(stagger, delayChildren)
  const childVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS[recipe]

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={parentVariants}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child
        return <motion.div variants={childVariants}>{child}</motion.div>
      })}
    </motion.div>
  )
}
