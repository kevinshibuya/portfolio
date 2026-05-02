import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { NAME_KEVIN, NAME_SHIBUYA, NAME_FONT_EM } from '../../data/glyphPaths'

/** Coordinates LoadingCursor needs to position itself. All values in
 *  viewport pixel space (post-getBoundingClientRect). */
export interface CursorAnchors {
  kevinStartX: number
  kevinEndX: number
  kevinBaselineY: number
  shibuyaStartX: number
  shibuyaEndX: number
  shibuyaBaselineY: number
  periodX: number
  periodY: number
}

export interface HeroNameDrawingHandle {
  /** Returns viewport-space anchors, or null if SVGs not yet measured. */
  getCursorAnchors: () => CursorAnchors | null
}

const STAGGER_PER_GLYPH = 0.05
const DRAW_WINDOW = 0.40

function glyphPathLength(progress: number, globalIndex: number): number {
  const start = globalIndex * STAGGER_PER_GLYPH
  const end = start + DRAW_WINDOW
  if (progress <= start) return 0
  if (progress >= end) return 1
  return (progress - start) / (end - start)
}

// SVG viewBox: opentype.js positions glyphs with baseline at y=0; ascenders
// go negative, descenders go positive. Plus Jakarta Sans needs ~0.85em above
// and ~0.30em below for letters like 'k' (ascender) and 'y'/'.' (descender).
const VIEWBOX_TOP = -NAME_FONT_EM * 0.85
const VIEWBOX_HEIGHT = NAME_FONT_EM * 1.15

export const HeroNameDrawing = forwardRef<HeroNameDrawingHandle>(function HeroNameDrawing(_, ref) {
  const { progress } = useMotion()
  const kevinSvgRef = useRef<SVGSVGElement>(null)
  const shibuyaSvgRef = useRef<SVGSVGElement>(null)

  const inkFilled = progress >= 1

  useImperativeHandle(ref, () => ({
    getCursorAnchors: () => {
      const k = kevinSvgRef.current
      const s = shibuyaSvgRef.current
      if (!k || !s) return null
      const kRect = k.getBoundingClientRect()
      const sRect = s.getBoundingClientRect()
      const period = NAME_SHIBUYA.glyphs[NAME_SHIBUYA.glyphs.length - 1]
      const periodRatioX = (period.x + period.advance * 0.4) / NAME_SHIBUYA.totalAdvance
      // The period sits visually on the baseline. Convert SVG baseline (y=0)
      // to pixel space: baseline y in SVG is at top + (|VIEWBOX_TOP| / VIEWBOX_HEIGHT) * height.
      const baselineRatio = -VIEWBOX_TOP / VIEWBOX_HEIGHT
      const kevinBaselinePx = kRect.top + baselineRatio * kRect.height
      const shibuyaBaselinePx = sRect.top + baselineRatio * sRect.height
      return {
        kevinStartX: kRect.left,
        kevinEndX: kRect.right,
        kevinBaselineY: kevinBaselinePx,
        shibuyaStartX: sRect.left,
        shibuyaEndX: sRect.right,
        shibuyaBaselineY: shibuyaBaselinePx,
        periodX: sRect.left + periodRatioX * sRect.width,
        periodY: shibuyaBaselinePx - 6, // period sits just above baseline
      }
    },
  }), [])

  const kevinLengths = useMemo(
    () => NAME_KEVIN.glyphs.map((_, i) => glyphPathLength(progress, i)),
    [progress]
  )
  const shibuyaLengths = useMemo(
    () => NAME_SHIBUYA.glyphs.map(
      (_, i) => glyphPathLength(progress, NAME_KEVIN.glyphs.length + i)
    ),
    [progress]
  )

  return (
    <>
      <h1 className="sr-only">kevin shibuya.</h1>
      <div className="hero-name-drawing" aria-hidden="true">
        <svg
          ref={kevinSvgRef}
          data-name-word="kevin"
          viewBox={`0 ${VIEWBOX_TOP} ${NAME_KEVIN.totalAdvance} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMinYMin meet"
          className="hero-name-drawing-word hero-name-drawing-word--kevin"
        >
          {NAME_KEVIN.glyphs.map((g, i) => (
            <motion.path
              key={i}
              data-name-glyph={i}
              d={g.d}
              initial={false}
              animate={{
                pathLength: kevinLengths[i],
                stroke: inkFilled ? 'rgba(0,0,0,0)' : 'var(--blue-400)',
                fill: inkFilled ? 'var(--ink)' : 'rgba(0,0,0,0)',
              }}
              transition={{
                pathLength: { duration: 0 },
                stroke: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                fill: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              }}
              style={{
                strokeWidth: 12,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            />
          ))}
        </svg>
        <svg
          ref={shibuyaSvgRef}
          data-name-word="shibuya"
          viewBox={`0 ${VIEWBOX_TOP} ${NAME_SHIBUYA.totalAdvance} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMinYMin meet"
          className="hero-name-drawing-word hero-name-drawing-word--shibuya"
        >
          {NAME_SHIBUYA.glyphs.map((g, i) => {
            const globalIndex = NAME_KEVIN.glyphs.length + i
            return (
              <motion.path
                key={i}
                data-name-glyph={globalIndex}
                d={g.d}
                initial={false}
                animate={{
                  pathLength: shibuyaLengths[i],
                  stroke: inkFilled ? 'var(--blue-300)' : 'var(--blue-400)',
                  fill: inkFilled ? 'var(--mist)' : 'rgba(0,0,0,0)',
                }}
                transition={{
                  pathLength: { duration: 0 },
                  stroke: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                  fill: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                }}
                style={{
                  strokeWidth: 12,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                }}
              />
            )
          })}
        </svg>
      </div>
    </>
  )
})
