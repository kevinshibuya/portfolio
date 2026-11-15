import { useSyncExternalStore } from 'react'

/** The width from which a page takes its wide form: everything the stylesheet's `max-width: 860px` does not match. */
const WIDE = 'not all and (max-width: 860px)'

function subscribe(notify: () => void): () => void {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', notify)
  return () => query.removeEventListener('change', notify)
}

/** Whether the window is wide enough for a page's wide form, kept current as it is resized. */
export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => true,
  )
}
