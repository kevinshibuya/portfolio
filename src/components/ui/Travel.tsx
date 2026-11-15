import { useLayoutEffect, useRef, type ReactElement, type ReactNode, type RefObject } from 'react'
import { useMotion } from '../../context/MotionContext'
import { onFrame } from '../../utils/frame'
import { clamp01, outPow } from '../../utils/ease'

/**
 * The travelling media of a project page.
 *
 * The element lives in the page flow at its final place, the first frame of
 * the media column. With the page at its top it is moved by a transform so it
 * covers an empty slot at the lower right of the opening screen; scrolling
 * plays that transform back to nothing. It is never fixed or sticky: the page
 * carries it up while the transform carries it across, and the two together
 * draw the path. Once the transform is spent it is an ordinary element.
 *
 * Progress runs from the top of the page until the element's own bottom edge
 * reaches 80 % of the viewport height, eased out, and it chases the scroll
 * instead of locking to it. On a wide screen the path is a curve (it swings
 * across at about its starting height, then drops into place) and the element
 * leans in depth with the speed of the scroll, flat again for the last tenth.
 */
const LEAN_MAX = 24
const LEAN_SPEED = 40
const CHASE = 0.2

export function Travel({
  slotRef,
  children,
}: {
  slotRef: RefObject<HTMLElement | null>
  children: ReactNode
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const leanRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useMotion()

  useLayoutEffect(() => {
    const el = ref.current
    const leanEl = leanRef.current
    const slot = slotRef.current
    if (!el || !leanEl || !slot || prefersReducedMotion) return

    let dx = 0
    let dy = 0
    let scale = 1
    let end = 1
    let wide = true
    let progress = -1
    let lean = 0

    const place = (p: number): void => {
      const e = outPow(p, 1.5)
      const u = 1 - e
      // Wide: a quadratic from the slot to the final place whose control point
      // sits an eighth of the way back across and seven eighths of the way
      // back up. Narrow: a straight line.
      const x = wide ? u * u * dx + 2 * u * e * (dx / 8) : dx * u
      const y = wide ? u * u * dy + 2 * u * e * ((dy * 7) / 8) : dy * u
      const s = scale + (1 - scale) * e
      el.style.transform = p >= 1 ? '' : `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`
    }

    const measure = (): void => {
      el.style.transform = ''
      const from = slot.getBoundingClientRect()
      const to = el.getBoundingClientRect()
      dx = from.left - to.left
      dy = from.top - to.top
      scale = to.width > 0 ? from.width / to.width : 1
      end = Math.max(1, to.bottom + window.scrollY - window.innerHeight * 0.8)
      wide = window.innerWidth >= 1000
      place(progress < 0 ? clamp01(window.scrollY / end) : progress)
    }
    measure()

    const stop = onFrame((y, delta) => {
      const target = clamp01(y / end)
      if (progress < 0) progress = target
      progress += (target - progress) * CHASE
      if (Math.abs(target - progress) < 0.0004) progress = target
      place(progress)

      const wanted = wide && progress < 0.9 ? Math.max(-1, Math.min(1, delta / LEAN_SPEED)) * LEAN_MAX : 0
      lean += (wanted - lean) * 0.11
      if (Math.abs(lean) < 0.03 && wanted === 0) lean = 0
      if (lean === 0) {
        leanEl.style.transform = ''
      } else {
        // Scrolling down the left edge stays put and the right edge swings; scrolling up it mirrors.
        leanEl.style.transformOrigin = lean > 0 ? '0% 50%' : '100% 50%'
        leanEl.style.transform = `rotateY(${lean.toFixed(2)}deg)`
      }
    })

    const resizer = new ResizeObserver(measure)
    resizer.observe(document.documentElement)
    window.addEventListener('resize', measure)
    return () => {
      stop()
      resizer.disconnect()
      window.removeEventListener('resize', measure)
      el.style.transform = ''
      leanEl.style.transform = ''
    }
  }, [slotRef, prefersReducedMotion])

  return (
    <div className="travel" ref={ref} data-motion="travel">
      <div className="travel-lean" ref={leanRef}>
        {children}
      </div>
    </div>
  )
}

/**
 * A column that comes to rest beside the media instead of stopping dead: it
 * starts slowing 440 px before the point a plain sticky would lock, is still
 * 110 px short there, and settles 440 px after.
 */
const SOFT = 440

export function SoftSticky({ top, className, children }: { top: number; className?: string; children: ReactNode }): ReactElement {
  const wrapRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useMotion()

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const el = ref.current
    if (!wrap || !el || prefersReducedMotion) return
    let last = 0
    return onFrame(() => {
      if (window.innerWidth <= 860) {
        if (last !== 0) {
          last = 0
          el.style.transform = ''
        }
        return
      }
      // x: how far the column's natural place still is below its resting line.
      const x = wrap.getBoundingClientRect().top - top
      const extra = x <= -SOFT || x >= SOFT ? 0 : (x + SOFT) ** 2 / (4 * SOFT) - Math.max(0, x)
      if (Math.abs(extra - last) < 0.2) return
      last = extra
      el.style.transform = extra ? `translateY(${extra.toFixed(1)}px)` : ''
    })
  }, [top, prefersReducedMotion])

  return (
    <div ref={wrapRef} className="p-side">
      <div ref={ref} className={className} style={{ top }}>
        {children}
      </div>
    </div>
  )
}
