import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMotion } from '../context/MotionContext'

interface Cfg {
  startOffset?: number  // px below viewport top where opacity begins to drop. default 80
  endOffset?: number    // px above viewport top where opacity = 0. default -120
}

const DEFAULTS: Required<Cfg> = { startOffset: 80, endOffset: -120 }

// power2.out: f(t) = 1 - (1 - t)^2
const easeOut2 = (t: number): number => 1 - Math.pow(1 - t, 2)

export function computeFadeOpacity(elementTop: number, cfg: Cfg = DEFAULTS): number {
  const { startOffset, endOffset } = { ...DEFAULTS, ...cfg }
  if (elementTop >= startOffset) return 1
  if (elementTop <= endOffset) return 0
  // Map [start..end] -> [0..1] (progress through fade band)
  const progress = (startOffset - elementTop) / (startOffset - endOffset)
  // opacity: easeOut2 applied to (1 - progress) so element stays visible longer,
  // then fades quickly as it exits. power2.out on opacity.
  return easeOut2(1 - progress)
}

export function useScrollFade(ref: RefObject<HTMLElement | null>, cfg: Cfg = {}): void {
  const { prefersReducedMotion } = useMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion) return
    const isMobile = window.innerWidth < 768
    const merged: Required<Cfg> = isMobile
      ? { startOffset: 60, endOffset: -80 }
      : { ...DEFAULTS, ...cfg }

    // Gate: only write opacity after the element has been intersecting the viewport
    // (i.e. Framer's entrance animation has fired). This prevents useScrollFade from
    // overriding Framer's whileInView opacity=0→1 tween during scrollIntoViewIfNeeded,
    // which can place the title far above the viewport on tall sections.
    let hasEntered = false
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            hasEntered = true
            io.disconnect()
          }
        }
      },
      { threshold: 0.01 }
    )
    io.observe(el)

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${merged.startOffset - merged.endOffset}`,
        onUpdate: () => {
          if (!hasEntered) return
          const top = el.getBoundingClientRect().top
          const op = computeFadeOpacity(top, merged)
          el.style.opacity = String(op)
        },
        scrub: true,
      })
    })
    return () => {
      io.disconnect()
      ctx.revert()
    }
  }, [ref, prefersReducedMotion, cfg.startOffset, cfg.endOffset])
}
