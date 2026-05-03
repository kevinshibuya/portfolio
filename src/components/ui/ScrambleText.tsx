import React from 'react'
import { useScramble } from '../../hooks/useScramble'
import { useMotion } from '../../context/MotionContext'

interface ScrambleTextProps {
  /** The target string to scramble and settle on. Must be a plain string. */
  children: string
}

/**
 * Wraps a string in a span that triggers a soft character-scramble animation
 * on mouseenter and focus. Respects prefers-reduced-motion — shows a static span
 * when the user has opted out of motion.
 *
 * Accessibility: the aria-label always reads the target string; the visible
 * scrambled text is aria-hidden so screen readers are never interrupted.
 * tabIndex={0} makes the word focusable so keyboard users can trigger the effect.
 */
export function ScrambleText({ children }: ScrambleTextProps): React.ReactElement {
  const { prefersReducedMotion } = useMotion()
  const { text, trigger } = useScramble({ target: children })

  if (prefersReducedMotion) {
    return <span className="scramble-static">{children}</span>
  }

  return (
    <span
      className="scramble"
      onMouseEnter={trigger}
      onFocus={trigger}
      tabIndex={0}
      aria-label={children}
    >
      {/* aria-hidden so screen readers read the aria-label, not the scrambled chars */}
      <span aria-hidden="true">{text}</span>
      {/* Hidden readable copy for any AT that ignores aria-label on non-interactive elements */}
      <span className="sr-only">{children}</span>
    </span>
  )
}
