import { useCallback, useRef, useState } from 'react'
import { useScroll, useMotionValueEvent } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SelectedWorkScene } from '../canvas/SelectedWorkScene'
import { projects } from '../../data/projects'
import { playheadFor, frontIndexFor } from '../../utils/sceneMotion'
import { accentFor, accentDeepFor } from '../../utils/palette'

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
  const n = featured.length

  const cards = featured.map((p) => ({
    slug: p.slug,
    title: p.title[lang],
    subtitle: `${p.year} · ${p.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')}`,
    art: p.mockups?.stackCover ?? '',
    alt: `${p.title[lang]} preview`,
  }))

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  })

  // Non-visual discrete state — flips a handful of times across the whole
  // section, never per frame. It feeds ONLY the interactive <Link>, aria, the
  // SR heading and the row tints; every visual derives from the scroll
  // MotionValue inside the scene's frame loop, so this can never tear the
  // camera or the morph by lagging a frame behind (ADR 0010).
  const [frontIndex, setFrontIndex] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = frontIndexFor(playheadFor(p), n, prefersReducedMotion)
    setFrontIndex((current) => (current === next ? current : next))
  })

  const overlayRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLAnchorElement>(null)

  const [ready, setReady] = useState(false)
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const handleReady = useCallback(() => setReady(true), [])
  const handleWebglUnavailable = useCallback(() => setWebglUnavailable(true), [])

  const front = cards[frontIndex]

  const stageStyle = {
    '--row-tint': accentFor(frontIndex),
    '--row-tint-deep': accentDeepFor(frontIndex),
  } as React.CSSProperties & Record<'--row-tint' | '--row-tint-deep', string>

  return (
    <section id="projects" className="section projects-scene-section">
      {/* Keyboard/SR path: visually-hidden-until-focused project index, no scroll-jacking. */}
      <nav className="scene-skiplinks" aria-label={t('sections.projects.stack.indexLabel')}>
        {featured.map((p) => (
          <Link key={p.id} className="scene-skiplink" to={`/projects/${p.slug}`}>
            {p.title[lang]}
          </Link>
        ))}
      </nav>

      {webglUnavailable ? (
        <div className="scene-fallback">
          <ul>
            {cards.map((card) => (
              <li key={card.slug}>
                <Link className="scene-fallback-link" to={`/projects/${card.slug}`}>
                  {card.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="scene-scroll" ref={wrapperRef}>
          <div className="scene-sticky">
            <div className="scene-inner" style={stageStyle}>
              <div
                className="scene-canvas-wrap"
                aria-hidden="true"
                data-ready={ready ? 'true' : undefined}
              >
                <SelectedWorkScene
                  covers={cards.map((c) => c.art)}
                  progress={scrollYProgress}
                  reducedMotion={prefersReducedMotion}
                  overlayRef={overlayRef}
                  pillRef={pillRef}
                  onReady={handleReady}
                  onWebglUnavailable={handleWebglUnavailable}
                />
              </div>

              <p className="scene-eyebrow">
                <span className="scene-eyebrow-num">{t('sections.projects.index')}</span>
                <span aria-hidden="true"> · </span>
                {t('sections.projects.label')}
              </p>

              <h2 className="scene-title-sr sr-only">{front?.title ?? ''}</h2>

              {/* Rides the front card's projected body band; the rig writes its
                  transform and opacity every frame, this only holds content. */}
              <div className="scene-meta" ref={overlayRef}>
                <div className="scene-meta-labels">
                  <p className="scene-meta-name">{front?.title ?? ''}</p>
                  <p className="scene-meta-subtitle">{front?.subtitle ?? ''}</p>
                </div>
                <Link className="scene-meta-pill" ref={pillRef} to={`/projects/${front?.slug ?? ''}`}>
                  <span className="scene-meta-pill-label">
                    {t('sections.projects.stack.viewProject')}
                  </span>
                  <span className="scene-meta-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
