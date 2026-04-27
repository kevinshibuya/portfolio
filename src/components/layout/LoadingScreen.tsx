import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { useMotion } from '../../context/MotionContext'
import { LOADER_MIN_DURATION_MS, LOADER_REDUCED_MOTION_MAX_MS } from '../../utils/motion-flags'
import { projectEaseGsap } from '../../utils/animations'

export function LoadingScreen() {
  const { resolveLoader, prefersReducedMotion } = useMotion()
  const root = useRef<HTMLDivElement>(null)
  const wordsRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  // Runtime measurement: align loader words to exact hero word positions.
  // CSS-only centering can't reliably replicate the hero's align-self:center
  // grid cell, so we measure both elements and apply a GSAP offset.
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
        gsap.set(wordsRef.current, { x: dx, y: dy })
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

  // Handoff timeline — triggers once progress reaches 1.
  // NOTE: `scope: root` confines GSAP selector strings to the loader's subtree.
  // Any future selector targeting elements outside `root` (e.g. hero nodes)
  // would silently match nothing — use a direct ref or move the tween outside
  // this hook in that case.
  useGSAP(
    () => {
      if (progress < 1) return

      if (prefersReducedMotion) {
        gsap.set('[data-loader-panel]', { autoAlpha: 0 })
        document.body.dataset.loaderState = 'done'
        resolveLoader()
        setDone(true)
        return
      }

      // Brief hold so the underline is visibly full, then fade the panel out
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.dataset.loaderState = 'done'
          resolveLoader()
          setDone(true)
        },
      })
      tl.to('[data-loader-panel]', {
        autoAlpha: 0,
        duration: 0.4,
        ease: projectEaseGsap,
        delay: 0.12,
      })
    },
    { dependencies: [progress, prefersReducedMotion], scope: root }
  )

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
        measuring the actual hero word positions and applying a GSAP offset.
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
