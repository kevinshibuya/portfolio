import { useRef, useState } from 'react'
import { useScroll, useTransform, useMotionValueEvent } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { SectionHeading } from '../ui/SectionHeading'
import { GooeyTitle } from '../ui/GooeyTitle'
import { ProjectCardStack, type StackCardData } from '../ui/ProjectCardStack'
import { projects } from '../../data/projects'
import { segmentFor, settleFrac } from '../../utils/stackMotion'
import { accentFor } from '../../utils/palette'

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
    art: p.mockups?.desktopBento,
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

  // Why this setState is safe (re-render-kills-entrance lesson): the SectionHeading
  // entrance (whileInView, once) sits ABOVE the pinned stage and completes before the
  // user scrolls into the scrub; the stack cards animate off MotionValues, never
  // whileInView — so a segment-index setState here cannot freeze an in-flight entrance
  // stagger. The guard below skips setState when the index is unchanged, so a full
  // segment scrolls through with zero re-renders once frontIndex has settled. And since
  // all visuals are single-channel (segCont), this state now feeds ONLY non-visual attrs
  // (the interactive <Link>, aria, meta text, --row-tint, staticTitle) — its frame-lag
  // can no longer tear the card/title flight.
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const { index, frac } = segmentFor(p, n)
    const nextFront = prefersReducedMotion
      ? Math.min(Math.round(p * (n - 1)), n - 1) // RM: swap at segment midpoint
      : Math.min(index + (settleFrac(frac) >= 0.5 ? 1 : 0), n - 1) // scrub: at settle-midpoint
    setFrontIndex((c) => (c === nextFront ? c : nextFront))
  })

  const front = featured[frontIndex]
  // Resting title tracks frontIndex: it is the accessible name and the whole RM
  // render, and must swap with the cards/meta at the settle-midpoint.
  const staticTitle = cards[frontIndex]?.title ?? ''

  const metaTech = front.techStack.slice(0, 2).map((s) => s.toLowerCase()).join(' · ')
  const paddedFront = String(frontIndex + 1).padStart(2, '0')
  const paddedTotal = String(n).padStart(2, '0')

  const stageStyle = { '--row-tint': accentFor(frontIndex) } as React.CSSProperties &
    Record<'--row-tint', string>

  return (
    <section id="projects" className="section projects-stack-section">
      <SectionHeading
        index={t('sections.projects.index')}
        label={t('sections.projects.label')}
        title={t('sections.projects.title')}
        description={t('sections.projects.description')}
      />

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
            <GooeyTitle
              titles={cards.map((c) => c.title)}
              seg={segCont}
              staticTitle={staticTitle}
              reducedMotion={prefersReducedMotion}
            />
            <p className="stack-meta">
              <span className="num">{paddedFront}</span> / {paddedTotal} · {front.year} · {metaTech}
            </p>
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
