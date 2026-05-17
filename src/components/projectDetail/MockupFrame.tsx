import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'

interface Props {
  src: string
  variant: 'desktop' | 'mobile'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function MockupFrame({ src, variant, alt }: Props) {
  const { prefersReducedMotion } = useMotion()

  return (
    <motion.figure
      className={`project-detail-mockup-frame project-detail-mockup-frame--${variant}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: EASE,
      }}
    >
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </motion.figure>
  )
}
