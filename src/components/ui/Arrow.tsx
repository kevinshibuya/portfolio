import type { ReactElement } from 'react'

/**
 * The site's one mark: an orange arrow, drawn on a 24 px grid and scaled by
 * its box. `in` stays on this site, `out` leaves it, `down` saves a file or
 * opens a list in place.
 */
export type ArrowKind = 'in' | 'out' | 'down'

const TURN: Record<ArrowKind, string | undefined> = {
  in: undefined,
  out: 'rotate(-45 12 12)',
  down: 'rotate(90 12 12)',
}

export function Arrow({ kind = 'in' }: { kind?: ArrowKind }): ReactElement {
  return (
    <svg className="arrow" data-kind={kind} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M2 12h18.5M12.6 4.1l7.9 7.9-7.9 7.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        transform={TURN[kind]}
      />
    </svg>
  )
}
