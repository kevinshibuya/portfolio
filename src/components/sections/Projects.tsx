import { useRef, useState } from 'react'
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { GooeyTitle } from '../ui/GooeyTitle'
import { ProjectCardStack, type StackCardData } from '../ui/ProjectCardStack'
import { projects } from '../../data/projects'
import { segmentFor, settleFrac } from '../../utils/stackMotion'
import { accentFor, accentDeepFor } from '../../utils/palette'

export function Projects() {
  const { t, i18n } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'

  const featured = projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= 4)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
  const n = featured.length

  const cards: StackCardData[] = featured.map((p) => ({
    slug: p.slug,
    title: p.title[lang],
    subtitle: `${p.year} · ${p.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')}`,
    art: p.mockups?.stackCover,
    alt: `${p.title[lang]} preview`,
  }))

  const wrapperRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  })

  // The ONE scroll-derived visual channel: continuous 0..n-1, plateaus at integers.
  // EVERY per-frame card/title visual derives from this single MotionValue via pure
  // functions (cardStyleAt / spanMorph) — no React state in the visual path, so an
  // identity-state lag can no longer tear card/title rendering at a segment boundary.
  const segCont = useTransform(scrollYProgress, (p) => {
    const { index, frac } = segmentFor(p, n)
    return index + settleFrac(frac)
  })

  // Non-visual discrete state — flips a handful of times total, never per frame.
  const [frontIndex, setFrontIndex] = useState(0)

  // Why this setState is safe (re-render-kills-entrance lesson): nothing above the
  // pinned stage runs a whileInView(once) stagger that this could freeze — the
  // eyebrow is a static element, and every card/title visual derives from the
  // single MotionValue `segCont`, never from React state. The guard below skips
  // setState when the index is unchanged, so a full segment scrolls through with
  // zero re-renders once frontIndex settles; this state feeds ONLY non-visual
  // attrs (the interactive <Link>, aria, --row-tint/--row-tint-deep, staticTitle),
  // so its frame-lag can never tear the card/title flight.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const { index, frac } = segmentFor(p, n)
    const nextFront = prefersReducedMotion
      ? Math.min(Math.round(p * (n - 1)), n - 1) // RM: swap at segment midpoint
      : Math.min(index + (settleFrac(frac) >= 0.5 ? 1 : 0), n - 1) // scrub: at settle-midpoint
    setFrontIndex((c) => (c === nextFront ? c : nextFront))
  })

  // Resting title tracks frontIndex: it is the accessible name and the whole RM
  // render, and must swap with the cards at the settle-midpoint.
  const staticTitle = cards[frontIndex]?.title ?? ''

  const stageStyle = {
    '--row-tint': accentFor(frontIndex),
    '--row-tint-deep': accentDeepFor(frontIndex),
  } as React.CSSProperties & Record<'--row-tint' | '--row-tint-deep', string>

  return (
    <section id="projects" className="section projects-stack-section">
      {/* Keyboard/SR path: visually-hidden-until-focused project index, no scroll-jacking. */}
      <nav className="stack-skiplinks" aria-label={t('sections.projects.stack.indexLabel')}>
        {featured.map((p) => (
          <Link key={p.id} className="stack-skiplink" to={`/projects/${p.slug}`}>
            {p.title[lang]}
          </Link>
        ))}
      </nav>

      <div className="stack-scroll" ref={wrapperRef}>
        <div className="stack-sticky">
          <div className="stack-inner" style={stageStyle}>
            <p className="stack-eyebrow">
              <span className="stack-eyebrow-num">{t('sections.projects.index')}</span>
              <span aria-hidden="true"> · </span>
              {t('sections.projects.label')}
            </p>
            <GooeyTitle
              titles={cards.map((c) => c.title)}
              seg={segCont}
              staticTitle={staticTitle}
              reducedMotion={prefersReducedMotion}
            />
            <ProjectCardStack
              cards={cards}
              seg={segCont}
              interactiveIndex={frontIndex}
              reducedMotion={prefersReducedMotion}
              viewProjectLabel={t('sections.projects.stack.viewProject')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
