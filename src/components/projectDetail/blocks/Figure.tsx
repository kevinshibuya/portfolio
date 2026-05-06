import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block } from '../../../types/content'

type FigureBlock = Extract<Block, { type: 'figure' }>

interface Props {
  block: FigureBlock
  lang: 'en' | 'pt'
}

export function Figure({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.figure
      className={`project-detail-figure project-detail-figure--${block.width}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <img
        src={block.src}
        alt={block.alt?.[lang] ?? ''}
        loading="lazy"
        className="project-detail-figure-img"
      />
      {block.caption && (
        <figcaption className="project-detail-figure-caption">
          {block.caption[lang]}
        </figcaption>
      )}
    </motion.figure>
  )
}
