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

  // Single fade-up rather than the hero's word-split so multi-word italic
  // spans like "*data dashboard*" or "*real-time apps*" render correctly
  // through parseInline. The display type carries the entrance weight.
  return (
    <motion.p
      className="project-detail-pitch"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.7,
        ease: EASE,
      }}
    >
      {parseInline(value)}
    </motion.p>
  )
}
