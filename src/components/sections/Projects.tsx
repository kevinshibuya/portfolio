import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { useCursorTilt } from '../../hooks/useCursorTilt'
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
  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

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
  const cardRef = useRef<HTMLAnchorElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 })

  const sizeClass =
    project.size === 'lg'
      ? 'bento-card--lg'
      : project.size === 'md'
        ? 'bento-card--md'
        : ''
  const isDual = project.size === 'md'
  const background = project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)'

  const tagline = project.tagline?.[lang]
  const title = project.title[lang]
  const desktopAlt = `${title} desktop mockup`
  const mobileAlt = `${title} mobile mockup`

  if (isDual) {
    return (
      <MotionLink
        ref={cardRef}
        variants={variants}
        to={`/projects/${project.slug}`}
        className={`bento-card ${sizeClass}`}
        style={{ background }}
      >
        <div className="bento-text-col">
          {tagline && <span className="bento-desc-top">{tagline}</span>}
          <div className="bento-bottom">
            <h3 className="bento-title">{title}</h3>
            <span className="bento-cs">↗ {caseStudy}</span>
          </div>
        </div>
        <div ref={wrapRef} className="bento-mockup-wrap bento-mockup-wrap--dual">
          {project.mockups && (
            <>
              <MockupLayer src={project.mockups.desktop} alt={desktopAlt} />
              <MockupLayer src={project.mockups.mobile} alt={mobileAlt} className="bento-mockup--mobile" />
            </>
          )}
        </div>
      </MotionLink>
    )
  }

  return (
    <MotionLink
      ref={cardRef}
      variants={variants}
      to={`/projects/${project.slug}`}
      className={`bento-card ${sizeClass}`}
      style={{ background }}
    >
      {tagline && <span className="bento-desc-top">{tagline}</span>}
      <div ref={wrapRef} className="bento-mockup-wrap">
        {project.mockups && <MockupLayer src={project.mockups.desktop} alt={desktopAlt} />}
      </div>
      <div className="bento-bottom">
        <h3 className="bento-title">{title}</h3>
        <span className="bento-cs">↗ {caseStudy}</span>
      </div>
    </MotionLink>
  )
}

interface MockupLayerProps {
  src: string
  alt: string
  className?: string
}

function MockupLayer({ src, alt, className }: MockupLayerProps) {
  return (
    <span className={`bento-mockup ${className ?? ''}`}>
      <img className="bento-mockup-img bento-mockup-img--tonal" src={src} alt="" aria-hidden />
      <img className="bento-mockup-img bento-mockup-img--color" src={src} alt={alt} loading="lazy" decoding="async" />
    </span>
  )
}
