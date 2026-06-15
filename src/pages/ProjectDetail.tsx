import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { projects } from '../data/projects'
import { useLenis } from '../hooks/useLenis'
import { setPageMeta, resetPageMeta } from '../utils/pageMeta'
import { Hero } from '../components/projectDetail/Hero'
import { ScrollCue } from '../components/projectDetail/ScrollCue'
import { StackSection } from '../components/projectDetail/StackSection'
import { Pitch } from '../components/projectDetail/Pitch'
import { MockupFrame } from '../components/projectDetail/MockupFrame'
import { WhatShipped } from '../components/projectDetail/WhatShipped'
import { MobileTrickRow } from '../components/projectDetail/MobileTrickRow'

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

  useEffect(() => {
    if (!project) return
    setPageMeta(
      `${project.title[lang]} · kevin shibuya`,
      project.description[lang],
    )
    return resetPageMeta
  }, [project, lang])

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
        <ScrollCue />

        <Pitch text={project.pitch} lang={lang} />
        {project.mockups?.desktop && (
          <MockupFrame
            src={project.mockups.desktop}
            variant="desktop"
            alt={`${project.title[lang]} desktop mockup`}
          />
        )}
        {project.whatShipped && (
          <WhatShipped text={project.whatShipped} lang={lang} />
        )}
        {project.mockups?.mobile && project.trick && (
          <MobileTrickRow
            mobileSrc={project.mockups.mobile}
            trick={project.trick}
            lang={lang}
            alt={`${project.title[lang]} mobile mockup`}
          />
        )}
        <StackSection project={project} />
      </section>

      <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
        <Contact showSectionIndex={false} />
        <Footer />
      </Suspense>
    </main>
  )
}
