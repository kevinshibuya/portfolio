import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projects } from '../data/projects'
import { useLenis } from '../hooks/useLenis'
import { Hero } from '../components/projectDetail/Hero'
import { ScrollCue } from '../components/projectDetail/ScrollCue'
import { BlockRenderer } from '../components/projectDetail/BlockRenderer'
import { StackSection } from '../components/projectDetail/StackSection'
import { Footnotes } from '../components/projectDetail/Footnotes'
import { RouteList } from '../components/projectDetail/blocks/RouteList'

const Contact = lazy(() =>
  import('../components/sections/Contact').then((m) => ({ default: m.Contact }))
)
const Footer = lazy(() =>
  import('../components/layout/Footer').then((m) => ({ default: m.Footer }))
)

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const { scrollTo } = useLenis()

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    scrollTo(0, { immediate: true, force: true })
  }, [scrollTo])

  useEffect(() => {
    const warm = () => {
      void import('../components/sections/Contact')
      void import('../components/layout/Footer')
    }
    const ric = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }).requestIdleCallback
    if (typeof ric === 'function') {
      ric(warm, { timeout: 2000 })
    } else {
      setTimeout(warm, 0)
    }
  }, [])

  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <main>
        <section
          className="section"
          style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
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
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="section">
        <Hero project={project} lang={lang} />

        {project.story && project.story.length > 0 && (
          <>
            <ScrollCue />
            <div className="project-detail-story">
              <BlockRenderer blocks={project.story} project={project} lang={lang} />
            </div>
          </>
        )}

        <StackSection project={project} />

        {project.routes && project.routes.length > 0 && (
          <div className="project-detail-story">
            <RouteList
              block={{
                type: 'route-list',
                routes: project.routes,
                collapsible: project.routes.length > 8,
              }}
              lang={lang}
            />
          </div>
        )}

        <Footnotes project={project} />
      </section>

      <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
        <Contact />
        <Footer />
      </Suspense>
    </main>
  )
}
