import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { LOADER_MIN_DURATION_MS, LOADER_REDUCED_MOTION_MAX_MS } from '../../utils/motion-flags'

// power3.out approximation as a cubic-bezier tuple. GSAP's power3.out is
// quartic (1 - (1-t)^4); the canonical easeOutQuart bezier below is the
// closest standard approximation. The visible delta over the 0.4s opacity
// fade is well below the JND, but using easeOutQuart honors the original
// curve choice rather than silently downgrading to easeOutCubic.
const POWER3_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1]

export function LoadingScreen() {
  const { resolveLoader, prefersReducedMotion } = useMotion()
  const root = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  // Lock body scroll while the loader covers the viewport. Cleanup restores
  // it if the component unmounts before the handoff completes (fast nav, HMR).
  useLayoutEffect(() => {
    document.body.dataset.loaderState = 'loading'
    return () => {
      if (document.body.dataset.loaderState === 'loading') {
        delete document.body.dataset.loaderState
      }
    }
  }, [])

  // Runtime measurement: align loader words to exact hero word positions.
  // Wait for `document.fonts.ready` first — measuring before Plus Jakarta Sans
  // has decoded gives fallback-font metrics, and the bbox would shift on swap.
  useLayoutEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (cancelled || !wordsRef.current) return

      const loaderKevin = wordsRef.current.querySelector<HTMLElement>(
        '[data-loader-word="kevin"]'
      )
      const heroKevin = document.querySelector<HTMLElement>(
        '[data-hero-word="kevin"]'
      )
      if (!loaderKevin || !heroKevin) return

      const lb = loaderKevin.getBoundingClientRect()
      const hb = heroKevin.getBoundingClientRect()
      const dy = hb.top - lb.top
      const dx = hb.left - lb.left

      if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) {
        wordsRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Track asset readiness and drive progress 0 → 1
  useEffect(() => {
    const start = performance.now()
    const minDelay = prefersReducedMotion
      ? LOADER_REDUCED_MOTION_MAX_MS
      : LOADER_MIN_DURATION_MS

    const finish = () => {
      const elapsed = performance.now() - start
      const wait = Math.max(0, minDelay - elapsed)
      setTimeout(() => setProgress(1), wait)
    }

    const id = window.setInterval(() => {
      const elapsed = performance.now() - start
      setProgress(Math.min(0.92, elapsed / minDelay))
    }, 30)

    if (document.readyState === 'complete') {
      finish()
    } else {
      window.addEventListener('load', finish, { once: true })
    }

    return () => {
      window.clearInterval(id)
      window.removeEventListener('load', finish)
    }
  }, [prefersReducedMotion])

  // Handoff: when progress reaches 1, fade the panel out (or skip the tween
  // entirely under reduced motion) and resolve the loader gate.
  useEffect(() => {
    if (progress < 1) return
    const panel = root.current
    if (!panel) return

    const finalize = () => {
      // autoAlpha equivalent — set visibility AFTER opacity hits 0 so the
      // node stops painting and stops capturing pointer events.
      panel.style.visibility = 'hidden'
      document.body.dataset.loaderState = 'done'
      resolveLoader()
      setDone(true)
    }

    if (prefersReducedMotion) {
      panel.style.opacity = '0'
      finalize()
      return
    }

    const controls = animate(panel, { opacity: 0 }, {
      duration: 0.4,
      delay: 0.12,
      ease: POWER3_OUT,
      onComplete: finalize,
    })

    return () => {
      controls.stop()
      // Motion's animation.stop() does not fire onComplete. If we unmount mid-
      // tween (HMR, fast nav, StrictMode dev double-invoke), finalize() would
      // never run and the module-scoped loaderDone Promise would stay
      // unresolved — Hero choreography awaits it. Drive finalize defensively
      // unless a successful onComplete already fired (dataset === 'done').
      if (document.body.dataset.loaderState !== 'done') {
        finalize()
      }
    }
  }, [progress, prefersReducedMotion, resolveLoader])

  if (done) return null

  return (
    <div
      ref={root}
      data-loader-panel
      className="loader-screen"
      role="status"
      aria-live="polite"
    >
      {/*
        Structural mirror of .hero > .hero-main > h1.hero-name.
        Approximate CSS layout; fine-tuned at runtime via useLayoutEffect
        measuring the actual hero word positions and applying a transform.
      */}
      <div className="loader-hero-mirror">
        <div className="loader-hero-main">
          <div ref={wordsRef} className="loader-hero-name">
            <span
              data-loader-word="kevin"
              className="loader-hero-name-line loader-hero-name-line--ink"
            >
              kevin
            </span>
            <span
              data-loader-word="shibuya"
              className="loader-hero-name-line loader-hero-name-line--ghost"
            >
              shibuya.
            </span>
          </div>
          <div
            data-loader-progress
            data-value={progress}
            className="loader-underline"
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden="true"
          />
        </div>
      </div>
      <span className="sr-only">loading</span>
    </div>
  )
}
