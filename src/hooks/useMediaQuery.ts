import { useEffect, useState } from 'react'

/**
 * SSR-safe matchMedia subscription. Returns `false` on first render so
 * Hydration matches what the server (which has no `window`) would produce.
 * After mount, returns the current match and subscribes to changes.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
