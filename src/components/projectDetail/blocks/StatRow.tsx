import { motion } from 'framer-motion'
import { useMotion } from '../../../context/MotionContext'
import { staggerContainer, STAGGER_PRESETS } from '../../../utils/animations'
import type { Block } from '../../../types/content'

type StatRowBlock = Extract<Block, { type: 'stat-row' }>

interface Props {
  block: StatRowBlock
  lang: 'en' | 'pt'
}

export function StatRow({ block, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  return (
    <motion.dl
      className="project-detail-stat-row"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={prefersReducedMotion ? { hidden: {}, visible: {} } : staggerContainer(STAGGER_PRESETS.statValues)}
    >
      {block.stats.map((s, i) => (
        <motion.div
          key={i}
          className="project-detail-stat"
          variants={
            prefersReducedMotion
              ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
              : {
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }
          }
        >
          <dt className="project-detail-stat-value">{s.value}</dt>
          <dd className="project-detail-stat-label">{s.label[lang]}</dd>
        </motion.div>
      ))}
    </motion.dl>
  )
}
