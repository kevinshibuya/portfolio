import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import {
  titleCharSplit,
  titleChar,
  taglineWordSplit,
  taglineWord,
  REDUCED_MOTION_VARIANT,
} from '../../utils/animations'
import { StatRow } from './blocks/StatRow'
import type { Project } from '../../types/content'

interface Props {
  project: Project
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero({ project, lang }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const title = project.title[lang]
  const tagline = project.tagline?.[lang]

  return (
    <header className="project-detail-hero">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: EASE }}
      >
        <Link to="/" className="project-detail-back">
          ← {t('projectDetail.back')}
        </Link>
      </motion.div>

      <motion.span
        className="project-detail-eyebrow"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: EASE }}
      >
        {project.year}{project.projectType ? ` · ${project.projectType}` : ''}
      </motion.span>

      <motion.h1
        className="project-detail-title"
        variants={prefersReducedMotion ? REDUCED_MOTION_VARIANT : titleCharSplit}
        initial="hidden"
        animate="visible"
        aria-label={title}
      >
        {prefersReducedMotion
          ? title
          : title.split('').map((ch, i) => (
              <motion.span
                key={i}
                variants={titleChar}
                style={{ display: 'inline-block', whiteSpace: ch === ' ' ? 'pre' : 'normal' }}
                aria-hidden
              >
                {ch}
              </motion.span>
            ))}
      </motion.h1>

      {tagline && (
        <motion.p
          className="project-detail-tagline"
          variants={prefersReducedMotion ? REDUCED_MOTION_VARIANT : taglineWordSplit}
          initial="hidden"
          animate="visible"
          aria-label={tagline}
        >
          {prefersReducedMotion
            ? tagline
            : tagline.split(/\s+/).map((word, i) => (
                <motion.span
                  key={i}
                  variants={taglineWord}
                  style={{ display: 'inline-block', marginRight: '0.25em' }}
                  aria-hidden
                >
                  {word}
                </motion.span>
              ))}
        </motion.p>
      )}

      {(project.liveUrl || project.githubUrl) && (
        <motion.div
          className="project-detail-ctas"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.65, ease: EASE }}
        >
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              {t('projectDetail.liveDemo')}
              <span className="btn-arrow">→</span>
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
            >
              {t('projectDetail.sourceCode')}
              <span className="btn-arrow">→</span>
            </a>
          )}
        </motion.div>
      )}

      {project.stats && project.stats.length > 0 && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.75, ease: EASE }}
        >
          <StatRow block={{ type: 'stat-row', stats: project.stats }} lang={lang} />
        </motion.div>
      )}
    </header>
  )
}
