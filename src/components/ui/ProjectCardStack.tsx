import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Link } from 'react-router-dom'
import { depthTransform } from '../../utils/stackMotion'

export interface StackCardData {
  slug: string
  title: string
  art?: string
  alt: string
}

export interface ProjectCardStackProps {
  cards: StackCardData[]
  baseIndex: number
  frontIndex: number
  interactiveDepth: number
  progress: MotionValue<number>
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

interface SlotProps {
  depth: number
  card: StackCardData
  interactive: boolean
  eager: boolean
  progress: MotionValue<number>
  reducedMotion: boolean
  viewProjectLabel: string
}

function CardSlot({
  depth,
  card,
  interactive,
  eager,
  progress,
  reducedMotion,
  viewProjectLabel,
}: SlotProps): React.ReactElement {
  // Hooks run unconditionally; RM ignores the MotionValues via inline transform.
  const y = useTransform(progress, (p) => depthTransform(depth, p).y)
  // Spec motion table: fine-pointer hover on the interactive card scales ≤1.02,
  // <100ms response, via MotionValues (no setState). Composed multiplicatively so
  // the scrub scale and the hover scale never fight over one transform channel.
  const hoverTarget = useMotionValue(1)
  const hoverScale = useSpring(hoverTarget, { stiffness: 550, damping: 38 })
  const scale = useTransform(
    [progress, hoverScale] as [MotionValue<number>, MotionValue<number>],
    ([p, h]: number[]) => depthTransform(depth, p).scale * h,
  )
  const opacity = useTransform(progress, (p) => depthTransform(depth, p).opacity)
  const boxShadow = useTransform(progress, (p) => {
    const s = depthTransform(depth, p).shadow
    return `0 ${(18 * s).toFixed(1)}px ${(40 * s).toFixed(1)}px rgba(0,0,0,${(0.45 * s).toFixed(3)})`
  })

  const rest = depthTransform(depth, 0)
  const zIndex = 10 - depth
  const style: React.CSSProperties = reducedMotion
    ? {
        transform: `translateY(${rest.y}px) scale(${rest.scale})`,
        opacity: rest.opacity,
        zIndex,
      }
    : ({ y, scale, opacity, boxShadow, zIndex } as unknown as React.CSSProperties)

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

  const className = `stack-card${interactive ? '' : ' stack-card--buried'}`
  const hoverable = interactive && !reducedMotion
  return (
    <motion.div
      className={className}
      style={style}
      onHoverStart={hoverable ? () => hoverTarget.set(1.02) : undefined}
      onHoverEnd={hoverable ? () => hoverTarget.set(1) : undefined}
    >
      {interactive ? (
        <Link className="stack-card-link" to={`/projects/${card.slug}`} aria-label={card.title}>
          {inner}
        </Link>
      ) : (
        <div className="stack-card-inert" aria-hidden="true" tabIndex={-1}>
          {inner}
        </div>
      )}
    </motion.div>
  )
}

export function ProjectCardStack({
  cards,
  baseIndex,
  frontIndex,
  interactiveDepth,
  progress,
  reducedMotion,
  viewProjectLabel,
}: ProjectCardStackProps): React.ReactElement {
  const depths = reducedMotion ? [0, 1, 2] : [0, 1, 2, 3]
  const origin = reducedMotion ? frontIndex : baseIndex

  return (
    <div className="stack-cards">
      {depths.map((depth) => {
        const card = cards[origin + depth]
        if (!card) return null
        const interactive = reducedMotion ? depth === 0 : depth === interactiveDepth
        return (
          <CardSlot
            key={depth}
            depth={depth}
            card={card}
            interactive={interactive}
            eager={depth === 0}
            progress={progress}
            reducedMotion={reducedMotion}
            viewProjectLabel={viewProjectLabel}
          />
        )
      })}
    </div>
  )
}
