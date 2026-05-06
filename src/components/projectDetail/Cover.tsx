import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import type { Project } from '../../types/content'

interface Props {
  project: Project
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Cover({ project, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const hasImage = project.coverImage && project.coverImage.length > 0
  const fallbackBg = project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)'

  return (
    <motion.div
      className="project-detail-cover"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.95, ease: EASE }}
      style={hasImage ? undefined : { background: fallbackBg }}
    >
      {hasImage ? (
        <img
          src={project.coverImage}
          alt={project.title[lang]}
          loading="eager"
          className="project-detail-cover-img"
        />
      ) : (
        <span className="project-detail-cover-fallback">{project.title[lang]}</span>
      )}
    </motion.div>
  )
}
