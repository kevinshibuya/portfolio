import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import {
  LOADER_MIN_DURATION_MS,
  LOADER_REDUCED_MOTION_MAX_MS,
} from '../utils/motion-flags'

export interface LoaderProgress {
  progress: number
  drawDone: Promise<void>
  handoffDone: Promise<void>
  resolveHandoff: () => void
}

const POWER3_OUT: [number, number, number, number] = [0.165, 0.84, 0.44, 1]

export function useLoaderProgress(prefersReducedMotion: boolean): LoaderProgress {
  const [progress, setProgress] = useState(0)

  const promises = useMemo(() => {
    let resolveDraw!: () => void
    let resolveHandoff!: () => void
    const drawDone = new Promise<void>((r) => { resolveDraw = r })
    const handoffDone = new Promise<void>((r) => { resolveHandoff = r })
    return { drawDone, handoffDone, resolveDraw, resolveHandoff }
  }, [])

  const resolveHandoffRef = useRef(promises.resolveHandoff)

  useEffect(() => {
    const start = performance.now()
    const minDelay = prefersReducedMotion
      ? LOADER_REDUCED_MOTION_MAX_MS
      : LOADER_MIN_DURATION_MS

    let cancelled = false
    let snapControls: ReturnType<typeof animate> | null = null
    let rafId = 0

    const tick = (): void => {
      if (cancelled) return
      const elapsed = performance.now() - start
      const synthetic = Math.min(0.92, elapsed / minDelay)
      setProgress((p) => Math.max(p, synthetic))
      if (!cancelled) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const finish = (): void => {
      if (cancelled) return
      cancelled = true
      cancelAnimationFrame(rafId)
      if (prefersReducedMotion) {
        setProgress(1)
        promises.resolveDraw()
        promises.resolveHandoff()
        return
      }
      const fromValue = Math.min(0.92, (performance.now() - start) / minDelay)
      snapControls = animate(fromValue, 1, {
        duration: 0.24,
        ease: POWER3_OUT,
        onUpdate: (v) => setProgress(v),
        onComplete: () => promises.resolveDraw(),
      })
    }

    const onLoad = (): void => {
      void document.fonts.ready.then(() => {
        if (cancelled) return
        if (document.readyState === 'complete') finish()
        else window.addEventListener('load', () => finish(), { once: true })
      })
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    let floorTimer: number | undefined
    if (prefersReducedMotion) {
      floorTimer = window.setTimeout(finish, minDelay)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      snapControls?.stop()
      if (floorTimer !== undefined) window.clearTimeout(floorTimer)
      window.removeEventListener('load', onLoad)
    }
  }, [prefersReducedMotion, promises])

  return {
    progress,
    drawDone: promises.drawDone,
    handoffDone: promises.handoffDone,
    resolveHandoff: () => resolveHandoffRef.current(),
  }
}
