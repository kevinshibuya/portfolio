import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import type { Bilingual } from '../../types/content'

interface Props {
  text: Bilingual
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Pitch({ text, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const value = text[lang]

  return (
    <motion.p
      className="project-detail-pitch"
      initial={
        prefersReducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 32, filter: 'blur(6px)' }
      }
      whileInView={
        prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, filter: 'blur(0px)' }
      }
      viewport={{ once: true, amount: 0.4 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 1.0,
        ease: EASE,
      }}
    >
      {parseInline(value)}
    </motion.p>
  )
}
