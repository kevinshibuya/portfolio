import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tag } from '../components/ui/Tag'
import { projects } from '../data/projects'

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'

  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <main
        className="section"
        style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
      >
        <h1 className="section-title" style={{ marginBottom: '16px' }}>
          {t('projectDetail.notFound')}
        </h1>
        <p className="section-desc" style={{ marginBottom: '32px' }}>
          {t('projectDetail.notFoundDescription')}
        </p>
        <Link to="/" className="btn btn--ghost" style={{ alignSelf: 'flex-start' }}>
          ← {t('projectDetail.back')}
        </Link>
      </main>
    )
  }

  return (
    <main className="section" style={{ paddingTop: '160px' }}>
      <Link
        to="/"
        className="btn btn--ghost"
        style={{ marginBottom: '48px' }}
      >
        ← {t('projectDetail.back')}
      </Link>

      <div
        style={{
          background: project.gradient ?? 'linear-gradient(145deg, #D4E5F2, #6A8CAA)',
          borderRadius: '18px',
          aspectRatio: '16 / 9',
          marginBottom: '40px',
          display: 'grid',
          placeItems: 'center',
          color: 'rgba(26, 21, 18, 0.2)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          textTransform: 'lowercase',
          fontSize: 'clamp(32px, 4vw, 56px)',
        }}
      >
        {project.title[lang]}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <h1 className="section-title" style={{ margin: 0 }}>
          {project.title[lang]}
        </h1>
        <span
          style={{
            fontSize: '13px',
            color: 'var(--bark)',
            textTransform: 'lowercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('projectDetail.year')}: {project.year}
        </span>
      </div>

      <p className="section-desc" style={{ marginBottom: '32px' }}>
        {project.description[lang]}
      </p>

      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--blue-400)',
            textTransform: 'lowercase',
            letterSpacing: '0.15em',
            marginBottom: '12px',
          }}
        >
          {t('projectDetail.stack')}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {project.techStack.map((tech) => (
            <Tag key={tech} label={tech.toLowerCase()} variant="pill" />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
      </div>
    </main>
  )
}
