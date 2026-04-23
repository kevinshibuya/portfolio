import { useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tag } from '../components/ui/Tag'
import { useScrollReveal } from '../hooks/useScrollReveal'
import { projects } from '../data/projects'

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const contentRef = useRef<HTMLDivElement>(null)

  useScrollReveal(contentRef)

  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-text mb-4">
          {t('projectDetail.notFound')}
        </h1>
        <p className="font-body text-text-muted mb-8">
          {t('projectDetail.notFoundDescription')}
        </p>
        <Link
          to="/"
          data-cursor-hover
          className="font-body text-sm text-accent hover:text-text transition-colors duration-200"
        >
          &larr; {t('projectDetail.back')}
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen pt-32 pb-24 px-6 md:px-12 lg:px-24">
      <div ref={contentRef} className="max-w-4xl">
        {/* Back link */}
        <Link
          to="/"
          data-cursor-hover
          className="inline-flex items-center gap-2 font-body text-sm text-text-muted hover:text-text transition-colors duration-200 mb-12"
        >
          <span>&larr;</span>
          {t('projectDetail.back')}
        </Link>

        {/* Cover placeholder */}
        <div className="bg-bg-elevated rounded-2xl aspect-video mb-10 flex items-center justify-center">
          <span className="font-display text-3xl md:text-4xl text-text-muted/20 font-bold">
            {project.title[lang]}
          </span>
        </div>

        {/* Title + year */}
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-6">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-text">
            {project.title[lang]}
          </h1>
          <span className="font-body text-sm text-text-muted">
            {t('projectDetail.year')}: {project.year}
          </span>
        </div>

        {/* Description */}
        <p className="font-body text-base text-text-muted leading-relaxed max-w-2xl mb-8">
          {project.description[lang]}
        </p>

        {/* Tech stack */}
        <div className="mb-8">
          <h2 className="font-body text-xs tracking-[0.3em] uppercase text-text-muted mb-3">
            {t('projectDetail.stack')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.techStack.map((tech) => (
              <Tag key={tech} label={tech} variant="muted" />
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor-hover
              className="font-body text-sm text-accent hover:text-text transition-colors duration-200"
            >
              {t('projectDetail.liveDemo')} &rarr;
            </a>
          )}
          {project.githubUrl && (
            <a
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor-hover
              className="font-body text-sm text-text-muted hover:text-text transition-colors duration-200"
            >
              {t('projectDetail.sourceCode')} &rarr;
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
