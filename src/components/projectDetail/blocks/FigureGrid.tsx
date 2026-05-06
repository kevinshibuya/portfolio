import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { staggerContainer } from '../../../utils/animations'
import type { Block, FigureSrc } from '../../../types/content'

type FigureGridBlock = Extract<Block, { type: 'figure-grid' }>

interface Props {
  block: FigureGridBlock
  lang: 'en' | 'pt'
}

export function FigureGrid({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.div
      className="project-detail-figure-grid"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(0.08)}
    >
      {block.items.map((item: FigureSrc, i: number) => (
        <motion.figure
          key={i}
          className="project-detail-figure-grid-item"
          variants={
            prefersReducedMotion
              ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
              : {
                  hidden: { opacity: 0, scale: 0.96 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }
          }
        >
          <img
            src={item.src}
            alt={item.alt?.[lang] ?? ''}
            loading="lazy"
            className="project-detail-figure-img"
          />
          {item.caption && (
            <figcaption className="project-detail-figure-caption">
              {item.caption[lang]}
            </figcaption>
          )}
        </motion.figure>
      ))}
    </motion.div>
  )
}
