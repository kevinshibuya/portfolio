/**
 * Where each entry of this tab's history was last scrolled to.
 *
 * The router gives every history entry a key. The page's position is kept
 * under the key of the entry on show, so going back or forward lands on the
 * position that entry was left at, whatever link first opened it. A page
 * reached by a link has a new key and nothing on record, and opens at its top.
 *
 * The record lives in memory and is copied to sessionStorage when the page is
 * hidden, so it also survives a trip to another site and back.
 */
const STORAGE_KEY = 'portfolio:scroll'
/** Entries kept: the most recently scrolled ones. */
const LIMIT = 40

let memory: Map<string, number> | null = null

function open(): Map<string, number> {
  if (memory) return memory
  memory = new Map()
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(stored)) {
      for (const pair of stored) {
        if (Array.isArray(pair) && typeof pair[0] === 'string' && typeof pair[1] === 'number') memory.set(pair[0], pair[1])
      }
    }
  } catch {
    // Storage is a convenience: without it the record lasts as long as the page.
  }
  return memory
}

/** Record where the entry `key` is scrolled to. */
export function rememberScroll(key: string, y: number): void {
  const map = open()
  // Set again at the end, so the oldest entry is always the first one.
  map.delete(key)
  map.set(key, Math.round(y))
  if (map.size > LIMIT) map.delete(map.keys().next().value as string)
}

/** Where the entry `key` was left, or null when it has no position below the top on record. */
export function recallScroll(key: string): number | null {
  const y = open().get(key)
  return y !== undefined && y > 0 ? y : null
}

/** Copy the record to sessionStorage. */
export function persistScroll(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...open()]))
  } catch {
    /* storage is a convenience */
  }
}

/** Drop the whole record: a hard load starts every page from its top. */
export function forgetScroll(): void {
  memory = new Map()
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage is a convenience */
  }
}
