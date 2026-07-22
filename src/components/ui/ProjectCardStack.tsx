import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cardStyleAt, depthTransform } from '../../utils/stackMotion'

export interface StackCardData {
  slug: string
  title: string
  art?: string
  alt: string
}

export interface ProjectCardStackProps {
  cards: StackCardData[]
  /** Continuous scroll-derived channel (0..n-1, plateaus at integers) — the SINGLE
      source for every per-frame card visual (y/scale/opacity/shadow/zIndex). */
  seg: MotionValue<number>
  /** Which card is the interactive <Link> (= frontIndex). Non-visual: it selects the
      link/aria/CTA card and may lag the scrub a frame harmlessly (state, not the visual path). */
  interactiveIndex: number
  reducedMotion: boolean
  viewProjectLabel: string
}

function CardArt({ card, eager }: { card: StackCardData; eager: boolean }): React.ReactElement {
  return card.art ? (
    <img
      src={card.art}
      alt={card.alt}
      width={1024}
      height={608}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  ) : (
    <span className="stack-card-fallback" aria-hidden="true" />
  )
}

// Shared face: interactive card is the <Link>; buried cards are inert + hidden.
function CardFace({
  card,
  interactive,
  eager,
  viewProjectLabel,
}: {
  card: StackCardData
  interactive: boolean
  eager: boolean
  viewProjectLabel: string
}): React.ReactElement {
  const inner = (
    <>
      <CardArt card={card} eager={eager} />
      {interactive && (
        <span className="stack-card-bar">
          <span className="stack-card-cta">{viewProjectLabel}</span>
          <span className="stack-card-arrow" aria-hidden="true">↗</span>
        </span>
      )}
    </>
  )
  return interactive ? (
    <Link className="stack-card-link" to={`/projects/${card.slug}`} aria-label={card.title}>
      {inner}
    </Link>
  ) : (
    <div className="stack-card-inert" aria-hidden="true" tabIndex={-1}>
      {inner}
    </div>
  )
}

// Scrub slot: EVERY visual derives from `seg` via the pure `cardStyleAt`. Identity
// (which project this card is) is fixed by the parent key and never re-assigned, so
// a fast-scrub boundary can no longer render the old identity at reset transforms.
function ScrubCardSlot({
  index,
  card,
  interactive,
  eager,
  seg,
  viewProjectLabel,
}: {
  index: number
  card: StackCardData
  interactive: boolean
  eager: boolean
  seg: MotionValue<number>
  viewProjectLabel: string
}): React.ReactElement {
  // Spec motion table: fine-pointer hover on the interactive card scales ≤1.02,
  // <100ms response, via MotionValues (no setState). Composed multiplicatively so
  // the scrub scale and the hover scale never fight over one transform channel.
  const hoverTarget = useMotionValue(1)
  const hoverScale = useSpring(hoverTarget, { stiffness: 550, damping: 38 })

  const y = useTransform(seg, (s) => cardStyleAt(index - s).y)
  const scale = useTransform(
    [seg, hoverScale] as [MotionValue<number>, MotionValue<number>],
    ([s, h]: number[]) => cardStyleAt(index - s).scale * h,
  )
  const opacity = useTransform(seg, (s) => cardStyleAt(index - s).opacity)
  const boxShadow = useTransform(seg, (s) => {
    const sh = cardStyleAt(index - s).shadow
    return `0 ${(18 * sh).toFixed(1)}px ${(40 * sh).toFixed(1)}px rgba(0,0,0,${(0.45 * sh).toFixed(3)})`
  })
  // Exiting card stays on top during flight (rel < 0 → max(rel,0) = 0 → z 10); once
  // parked it is opacity-0, so the terminal band is clean.
  const zIndex = useTransform(seg, (s) => Math.round(10 - Math.max(index - s, 0)))

  const style = { y, scale, opacity, boxShadow, zIndex } as unknown as React.CSSProperties
  const className = `stack-card${interactive ? '' : ' stack-card--buried'}`
  return (
    <motion.div
      className={className}
      style={style}
      onHoverStart={interactive ? () => hoverTarget.set(1.02) : undefined}
      onHoverEnd={interactive ? () => hoverTarget.set(1) : undefined}
    >
      <CardFace card={card} interactive={interactive} eager={eager} viewProjectLabel={viewProjectLabel} />
    </motion.div>
  )
}

// Reduced-motion slot: static geometry from the settled depth grammar, no MotionValues,
// no transforms driven by scroll — windowed 3-slot render (see parent), no tear surface.
function StaticCardSlot({
  depth,
  card,
  interactive,
  eager,
  viewProjectLabel,
}: {
  depth: number
  card: StackCardData
  interactive: boolean
  eager: boolean
  viewProjectLabel: string
}): React.ReactElement {
  const rest = depthTransform(depth, 0)
  const style: React.CSSProperties = {
    transform: `translateY(${rest.y}px) scale(${rest.scale})`,
    opacity: rest.opacity,
    zIndex: 10 - depth,
  }
  const className = `stack-card${interactive ? '' : ' stack-card--buried'}`
  return (
    <motion.div className={className} style={style}>
      <CardFace card={card} interactive={interactive} eager={eager} viewProjectLabel={viewProjectLabel} />
    </motion.div>
  )
}

export function ProjectCardStack({
  cards,
  seg,
  interactiveIndex,
  reducedMotion,
  viewProjectLabel,
}: ProjectCardStackProps): React.ReactElement {
  if (reducedMotion) {
    // Static depths 0–2 from the front (interactiveIndex) origin; interactive = front.
    return (
      <div className="stack-cards">
        {[0, 1, 2].map((depth) => {
          const card = cards[interactiveIndex + depth]
          if (!card) return null
          return (
            <StaticCardSlot
              key={card.slug}
              depth={depth}
              card={card}
              interactive={depth === 0}
              eager={depth === 0}
              viewProjectLabel={viewProjectLabel}
            />
          )
        })}
      </div>
    )
  }

  // Scrub: render ALL cards, identity keyed by slug (never re-assigned). Only the
  // interactive card is the <Link>; the rest are inert (buried), parked ones opacity-0.
  return (
    <div className="stack-cards">
      {cards.map((card, i) => (
        <ScrubCardSlot
          key={card.slug}
          index={i}
          card={card}
          interactive={i === interactiveIndex}
          eager={i === 0}
          seg={seg}
          viewProjectLabel={viewProjectLabel}
        />
      ))}
    </div>
  )
}
