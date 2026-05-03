import { useEffect, useRef, useState } from 'react'
import { useMotion } from '../../context/MotionContext'
import {
  NAME_KEVIN,
  NAME_SHIBUYA,
  NAME_ASCENT,
  NAME_DESCENT,
} from '../../data/glyphPaths'

/** Per-glyph stagger delay, in ms. */
const STAGGER_MS = 80
/** Per-glyph trace (stroke-dashoffset 1→0) duration, in ms. */
const TRACE_DUR_MS = 800
/** Ink-fill (stroke→fill cross-fade) duration, in ms. */
const INK_FILL_DUR_MS = 650

interface HeroNameDrawingProps {
  /** Called once the trace + ink-fill sequence completes (or immediately
   *  under reduced motion). Used by Hero to resolve the entrance gate
   *  that the rest of the hero cascade waits on. */
  onComplete?: () => void
}

export function HeroNameDrawing({ onComplete }: HeroNameDrawingProps) {
  const { prefersReducedMotion } = useMotion()
  const kevinRefs = useRef<(SVGPathElement | null)[]>([])
  const shibuyaRefs = useRef<(SVGPathElement | null)[]>([])
  // The ink-fill state lives in React (not in classList.add) so that
  // when a parent re-renders for any reason and React reconciles the
  // path elements, the className we want stays applied. Imperatively
  // adding the class via classList.add gets overwritten the next time
  // React diffs the JSX className.
  const [inkFilled, setInkFilled] = useState(prefersReducedMotion)

  useEffect(() => {
    const kevinPaths = kevinRefs.current.filter((p): p is SVGPathElement => p !== null)
    const shibuyaPaths = shibuyaRefs.current.filter((p): p is SVGPathElement => p !== null)
    const allPaths = [...kevinPaths, ...shibuyaPaths]

    // jsdom (vitest) doesn't run SVG layout, so we feature-detect a
    // browser-only API and short-circuit to onComplete there.
    if (typeof allPaths[0]?.getBBox !== 'function') {
      setInkFilled(true)
      onComplete?.()
      return
    }

    // SVG `pathLength="1"` normalizes each glyph's reported length to 1
    // regardless of complexity / subpath count. With dasharray:1 +
    // dashoffset:1 (initial hidden) and animating dashoffset → 0, the
    // entire compound path traces cleanly.
    allPaths.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '1'
    })

    if (prefersReducedMotion) {
      // Skip the animation: paint the final state immediately.
      allPaths.forEach((p) => {
        p.style.strokeDashoffset = '0'
      })
      setInkFilled(true)
      onComplete?.()
      return
    }

    // Reset transitions before scheduling new ones.
    allPaths.forEach((p) => {
      p.style.transition = 'none'
    })
    void document.body.offsetHeight

    const totalTrace = (allPaths.length - 1) * STAGGER_MS + TRACE_DUR_MS

    const rafId = requestAnimationFrame(() => {
      allPaths.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
    })

    // After the trace completes, replace the per-path inline transition
    // (currently scoped to stroke-dashoffset) with one that covers the
    // properties the ink-fill will animate, then flip React state to
    // apply the --ink / --ghost classes via JSX (so they survive any
    // future re-renders without being wiped by React reconciliation).
    const fillTimer = window.setTimeout(() => {
      const fillTransition = `fill ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      allPaths.forEach((p) => {
        p.style.transition = fillTransition
      })
      setInkFilled(true)
    }, totalTrace + 100)

    const completeTimer = window.setTimeout(() => {
      onComplete?.()
    }, totalTrace + 100 + INK_FILL_DUR_MS)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(fillTimer)
      window.clearTimeout(completeTimer)
    }
  }, [prefersReducedMotion, onComplete])

  const viewBoxKevin = `0 ${-NAME_ASCENT} ${NAME_KEVIN.totalAdvance} ${NAME_ASCENT + NAME_DESCENT}`
  const viewBoxShibuya = `0 ${-NAME_ASCENT} ${NAME_SHIBUYA.totalAdvance} ${NAME_ASCENT + NAME_DESCENT}`

  const kevinClass = `hero-name-drawing-glyph${inkFilled ? ' hero-name-drawing-glyph--ink' : ''}`
  const shibuyaClass = `hero-name-drawing-glyph${inkFilled ? ' hero-name-drawing-glyph--ghost' : ''}`

  return (
    <>
      <h1 className="sr-only">kevin shibuya.</h1>
      <div className="hero-name-drawing" aria-hidden="true">
        <svg
          className="hero-name-drawing-word"
          data-name-word="kevin"
          viewBox={viewBoxKevin}
          preserveAspectRatio="xMinYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {NAME_KEVIN.glyphs.map((g, i) => (
            <path
              key={i}
              ref={(el) => {
                kevinRefs.current[i] = el
              }}
              d={g.d}
              className={kevinClass}
              data-name-glyph={i}
            />
          ))}
        </svg>
        <svg
          className="hero-name-drawing-word"
          data-name-word="shibuya"
          viewBox={viewBoxShibuya}
          preserveAspectRatio="xMinYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {NAME_SHIBUYA.glyphs.map((g, i) => (
            <path
              key={i}
              ref={(el) => {
                shibuyaRefs.current[i] = el
              }}
              d={g.d}
              className={shibuyaClass}
              data-name-glyph={NAME_KEVIN.glyphs.length + i}
            />
          ))}
        </svg>
      </div>
    </>
  )
}
