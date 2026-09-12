import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionValue, useScroll } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { useLenisContext } from '../layout/SmoothScroll'
import { SelectedWorkScene, type SceneCard } from '../canvas/SelectedWorkScene'
import { projects } from '../../data/projects'
import {
  playheadFor,
  frontIndexFor,
  scrollTargetFor,
  actOneSeg,
  actTwoProgress,
  blockIndexAt,
  sceneWrapperSvh,
} from '../../utils/sceneMotion'
import { friezeLayout, friezeExtent, FRIEZE_ROWS } from '../../utils/friezeLayout'
import { cellFor, playheadForItem } from '../../utils/friezeTargets'
import { archive } from '../../data/archive'
import { Stream } from './Stream'

/** Used until the nav has been measured, and if it is ever missing. */
const NAV_FALLBACK_PX = 66

const featured = projects
  .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
  .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  // The frieze's extent, and the wrapper height that follows from it. Static:
  // six rows in BOTH orientations (amended decision 15), so no aspect key
  // here or in pipeline 2, and a resize never changes the wrapper's height.
  // ONE packing: the wrapper's height, the camera's framing, the wall's raster
  // and its hit test all read the same object, so they cannot disagree about
  // how wide the archive is.
  const layout = useMemo(() => friezeLayout(archive, FRIEZE_ROWS), [])
  const frieze = useMemo(() => friezeExtent(layout, FRIEZE_ROWS), [layout])
  const svh = sceneWrapperSvh(frieze.columns)

  // Nothing here tracks the scroll. The scene's frame loop reads the scroll
  // MotionValue and writes every visual itself; the settled card is reported
  // on the canvas element as `data-slot`, which nothing in React reads
  // (ADR 0011). The language switch is the ONLY thing that may re-render the
  // scene subtree, so `cards` is memoised on `lang` and that is the only
  // identity change the scene ever sees. `frieze` and `allWork` are the two
  // other identities the scene sees, and both change only with data or
  // language.
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
  const [webglUnavailable, setWebglUnavailable] = useState(false)
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
    const playhead = playheadFor(scrollYProgress.get(), frieze.columns)
    const seg = actOneSeg(playhead)
    if (index === frontIndexFor(seg, cards.length, prefersReducedMotion)) {
      navigate(`/projects/${cards[index].slug}`)
      return
    }
    travelTo(index)
  }

  // The ONE numeric travel. Every caller hands it a playhead and it resolves
  // the wrapper, so a clicked card, a clicked cell and a focused stream row
  // cannot land in different places. `columns` is ALWAYS passed: its default of
  // 0 maps the playhead through act one alone, which would scroll the reader to
  // a card slot, silently and without a type error.
  //
  // Lenis replaces the tween in flight rather than queueing (`Animate.fromTo`
  // overwrites from/to/currentTime on one instance), so a reader tabbing
  // quickly re-aims the same move instead of stacking 171 of them.
  function travelTo(playhead: number): void {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY
    const target = scrollTargetFor(
      playhead,
      wrapperTop,
      wrapper.offsetHeight,
      window.innerHeight,
      frieze.columns,
    )
    if (lenis) lenis.scrollTo(target, { duration: 1.2 })
    else window.scrollTo({ top: target, behavior: 'instant' })
  }

  /** Park the reading cursor on an archive item. Unknown id: do nothing. */
  function scrollToItem(itemId: string): void {
    const playhead = playheadForItem(itemId, layout, frieze)
    if (playhead === null) return
    travelTo(playhead)
  }
  // Stable identity: the scene subtree must only ever re-render on `cards`.
  const handleCardClick = useCallback((index: number) => cardClick.current(index), [])

  // Where a wall cell leads. A case study is a route; an Embed is the
  // publisher's own page, opened SYNCHRONOUSLY — a popup opened after an await
  // has lost the trusted click stack and the browser blocks it. An id the
  // archive does not hold does nothing rather than guessing at one.
  const cellClick = useRef<(itemId: string) => void>(() => {})
  cellClick.current = (itemId: string) => {
    const item = archive.find((piece) => piece.id === itemId)
    if (!item) return
    if (item.caseStudy) {
      navigate(`/projects/${item.caseStudy.slug}`)
      return
    }
    // The href goes out exactly as the archive stores it, `#:~:text=` and all.
    window.open(item.href, '_blank', 'noopener')
  }

  // Focus is its own channel and never writes into hover: hovering is a mouse
  // idea, and voicing a stale id through aria-live would be worse than silence
  // (issue #20). The stream does not consume `onCellHover` at all.
  const rowFocus = useRef<(itemId: string) => void>(() => {})
  rowFocus.current = (itemId: string) => {
    // Debugging only. The acceptance is the scroll position, not this.
    document.getElementById('archive')?.setAttribute('data-focus-target', itemId)
    const cell = cellFor(itemId, layout)
    if (!cell) return
    // Only a DIFFERENT year moves the camera. Holding Tab through 171 rows
    // otherwise queues a move per keystroke, and every row inside the block
    // already in frame is one the reader can see.
    const playhead = playheadFor(scrollYProgress.get(), frieze.columns)
    if (cell.block === blockIndexAt(actTwoProgress(playhead), frieze)) return
    scrollToItem(itemId)
  }
  const handleRowFocus = useCallback((itemId: string) => rowFocus.current(itemId), [])

  // Hover rides a MotionValue, never state: the pointer crosses 171 cells, and
  // a re-render per cell would drive the scene's whole subtree from the
  // pointer (ADR 0010). Pipeline 3's stream reads its focus target from here.
  const hoveredCell = useMotionValue<string | null>(null)

  // Stable identities, as onCardClick already keeps: the scene subtree must
  // only ever re-render on `cards`.
  const handleCellClick = useCallback((itemId: string) => cellClick.current(itemId), [])
  const handleCellHover = useCallback(
    (itemId: string | null) => hoveredCell.set(itemId),
    [hoveredCell],
  )

  return (
    <section id="projects" className="section projects-scene-section">
      {/* The keyboard/SR path, in the slot the four skip links used to hold: a
          SIBLING of .scene-scroll, never inside .scene-sticky, whose sticky
          stacking context would paint the focused pill under the nav. It
          absorbs the skip links — the four projects are archive items too, so
          they are rows here like everything else. */}
      {webglUnavailable ? null : <Stream mode="hidden" onRowFocus={handleRowFocus} />}

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
      {webglUnavailable ? <Stream mode="visible" /> : null}

      {webglUnavailable ? null : (
        <div
          className="scene-scroll"
          ref={wrapperRef}
          style={{ height: `${svh}svh` }}
          data-svh={svh}
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
                  frieze={frieze}
                  friezeLayout={layout}
                  archive={archive}
                  lang={lang}
                  onCellClick={handleCellClick}
                  onCellHover={handleCellHover}
                  allWork={t('sections.archive.title')}
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
