import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type HeadingBlock = Extract<Block, { type: 'heading' }>

interface Props {
  block: HeadingBlock
  lang: 'en' | 'pt'
}

export function Heading({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const Tag = `h${block.level}` as 'h2' | 'h3'
  return (
    <motion.div
      className={`project-detail-heading project-detail-heading--h${block.level}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tag>{block.text[lang]}</Tag>
    </motion.div>
  )
}
