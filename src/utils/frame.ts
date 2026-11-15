/**
 * One animation-frame loop for everything that follows the scroll: each
 * subscriber gets the scroll position and how far it moved since the frame
 * before. The loop runs only while someone is subscribed.
 */
export type Tick = (scrollY: number, delta: number) => void

const subscribers = new Set<Tick>()
let raf = 0
let lastY = 0

function loop(): void {
  const y = window.scrollY
  const delta = y - lastY
  lastY = y
  for (const tick of subscribers) tick(y, delta)
  raf = requestAnimationFrame(loop)
}

export function onFrame(tick: Tick): () => void {
  subscribers.add(tick)
  if (subscribers.size === 1) {
    lastY = window.scrollY
    raf = requestAnimationFrame(loop)
  }
  return () => {
    subscribers.delete(tick)
    if (subscribers.size === 0) cancelAnimationFrame(raf)
  }
}
