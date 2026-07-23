import { useId } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { morphValues, type MorphStyle } from '../../utils/stackMotion'

export interface GooeyTitleProps {
  /** All N project titles, index-aligned with the card stack — one morph span each. */
  titles: string[]
  /** Continuous scroll-derived channel (0..n-1, plateaus at integers). The SINGLE
      source for every per-span blur/opacity — no React state in the visual path. */
  seg: MotionValue<number>
  /** Resting (front) project title: the accessible name and the entire RM render. Tracks frontIndex. */
  staticTitle: string
  reducedMotion: boolean
  /** WebKit degrade flag: false drops the threshold feColorMatrix, keeps the blur/opacity crossfade. */
  thresholdFilter?: boolean
  className?: string
}

// Self-contained sr-only style so the heading has an accessible name without a
// CSS dependency (the visible morph spans are aria-hidden).
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
}

/**
 * Blur/opacity for span i at relative position `rel = segCont − i`.
 * rel ∈ [0, 1]  → this title is the OUTgoing one: crisp at rel 0, dissolving by rel 1.
 * rel ∈ (−1, 0) → this title is the INcoming one: sharpening as rel → 0.
 * else          → distant/parked: fully blurred, transparent (never composited).
 * At any transition exactly two spans are non-transparent (the classic two-span
 * gooey morph), so the threshold filter only ever merges the crossing pair.
 */
function spanMorph(rel: number): MorphStyle {
  if (rel >= 0 && rel <= 1) return morphValues(rel).outgoing
  if (rel > -1 && rel < 0) return morphValues(1 + rel).incoming
  return { blur: 100, opacity: 0 }
}

function TitleSpan({
  index,
  title,
  seg,
}: {
  index: number
  title: string
  seg: MotionValue<number>
}): React.ReactElement {
  const filter = useTransform(seg, (s) => `blur(${spanMorph(s - index).blur}px)`)
  const opacity = useTransform(seg, (s) => spanMorph(s - index).opacity)
  return (
    <motion.span className="gooey-title-span" style={{ filter, opacity }}>
      {title}
    </motion.span>
  )
}

export function GooeyTitle({
  titles,
  seg,
  staticTitle,
  reducedMotion,
  thresholdFilter = true,
  className,
}: GooeyTitleProps): React.ReactElement {
  // Hooks run unconditionally (rules-of-hooks); the RM branch returns after them.
  const rawId = useId()
  const filterId = `gooey-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  const cls = `gooey-title ${className ?? ''}`.trim()

  // Reduced motion: plain static title (the RESTING project, not the segment
  // origin), no filter, no morph.
  if (reducedMotion) {
    return <h2 className={cls}>{staticTitle}</h2>
  }

  return (
    <h2 className={cls}>
      <span className="gooey-title-sr" style={srOnly}>{staticTitle}</span>
      {thresholdFilter && (
        <svg className="gooey-title-defs" aria-hidden="true" focusable="false">
          <defs>
            <filter id={filterId}>
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -150"
              />
            </filter>
          </defs>
        </svg>
      )}
      <span
        className="gooey-title-stage"
        aria-hidden="true"
        style={thresholdFilter ? { filter: `url(#${filterId})` } : undefined}
      >
        {titles.map((title, i) => (
          <TitleSpan key={i} index={i} title={title} seg={seg} />
        ))}
      </span>
    </h2>
  )
}
