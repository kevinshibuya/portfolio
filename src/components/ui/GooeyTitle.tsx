import { useId } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { morphValues } from '../../utils/stackMotion'

export interface GooeyTitleProps {
  /** Outgoing (segment-start) project title — morph span. */
  from: string
  /** Incoming (segment-end) project title — morph span. */
  to: string
  /** Resting (front) project title: the accessible name and the entire RM render. Track frontIndex. */
  staticTitle: string
  /** Settled transition progress within the current segment (0..1). */
  progress: MotionValue<number>
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

export function GooeyTitle({
  from,
  to,
  staticTitle,
  progress,
  reducedMotion,
  thresholdFilter = true,
  className,
}: GooeyTitleProps): React.ReactElement {
  // Hooks run unconditionally (rules-of-hooks); the RM branch returns after them.
  const rawId = useId()
  const filterId = `gooey-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const outBlur = useTransform(progress, (p) => `blur(${morphValues(p).outgoing.blur}px)`)
  const outOpacity = useTransform(progress, (p) => morphValues(p).outgoing.opacity)
  const inBlur = useTransform(progress, (p) => `blur(${morphValues(p).incoming.blur}px)`)
  const inOpacity = useTransform(progress, (p) => morphValues(p).incoming.opacity)

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
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"
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
        <motion.span className="gooey-title-span" style={{ filter: outBlur, opacity: outOpacity }}>
          {from}
        </motion.span>
        <motion.span className="gooey-title-span" style={{ filter: inBlur, opacity: inOpacity }}>
          {to}
        </motion.span>
      </span>
    </h2>
  )
}
