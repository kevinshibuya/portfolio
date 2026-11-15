import type { ReactElement } from 'react'

/**
 * A label that rolls on hover: the resting face tips up and back while a
 * second face rolls up from below, in the accent for a beat. The hover is
 * driven by the nearest ancestor link or button (`.roll` rules in index.css).
 */
export function Roll({ children }: { children: string }): ReactElement {
  return (
    <span className="roll">
      <span className="roll-face roll-face--rest">{children}</span>
      <span className="roll-face roll-face--next" aria-hidden="true">
        {children}
      </span>
    </span>
  )
}
