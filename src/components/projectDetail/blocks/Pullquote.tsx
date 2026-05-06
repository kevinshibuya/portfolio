import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { pullquoteStripe, pullquoteText } from '../../../utils/animations'
import type { Block } from '../../../types/content'

type PullquoteBlock = Extract<Block, { type: 'pullquote' }>

interface Props {
  block: PullquoteBlock
  lang: 'en' | 'pt'
}

export function Pullquote({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.blockquote
      className="project-detail-pullquote"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
    >
      <motion.span
        className="project-detail-pullquote-stripe"
        variants={prefersReducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : pullquoteStripe}
        aria-hidden
      />
      <motion.span
        className="project-detail-pullquote-text"
        variants={prefersReducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : pullquoteText}
      >
        {block.text[lang]}
      </motion.span>
      {block.attribution && (
        <cite className="project-detail-pullquote-cite">— {block.attribution}</cite>
      )}
    </motion.blockquote>
  )
}
