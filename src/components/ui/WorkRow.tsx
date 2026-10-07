import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { EASE_HOUSE } from '../../utils/animations'
import { accentFor, accentDeepFor, accentDeepLargeFor } from '../../utils/palette'

/**
 * The open typographic row, in two places: Work Experience's expandable
 * entries, and the stream's case-study rows inside the Selected Work scene.
 *
 * It carries no imagery of its own. The tracking preview float and the
 * trailing ornament went with the old Archive section — the archive's pictures
 * are the wall's now, drawn on the canvas, and a DOM row that also tried to
 * show one would be a second, worse copy of it.
 */

export interface WorkRowProps {
  /** 0-based position in the list; renders as zero-padded index and picks the tint via accentFor(index). */
  index: number
  title: string
  /** Rendered as `·`-joined meta spans after the title block. */
  meta?: string[]
  /** Internal path ('/...') renders a <Link>, external an <a target="_blank" rel="noreferrer">. Omit for non-link rows. */
  href?: string
  /** Overrides the href-prefix heuristic (L2): when set, decides Link vs anchor
   *  regardless of whether href starts with '/'. The stream passes item.internal. */
  internal?: boolean
  /** Expandable variant (work experience). Mutually exclusive with href. */
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  /** Expanded panel content. */
  children?: React.ReactNode
}

export function WorkRow(props: WorkRowProps): React.ReactElement {
  const { index, title, meta, href, internal, expandable, expanded, onToggle, children } = props
  const { prefersReducedMotion } = useMotion()

  const paddedIndex = String(index + 1).padStart(2, '0')
  // Three tint channels. --row-tint is the raw tricolor for the ink sections;
  // the two deep channels are read only inside .chapter-light, where the token
  // scope cannot reach an inline custom property (see index.css, LIGHT CHAPTER).
  const rootStyle = {
    '--row-tint': accentFor(index),
    '--row-tint-deep': accentDeepFor(index),
    '--row-tint-deep-large': accentDeepLargeFor(index),
  } as React.CSSProperties &
    Record<'--row-tint' | '--row-tint-deep' | '--row-tint-deep-large', string>

  // Link decision (L2): explicit `internal` wins, else the href-prefix heuristic.
  const isInternal = internal ?? href?.startsWith('/') ?? false

  const inner = (
    <>
      <span className="workrow-index" aria-hidden="true">
        {paddedIndex}
      </span>
      <span className="workrow-title">{title}</span>
      {meta && meta.length > 0 && (
        <span className="workrow-meta">
          {meta.map((m, i) => (
            <span key={i} className="workrow-meta-item">
              {m}
            </span>
          ))}
        </span>
      )}
      {/* The glyph says where the link goes: `+` opens in place, `→` stays on
          this site, `↗` leaves it. */}
      <span className="workrow-arrow" aria-hidden="true">
        {expandable ? '+' : isInternal ? '→' : '↗'}
      </span>
    </>
  )

  // Expandable variant (work experience) — real <button>, animated panel.
  if (expandable) {
    return (
      <div className="workrow workrow--expandable" style={rootStyle}>
        <button
          type="button"
          className="workrow-toggle"
          aria-expanded={!!expanded}
          onClick={onToggle}
        >
          {inner}
        </button>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className="workrow-panel-wrap"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{
                height: 0,
                opacity: 0,
                transition: { duration: prefersReducedMotion ? 0 : 0.22, ease: EASE_HOUSE },
              }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: EASE_HOUSE }}
              style={{ overflow: 'hidden' }}
            >
              <div className="workrow-panel">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Link / anchor / static variants.
  let interactive: React.ReactElement
  if (href && isInternal) {
    interactive = (
      <Link to={href} className="workrow-link">
        {inner}
      </Link>
    )
  } else if (href) {
    interactive = (
      <a href={href} target="_blank" rel="noreferrer" className="workrow-link">
        {inner}
      </a>
    )
  } else {
    interactive = <div className="workrow-link workrow-link--static">{inner}</div>
  }

  return (
    <div className="workrow" style={rootStyle}>
      {interactive}
    </div>
  )
}
