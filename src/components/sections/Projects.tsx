import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RevealOnView, childVariants } from '../ui/RevealOnView'
import { SectionHeading } from '../ui/SectionHeading'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'

// Wrap react-router's Link with framer-motion so the bento card itself is the
// grid item — wrapping it in a motion.div instead would put `.bento-card--lg/--md`
// grid-spans on a grandchild, collapsing the bento layout to uniform 1×1 tiles.
const MotionLink = motion.create(Link)

export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const featured = projects.filter((p) => p.featured)

  return (
    <section id="projects" className="section">
      <RevealOnView variant="fade-up">
        <SectionHeading
          index={t('sections.projects.index')}
          label={t('sections.projects.label')}
          title={t('sections.projects.title')}
          description={t('sections.projects.description')}
        />
      </RevealOnView>

      <RevealOnView variant="stagger-children" staggerAmount={0.06} className="bento">
        {featured.map((project) => (
          <BentoCard
            key={project.id}
            project={project}
            lang={lang}
            caseStudy={t('sections.projects.caseStudy')}
          />
        ))}
      </RevealOnView>
    </section>
  )
}

interface BentoCardProps {
  project: Project
  lang: 'en' | 'pt'
  caseStudy: string
}

function BentoCard({ project, lang, caseStudy }: BentoCardProps) {
  const sizeClass =
    project.size === 'lg'
      ? 'bento-card--lg'
      : project.size === 'md'
        ? 'bento-card--md'
        : ''
  const darkClass = project.dark ? ' is-dark' : ''

  return (
    <MotionLink
      variants={childVariants}
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
