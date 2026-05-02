import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import type { CursorAnchors } from './HeroNameDrawing'

interface LoadingCursorProps {
  /** Called per render to get current viewport-space anchors. Returning
   *  null skips rendering until the SVGs have been measured. */
  getAnchors: () => CursorAnchors | null
}

const KEVIN_PHASE_END = 0.45
const PEN_LIFT_HALF = 0.03

interface DotState {
  x: number
  y: number
  opacity: number
}

function computeDuringDraw(progress: number, a: CursorAnchors): DotState {
  if (progress < KEVIN_PHASE_END - PEN_LIFT_HALF) {
    const t = progress / (KEVIN_PHASE_END - PEN_LIFT_HALF)
    return {
      x: a.kevinStartX + t * (a.kevinEndX - a.kevinStartX),
      y: a.kevinBaselineY + 14,
      opacity: 1,
    }
  }
  if (progress < KEVIN_PHASE_END + PEN_LIFT_HALF) {
    const opacity =
      progress < KEVIN_PHASE_END
        ? 1 - (progress - (KEVIN_PHASE_END - PEN_LIFT_HALF)) / PEN_LIFT_HALF
        : (progress - KEVIN_PHASE_END) / PEN_LIFT_HALF
    return { x: 0, y: 0, opacity: Math.max(0, opacity) }
  }
  if (progress < 1) {
    const t =
      (progress - (KEVIN_PHASE_END + PEN_LIFT_HALF)) /
      (1 - (KEVIN_PHASE_END + PEN_LIFT_HALF))
    return {
      x: a.shibuyaStartX + t * (a.shibuyaEndX - a.shibuyaStartX),
      y: a.shibuyaBaselineY + 14,
      opacity: 1,
    }
  }
  return { x: a.periodX, y: a.periodY, opacity: 1 }
}

export function LoadingCursor({ getAnchors }: LoadingCursorProps) {
  const { progress, drawDone, prefersReducedMotion, resolveHandoff } = useMotion()
  const [haloScale, setHaloScale] = useState(0.6)
  const [haloOpacity, setHaloOpacity] = useState(0)
  const [dotScale, setDotScale] = useState(1)
  const [flightPos, setFlightPos] = useState<{ x: number; y: number } | null>(null)
  const [postFlightOpacity, setPostFlightOpacity] = useState(1)
  const [unmounted, setUnmounted] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion) return
    let cancelled = false

    void drawDone.then(() => {
      if (cancelled) return
      // Bloom: dot 1 → 1.15 → 1; halo 0.6 → 3 with opacity 0 → 0.4 → 0.
      animate(1, 1.15, {
        duration: 0.25,
        ease: 'easeOut',
        onUpdate: (v) => setDotScale(v),
        onComplete: () => {
          if (cancelled) return
          animate(1.15, 1, {
            duration: 0.25,
            ease: 'easeIn',
            onUpdate: (v) => setDotScale(v),
          })
        },
      })
      animate(0.6, 3, {
        duration: 0.5,
        ease: 'easeOut',
        onUpdate: (v) => setHaloScale(v),
      })
      animate(0, 0.4, {
        duration: 0.18,
        ease: 'easeOut',
        onUpdate: (v) => setHaloOpacity(v),
        onComplete: () => {
          if (cancelled) return
          animate(0.4, 0, {
            duration: 0.32,
            ease: 'easeIn',
            onUpdate: (v) => setHaloOpacity(v),
          })
        },
      })

      window.setTimeout(() => {
        if (cancelled) return
        const navDot = document.querySelector<HTMLElement>('.nav-avail-dot')
        const anchors = getAnchors()
        const navRect = navDot?.getBoundingClientRect()
        // Mobile (<= 720px): .nav-avail (and its dot) is display:none and
        // its bounding rect collapses to 0×0. Skip the flight in that case
        // — the dot just fades out in place after the bloom.
        if (!navRect || navRect.width === 0 || !anchors) {
          animate(1, 0, {
            duration: 0.2,
            onUpdate: (v) => setPostFlightOpacity(v),
            onComplete: () => {
              resolveHandoff()
              setUnmounted(true)
            },
          })
          return
        }
        const targetX = navRect.left + navRect.width / 2
        const targetY = navRect.top + navRect.height / 2
        const startX = anchors.periodX
        const startY = anchors.periodY
        animate(0, 1, {
          duration: 0.7,
          ease: [0.65, 0, 0.35, 1],
          onUpdate: (t) => {
            setFlightPos({
              x: startX + (targetX - startX) * t,
              y: startY + (targetY - startY) * t,
            })
          },
          onComplete: () => {
            // Identity merge: fade loader cursor over 100ms, then unmount.
            animate(1, 0, {
              duration: 0.1,
              onUpdate: (v) => setPostFlightOpacity(v),
              onComplete: () => {
                resolveHandoff()
                setUnmounted(true)
              },
            })
          },
        })
      }, 500)
    })

    return () => {
      cancelled = true
    }
  }, [drawDone, prefersReducedMotion, getAnchors, resolveHandoff])

  if (prefersReducedMotion) return null
  if (unmounted) return null

  const anchors = getAnchors()
  if (!anchors) return null

  const state =
    flightPos !== null
      ? { x: flightPos.x, y: flightPos.y, opacity: postFlightOpacity }
      : computeDuringDraw(progress, anchors)

  return createPortal(
    <div
      className="loading-cursor"
      style={{
        transform: `translate3d(${state.x - 3.5}px, ${state.y - 3.5}px, 0) scale(${dotScale})`,
        opacity: state.opacity,
      }}
      aria-hidden="true"
    >
      <div
        className="loading-cursor-halo"
        style={{
          transform: `scale(${haloScale})`,
          opacity: haloOpacity,
        }}
      />
    </div>,
    document.body
  )
}
