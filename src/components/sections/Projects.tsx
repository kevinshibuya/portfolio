import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SectionHeading } from '../ui/SectionHeading'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { projects } from '../../data/projects'
import type { BentoSize, Project } from '../../types/content'

const sizeClasses: Record<BentoSize, string> = {
  lg: 'md:col-span-2 lg:col-span-2 lg:row-span-2 min-h-[260px] lg:min-h-[380px]',
  md: 'md:col-span-2 lg:col-span-2 min-h-[180px]',
  sm: 'md:col-span-1 lg:col-span-1 min-h-[180px]',
}

const titleSize: Record<BentoSize, string> = {
  lg: 'text-[32px] md:text-[40px] lg:text-[44px]',
  md: 'text-2xl md:text-[28px]',
  sm: 'text-xl md:text-[22px]',
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const gridRef = useRef<HTMLDivElement>(null)

  useScrollReveal(gridRef, {
    childSelector: '[data-project-card]',
    stagger: 0.12,
  })

  const featured = projects.filter((p) => p.featured)

  return (
    <section
      id="projects"
      className="relative max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-28 md:py-36"
    >
      <SectionHeading
        index={t('sections.projects.index')}
        label={t('sections.projects.label')}
        title={t('sections.projects.title')}
        description={t('sections.projects.description')}
        deps={[lang]}
      />

      <div
        ref={gridRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
      >
        {featured.map((project) => (
          <BentoCard key={project.id} project={project} lang={lang} csLabel={t('sections.projects.caseStudy')} />
        ))}
      </div>
    </section>
  )
}

interface BentoCardProps {
  project: Project
  lang: 'en' | 'pt'
  csLabel: string
}

function BentoCard({ project, lang, csLabel }: BentoCardProps) {
  const size: BentoSize = project.size ?? 'sm'
  const isDark = project.dark === true

  const taglineColor = isDark ? 'text-terra-200' : 'text-text'
  const titleColor = isDark ? 'text-text-light' : 'text-text'
  const linkColor = isDark ? 'text-text-light/80' : 'text-text/70'

  return (
    <motion.article
      data-project-card
      whileHover={{ y: -6 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative rounded-[18px] overflow-hidden border border-transparent hover:border-terra-200 shadow-none hover:shadow-[0_20px_40px_rgba(26,21,18,0.08)] transition-[border-color,box-shadow] duration-500 ${sizeClasses[size]}`}
      style={{ background: project.gradient ?? 'linear-gradient(145deg, #EDE0D6, #B09080)' }}
    >
      <Link
        to={`/projects/${project.slug}`}
        data-cursor-hover
        className="relative z-10 w-full h-full flex flex-col justify-between p-6 md:p-7"
      >
        {project.tagline && (
          <span
            className={`font-body font-semibold uppercase tracking-[0.08em] text-[11px] ${taglineColor}`}
          >
            {project.tagline[lang]}
          </span>
        )}

        <div className="flex flex-col gap-2 mt-auto">
          <h3
            className={`font-display font-semibold lowercase leading-[0.95] tracking-[-0.02em] ${titleSize[size]} ${titleColor}`}
          >
            {project.title[lang]}
          </h3>
          <span
            className={`inline-flex items-center gap-1.5 font-body text-[11px] font-medium lowercase ${linkColor}`}
          >
            <span className="inline-block transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              ↗
            </span>
            {csLabel}
          </span>
        </div>
      </Link>
    </motion.article>
  )
}
