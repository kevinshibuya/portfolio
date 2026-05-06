import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { parseInline } from '../inlineMarkdown'
import type { Block } from '../../../types/content'

type ParagraphBlock = Extract<Block, { type: 'paragraph' }>

interface Props {
  block: ParagraphBlock
  lang: 'en' | 'pt'
}

export function Paragraph({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.p
      className="project-detail-paragraph"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {parseInline(block.text[lang])}
    </motion.p>
  )
}
