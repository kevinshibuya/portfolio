import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  type MotionValue,
} from 'framer-motion'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { accentFor } from '../../utils/palette'

export interface WorkRowPreview {
  /** Image src (project mockup) — takes precedence over gradient. */
  src?: string
  /** CSS gradient string (archive items without imagery). */
  gradient?: string
  alt?: string
}

export interface WorkRowProps {
  /** 0-based position in the list; renders as zero-padded index and picks the tint via accentFor(index). */
  index: number
  title: string
  /** Rendered as `·`-joined meta spans after the title block. */
  meta?: string[]
  /** Internal path ('/...') renders a <Link>, external an <a target="_blank" rel="noreferrer">. Omit for non-link rows. */
  href?: string
  /** Overrides the href-prefix heuristic (L2): when set, decides Link vs anchor
   *  regardless of whether href starts with '/'. Archive passes item.internal. */
  internal?: boolean
  preview?: WorkRowPreview
  /** Expandable variant (work experience). Mutually exclusive with href. */
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  /** Expanded panel content. */
  children?: React.ReactNode
  /** Optional trailing ornament (e.g. archive ★). */
  ornament?: React.ReactNode
}

const EASE = [0.22, 1, 0.36, 1] as const

/** Desktop hover + fine pointer: the only environment that shows the tracking float. */
function canHoverFine(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )
}

export function WorkRow(props: WorkRowProps): React.ReactElement {
  const {
    index,
    title,
    meta,
    href,
    internal,
    preview,
    expandable,
    expanded,
    onToggle,
    children,
    ornament,
  } = props
  const { prefersReducedMotion } = useMotion()

  const paddedIndex = String(index + 1).padStart(2, '0')
  const rootStyle = { '--row-tint': accentFor(index) } as React.CSSProperties &
    Record<'--row-tint', string>

  // Link decision (L2): explicit `internal` wins, else the href-prefix heuristic.
  const isInternal = internal ?? href?.startsWith('/') ?? false

  // Float tracking state lives entirely in MotionValues — a setState on hover
  // would re-render a row mid `whileInView` stagger and permanently freeze the
  // section's staggered children at opacity 0 (see project memory + Projects.tsx).
  const [floatEnabled] = useState(() => canHoverFine())
  // Ratified design call: reduced-motion desktop (fine pointer + hover)
  // deliberately shows NO preview float, even though canHoverFine() is true —
  // prefersReducedMotion always wins over the hover-capability check.
  const showFloat = floatEnabled && !prefersReducedMotion && !!preview && !expandable
  const cursorX = useMotionValue(-400)
  const cursorY = useMotionValue(-400)
  const springX = useSpring(cursorX, { damping: 30, stiffness: 350, mass: 0.4 })
  const springY = useSpring(cursorY, { damping: 30, stiffness: 350, mass: 0.4 })
  const floatVisible = useMotionValue(0)

  function handleMove(e: React.MouseEvent) {
    cursorX.set(e.clientX)
    cursorY.set(e.clientY)
  }

  const hoverHandlers = showFloat
    ? {
        onMouseMove: handleMove,
        onMouseEnter: () => floatVisible.set(1),
        onMouseLeave: () => floatVisible.set(0),
      }
    : {}

  const inner = (
    <>
      <span className="workrow-index" aria-hidden="true">
        {paddedIndex}
      </span>
      {preview && (
        <span
          className="workrow-thumb"
          aria-hidden="true"
          style={preview.src ? undefined : { backgroundImage: preview.gradient }}
        >
          {preview.src && <img src={preview.src} alt="" loading="lazy" />}
        </span>
      )}
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
      {ornament && <span className="workrow-ornament">{ornament}</span>}
      <span className="workrow-arrow" aria-hidden="true">
        {expandable ? '+' : '↗'}
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
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: EASE }}
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
      <Link to={href} className="workrow-link" {...hoverHandlers}>
        {inner}
      </Link>
    )
  } else if (href) {
    interactive = (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="workrow-link"
        {...hoverHandlers}
      >
        {inner}
      </a>
    )
  } else {
    interactive = (
      <div className="workrow-link workrow-link--static" {...hoverHandlers}>
        {inner}
      </div>
    )
  }

  return (
    <div className="workrow" style={rootStyle} data-tint={accentFor(index)}>
      {interactive}
      {showFloat && preview && (
        <WorkRowFloat x={springX} y={springY} visible={floatVisible} preview={preview} />
      )}
    </div>
  )
}

interface WorkRowFloatProps {
  x: MotionValue<number>
  y: MotionValue<number>
  visible: MotionValue<number>
  preview: WorkRowPreview
}

/** Leaf so the hover show/hide setState re-renders only the float, never the
 *  row list — hover-driven state stays contained to this leaf component
 *  instead of bubbling a re-render up into the parent row/list. */
function WorkRowFloat({ x, y, visible, preview }: WorkRowFloatProps): React.ReactElement {
  const [shown, setShown] = useState(false)
  useMotionValueEvent(visible, 'change', (v) => setShown(v > 0.5))

  return (
    <motion.div className="workrow-float" style={{ x, y }} aria-hidden="true">
      <motion.div
        className="workrow-float-inner"
        style={preview.src ? undefined : { backgroundImage: preview.gradient }}
        animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {preview.src && <img src={preview.src} alt={preview.alt ?? ''} />}
      </motion.div>
    </motion.div>
  )
}
