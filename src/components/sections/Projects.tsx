import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useScroll } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { useLenisContext } from '../layout/SmoothScroll'
import { SelectedWorkScene, type SceneCard } from '../canvas/SelectedWorkScene'
import { webglProbe } from '../canvas/webglProbe'
import { projects } from '../../data/projects'
import {
  playheadFor,
  frontIndexFor,
  scrollTargetFor,
  SCENE_WRAPPER_SVH,
} from '../../utils/sceneMotion'

/** Used until the nav has been measured, and if it is ever missing. */
const NAV_FALLBACK_PX = 66

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

  // The nav's height, for the title band's ceiling. Measured here (the scene
  // may not touch the DOM beyond its canvas) and updated only when the integer
  // height changes, so it never re-renders the scene on its own.
  const [navPx, setNavPx] = useState(NAV_FALLBACK_PX)
  useEffect(() => {
    const nav = document.querySelector('header.nav')
    if (!nav) return
    const measure = () => {
      const next = Math.round(nav.getBoundingClientRect().height) || NAV_FALLBACK_PX
      setNavPx((current) => (current === next ? current : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  const [ready, setReady] = useState(false)
  // Seeded from the probe, not discovered by the scene a commit later: a wrapper
  // mounted for one commit is one Home's nav handoff can scroll to (webglProbe.ts).
  const [webglUnavailable, setWebglUnavailable] = useState(() => !webglProbe().supported)
  const handleReady = useCallback(() => setReady(true), [])
  const handleWebglUnavailable = useCallback(() => setWebglUnavailable(true), [])

  // A press on a card: the settled card opens its project; any other card is
  // scrolled into the slot. This lives here, in the Router root, because the
  // R3F Canvas is a separate React root that router context never crosses.
  // Scrolling goes THROUGH Lenis, which owns page scrolling; it is null under
  // reduced motion, which is exactly the instant case.
  const navigate = useNavigate()
  const lenis = useLenisContext()
  const cardClick = useRef((index: number): void => void index)
  cardClick.current = (index) => {
    const playhead = playheadFor(scrollYProgress.get())
    if (index === frontIndexFor(playhead, cards.length, prefersReducedMotion)) {
      navigate(`/projects/${cards[index].slug}`)
      return
    }
    travelTo(index)
  }

  // The ONE numeric travel. Every caller hands it a playhead and it resolves
  // the wrapper, so a clicked card and a focused card link cannot land in
  // different places.
  //
  // Lenis replaces the tween in flight rather than queueing (`Animate.fromTo`
  // overwrites from/to/currentTime on one instance), so a reader tabbing
  // quickly re-aims the same move instead of stacking four of them.
  function travelTo(playhead: number): void {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY
    const target = scrollTargetFor(playhead, wrapperTop, wrapper.offsetHeight, window.innerHeight)
    if (lenis) lenis.scrollTo(target, { duration: 1.2 })
    else window.scrollTo({ top: target, behavior: 'instant' })
  }

  // Stable identity: the scene subtree must only ever re-render on `cards`.
  const handleCardClick = useCallback((index: number) => cardClick.current(index), [])

  return (
    <section id="projects" className="section projects-scene-section">
      {/* Static: the section's name for assistive tech. The card in the slot
          is on the canvas, never in the DOM (ADR 0011). First in the section,
          so the no-WebGL fallback is named too. */}
      <h2 className="scene-title-sr sr-only">{t('sections.projects.heading')}</h2>

      {/* The keyboard and screen-reader path (ADR 0011): one visually hidden
          link per corridor card, in corridor order. A SIBLING of .scene-scroll,
          never inside .scene-sticky, whose sticky stacking context would paint
          the focused pill under the nav. Without WebGL the fallback cards carry
          the same links in flow, so these would only repeat them. */}
      {webglUnavailable ? null : (
        <ul className="scene-cardlinks">
          {cards.map((card, index) => (
            <li key={card.slug}>
              <Link
                className="scene-cardlink"
                to={`/projects/${card.slug}`}
                // Card `i` settles at playhead `i`: the travel a press on a
                // distant card makes, so Lenis eases it and reduced motion (no
                // Lenis) applies it at once. Focus never writes into hover.
                onFocus={() => travelTo(index)}
              >
                {card.title}
              </Link>
            </li>
          ))}
        </ul>
      )}

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
      ) : null}

      {webglUnavailable ? null : (
        <div
          className="scene-scroll"
          ref={wrapperRef}
          style={{ height: `${SCENE_WRAPPER_SVH}svh` }}
          data-svh={SCENE_WRAPPER_SVH}
        >
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
                  onCardClick={handleCardClick}
                  navPx={navPx}
                  overture={t('sections.projects.overture')}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
