import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useMotion } from '../../context/MotionContext'

interface Props {
  src: string
  variant: 'desktop' | 'mobile'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function MockupFrame({ src, variant, alt }: Props) {
  const { prefersReducedMotion } = useMotion()
  const ref = useRef<HTMLElement>(null)

  // Desktop: scroll-tied scale + parallax as the figure passes through the
  // viewport. offset = ['start end', 'end start'] = full pass.
  // (Hook runs unconditionally so the rules of hooks aren't violated; the
  // computed motion values are simply ignored on the mobile branch and
  // when prefersReducedMotion is true.)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const scrollScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.96, 1.02, 1])
  const scrollY = useTransform(scrollYProgress, [0, 1], [20, -20])

  if (variant === 'mobile') {
    return (
      <motion.figure
        ref={ref}
        className="project-detail-mockup-frame project-detail-mockup-frame--mobile"
        initial={
          prefersReducedMotion
            ? { opacity: 0 }
            : { opacity: 0, rotate: -3, y: 24 }
        }
        whileInView={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 1, rotate: 0, y: 0 }
        }
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 1.0,
          ease: [0.34, 1.56, 0.64, 1], // back-ease so the tilt settles
        }}
      >
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </motion.figure>
    )
  }

  // Desktop
  return (
    <motion.figure
      ref={ref}
      className="project-detail-mockup-frame project-detail-mockup-frame--desktop"
      style={prefersReducedMotion ? undefined : { scale: scrollScale, y: scrollY }}
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.7,
          ease: EASE,
        }}
      >
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </motion.div>
    </motion.figure>
  )
}
