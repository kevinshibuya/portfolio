import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { type MotionValue } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { MOBILE_BREAKPOINT_PX } from '../../utils/motion-flags'

// This module MUST stay free of static three / fiber / drei imports: Byline
// imports it statically (and Home idle-warms Byline), so anything imported
// here ships to every device — including fallback-only ones that render a
// plain <img>. The whole live-shader subtree (Canvas + scene + three) lives
// in HalftoneCanvas.tsx behind the lazy() below, fetched only when the
// non-fallback path actually mounts it.
const HalftoneCanvas = lazy(() => import('./HalftoneCanvas'))

export interface HalftonePortraitProps {
  src: string // source image url (sampled by the shader)
  fallbackSrc: string // pre-baked duotone <img> for mobile / no-webgl / reduced-motion
  progress: MotionValue<number> // 0→1 develop scrub (coarse→fine dot frequency)
  alt: string
  inkDark?: string // default '#111822'
  inkLight?: string // default '#F7F5F1'
  className?: string
}

/**
 * Pure mount-path predicate — extracted so the RED test can drive every branch
 * without a browser. Fallback wins if the viewer can't (or shouldn't) run the
 * live shader: reduced motion, no WebGL, or a coarse-pointer / mobile viewport.
 */
export function shouldUseFallback(env: {
  reducedMotion: boolean
  hasWebGL: boolean
  coarseOrMobile: boolean
}): boolean {
  return env.reducedMotion || !env.hasWebGL || env.coarseOrMobile
}

/** True only if a real WebGL context can be created (false in jsdom, false on failure). */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl')
    return gl != null
  } catch {
    return false
  }
}

/** Coarse-pointer or small-viewport devices take the static duotone story. */
function isCoarseOrMobile(): boolean {
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.innerWidth <= MOBILE_BREAKPOINT_PX
  )
}

/**
 * Portrait "develops" from coarse to fine halftone dots as `progress` scrubs
 * 0→1. Chooses its render path once at mount:
 *  • fallback `<img>` — reduced motion, no WebGL, or coarse/mobile (static story);
 *  • live shader `<Canvas frameloop="demand">` (lazy chunk) — otherwise. An
 *    IntersectionObserver defers the mount until the portrait first nears the
 *    viewport, then keeps it mounted: with frameloop="demand" a far Canvas
 *    costs nothing per frame, and never unmounting avoids re-entry WebGL
 *    context + shader-compile thrash on every scroll pass. One GL context total.
 */
export function HalftonePortrait({
  src,
  fallbackSrc,
  progress,
  alt,
  inkDark = '#111822',
  inkLight = '#F7F5F1',
  className,
}: HalftonePortraitProps): React.JSX.Element {
  const { prefersReducedMotion } = useMotion()

  // Browser capabilities are stable for the component's life — probe once.
  const [caps] = useState(() => ({
    webgl: hasWebGL(),
    coarseOrMobile: isCoarseOrMobile(),
  }))

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  const fallback = shouldUseFallback({
    reducedMotion: prefersReducedMotion,
    hasWebGL: caps.webgl,
    coarseOrMobile: caps.coarseOrMobile,
  })

  // Capable devices used to get three.js "for free" from Home's idle warm of
  // the Byline chunk; after the split, warm the shader chunk here instead —
  // but only on the live path, so the fetch is done before the IO gate fires.
  useEffect(() => {
    if (!fallback) void import('./HalftoneCanvas')
  }, [fallback])

  // Mount-once gate for the one WebGL context: wait for the first intersection
  // (viewport + 200px margin), then disconnect — the Canvas stays mounted for
  // the page's life. Skipped entirely on the fallback path.
  useEffect(() => {
    if (fallback || mounted) return
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fallback, mounted])

  if (fallback) {
    return <img src={fallbackSrc} alt={alt} className={className} />
  }

  return (
    <div ref={containerRef} className={className}>
      {mounted && (
        <Suspense fallback={null}>
          <HalftoneCanvas
            src={src}
            progress={progress}
            inkDark={inkDark}
            inkLight={inkLight}
          />
        </Suspense>
      )}
    </div>
  )
}
