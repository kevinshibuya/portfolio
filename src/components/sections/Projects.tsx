import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'

const FEATURED_LIMIT = 4

function getFeatured(): Project[] {
  return projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= FEATURED_LIMIT)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = getFeatured()

  return (
    <section id="projects" className="section project-section">
      <div className="project-grid">
        <aside className="project-aside">
          <div className="project-aside__mobile">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>
            <h2 className="project-aside__title-static">
              <Trans i18nKey="sections.projects.title" components={{ em: <em /> }} />
            </h2>
            <p className="project-aside__copy">{t('sections.projects.intro')}</p>
            <span className="project-aside__year">
              {String(featured.length).padStart(2, '0')} · projects
            </span>
          </div>
        </aside>

        <div className="project-list">
          {featured.map((project, idx) => (
            <ProjectRow key={project.id} project={project} index={idx} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface ProjectRowProps {
  project: Project
  index: number
  lang: 'en' | 'pt'
}

function ProjectRow({ project, index, lang }: ProjectRowProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])

  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div ref={mediaRef} className="project-row__media" style={{ background: project.gradient }}>
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            style={{ y: imgY }}
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}
