import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
  type Variants,
} from 'framer-motion'
import { useRef, useState } from 'react'
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
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

  const parentVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : staggerContainer(STAGGER_PRESETS.projectCards)
  const cardVariants = prefersReducedMotion
    ? REDUCED_MOTION_VARIANT
    : VARIANTS.cardReveal

  // Velocity "view project" cursor pill (desktop, motion-on only).
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { damping: 28, stiffness: 380, mass: 0.4 })
  const springY = useSpring(cursorY, { damping: 28, stiffness: 380, mass: 0.4 })
  const vx = useVelocity(springX)
  const rotate = useTransform(vx, [-2500, 2500], [18, -18], { clamp: true })
  const [hovering, setHovering] = useState(false)

  function handleMove(e: React.MouseEvent) {
    cursorX.set(e.clientX)
    cursorY.set(e.clientY)
  }

  return (
    <section
      id="projects"
      className="section"
      onMouseMove={prefersReducedMotion ? undefined : handleMove}
    >
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
            onHoverEnter={prefersReducedMotion ? undefined : () => setHovering(true)}
            onHoverLeave={prefersReducedMotion ? undefined : () => setHovering(false)}
          />
        ))}
      </motion.div>

      {!prefersReducedMotion && (
        <motion.div
          className="project-cursor"
          style={{ x: springX, y: springY }}
          aria-hidden="true"
        >
          <motion.div
            className="project-cursor__rotor"
            style={{ rotate }}
            animate={hovering ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="project-cursor__pill">{t('sections.projects.viewProject')}</span>
          </motion.div>
        </motion.div>
      )}
    </section>
  )
}

interface BentoCardProps {
  project: Project
  lang: 'en' | 'pt'
  caseStudy: string
  variants: Variants
  onHoverEnter?: () => void
  onHoverLeave?: () => void
}

function BentoCard({ project, lang, caseStudy, variants, onHoverEnter, onHoverLeave }: BentoCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  useCursorTilt(cardRef, wrapRef, { tilt: 10, scale: 1.08, shift: 8 })

  const { prefersReducedMotion } = useMotion()

  // Subtle scroll parallax on the (contain-fit) mockup. Targets the inner
  // `.bento-mockup` span — a different node than the tilt-driven imgs.
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  })
  const rawY = useTransform(scrollYProgress, [0, 1], ['-5%', '5%'])
  const mockupY = prefersReducedMotion ? undefined : rawY

  const sizeClass =
    project.size === 'lg'
      ? 'bento-card--lg'
      : project.size === 'md'
        ? 'bento-card--md'
        : ''
  const cardClass = `bento-card ${sizeClass}${project.dark ? ' is-dark' : ''}`.trim()
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
        className={cardClass}
        style={{ background }}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
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
              <MockupLayer src={project.mockups.desktopBento} alt={desktopAlt} y={mockupY} />
              <MockupLayer src={project.mockups.mobile} alt={mobileAlt} className="bento-mockup--mobile" y={mockupY} />
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
      className={cardClass}
      style={{ background }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {tagline && <span className="bento-desc-top">{tagline}</span>}
      <div ref={wrapRef} className="bento-mockup-wrap">
        {project.mockups && <MockupLayer src={project.mockups.desktopBento} alt={desktopAlt} y={mockupY} />}
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
  y?: MotionValue<string>
}

function MockupLayer({ src, alt, className, y }: MockupLayerProps) {
  return (
    <motion.span className={`bento-mockup ${className ?? ''}`} style={{ y }}>
      <img
        className="bento-mockup-img bento-mockup-img--tonal"
        src={src}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="lazy"
        width="1200"
        height="737"
      />
      <img
        className="bento-mockup-img bento-mockup-img--color"
        src={src}
        alt={alt}
        decoding="async"
        loading="lazy"
        width="1200"
        height="737"
      />
    </motion.span>
  )
}
