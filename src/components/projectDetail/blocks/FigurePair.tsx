import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import type { Block, FigureSrc } from '../../../types/content'

type FigurePairBlock = Extract<Block, { type: 'figure-pair' }>

interface Props {
  block: FigurePairBlock
  lang: 'en' | 'pt'
}

function PairItem({ item, lang }: { item: FigureSrc; lang: 'en' | 'pt' }) {
  return (
    <figure className="project-detail-figure-pair-item">
      <img
        src={item.src}
        alt={item.alt?.[lang] ?? ''}
        loading="lazy"
        className="project-detail-figure-img"
      />
      {item.caption && (
        <figcaption className="project-detail-figure-caption">{item.caption[lang]}</figcaption>
      )}
    </figure>
  )
}

export function FigurePair({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.div
      className="project-detail-figure-pair"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <PairItem item={block.left} lang={lang} />
      <PairItem item={block.right} lang={lang} />
    </motion.div>
  )
}
