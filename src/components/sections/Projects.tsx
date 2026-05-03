import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { projects } from '../../data/projects'
import {
  VARIANTS,
  STAGGER_PRESETS,
  staggerContainer,
  REDUCED_MOTION_VARIANT,
} from '../../utils/animations'
import type { Project } from '../../types/content'

const MotionLink = motion.create(Link)

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language as 'en' | 'pt'
  const featured = projects.filter((p) => p.featured)

  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(STAGGER_PRESETS.projectCards)
  const cardVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS.cardReveal

  return (
    <section id="projects" className="section">
      <SectionHeading
        index={t('sections.projects.index')}
        label={t('sections.projects.label')}
        title={t('sections.projects.title')}
        description={t('sections.projects.description')}
      />

      <motion.div
        className="bento section-spacing-content"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={parentVariants}
      >
        {featured.map((project) => (
          <BentoCard
            key={project.id}
            project={project}
            lang={lang}
            caseStudy={t('sections.projects.caseStudy')}
            variants={cardVariants}
          />
        ))}
      </motion.div>
    </section>
  )
}

interface BentoCardProps {
  project: Project
  lang: 'en' | 'pt'
  caseStudy: string
  variants: import('framer-motion').Variants
}

function BentoCard({ project, lang, caseStudy, variants }: BentoCardProps) {
  const sizeClass =
    project.size === 'lg'
      ? 'bento-card--lg'
      : project.size === 'md'
        ? 'bento-card--md'
        : ''
  const darkClass = project.dark ? ' is-dark' : ''

  return (
    <MotionLink
      variants={variants}
      to={`/projects/${project.slug}`}
      className={`bento-card ${sizeClass}${darkClass}`}
      style={{
        background:
          project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
      }}
    >
      {project.tagline && (
        <span className="bento-desc-top">{project.tagline[lang]}</span>
      )}

      <div className="bento-bottom">
        <h3 className="bento-title">{project.title[lang]}</h3>
        <span className="bento-cs">↗ {caseStudy}</span>
      </div>
    </MotionLink>
  )
}
