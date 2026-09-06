import { useCallback, useMemo, useRef, useState } from 'react'
import { useScroll } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SelectedWorkScene, type SceneCard } from '../canvas/SelectedWorkScene'
import { projects } from '../../data/projects'

const featured = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  // Nothing here tracks the scroll. The scene's frame loop reads the scroll
  // MotionValue and writes every visual itself; the settled card is reported
  // on the canvas element as `data-slot`, which nothing in React reads
  // (ADR 0011). The language switch is the ONLY thing that may re-render the
  // scene subtree, so `cards` is memoised on `lang` and that is the only
  // identity change the scene ever sees.
  const cards = useMemo<SceneCard[]>(
    () =>
      featured.map((p) => ({
        slug: p.slug,
        title: p.title[lang],
        subtitle: `${p.year} · ${p.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')}`,
        art: p.mockups?.stackCover ?? '',
        alt: `${p.title[lang]} preview`,
      })),
    [lang],
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  })

  const [ready, setReady] = useState(false)
  const [webglUnavailable, setWebglUnavailable] = useState(false)
  const handleReady = useCallback(() => setReady(true), [])
  const handleWebglUnavailable = useCallback(() => setWebglUnavailable(true), [])

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
        /* No WebGL2, or the context was lost: the four projects in normal
           flow, no pin. Permanent for the session (spec Q9). */
        <div className="scene-fallback">
          {cards.map((card) => (
            <article className="scene-fallback-card" key={card.slug}>
              {card.art ? (
                <span className="scene-fallback-frame">
                  <img src={card.art} alt={card.alt} width={1024} height={608} loading="lazy" />
                </span>
              ) : null}
              <div className="scene-fallback-body">
                <div className="scene-fallback-labels">
                  <p className="scene-fallback-name">{card.title}</p>
                  <p className="scene-fallback-subtitle">{card.subtitle}</p>
                </div>
                <Link className="scene-fallback-link" to={`/projects/${card.slug}`}>
                  <span>{t('sections.projects.stack.viewProject')}</span>
                  <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="scene-scroll" ref={wrapperRef}>
          <div className="scene-sticky">
            <div className="scene-inner">
              <div
                className="scene-canvas-wrap"
                aria-hidden="true"
                data-ready={ready ? 'true' : undefined}
              >
                <SelectedWorkScene
                  cards={cards}
                  progress={scrollYProgress}
                  reducedMotion={prefersReducedMotion}
                  onReady={handleReady}
                  onWebglUnavailable={handleWebglUnavailable}
                />
              </div>

              {/* Static: the section's name for assistive tech. The card in
                  the slot is on the canvas, never in the DOM (ADR 0011). */}
              <h2 className="scene-title-sr sr-only">{t('sections.projects.heading')}</h2>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
