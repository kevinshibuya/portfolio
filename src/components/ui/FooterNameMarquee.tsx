import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import {
  NAME_KEVIN,
  NAME_SHIBUYA,
  NAME_ASCENT,
  NAME_DESCENT,
} from '../../data/glyphPaths'

type Phase = 'idle' | 'tracing' | 'crossfade' | 'marquee'

/** Per-glyph stagger delay, in ms. */
const STAGGER_MS = 80
/** Per-glyph trace (stroke-dashoffset 1→0) duration, in ms. */
const TRACE_DUR_MS = 800
/** Breath between copy 1 finishing and copy 2 starting, in ms. */
const PAUSE_BETWEEN_COPIES_MS = 120
/** Stroke color/width cross-fade duration, in ms (matches hero ink-fill). */
const CROSSFADE_DUR_MS = 650

/** Footer text is "kevin shibuya" — drop the period glyph from NAME_SHIBUYA. */
const SHIBUYA_GLYPHS = NAME_SHIBUYA.glyphs.slice(0, 7)
const KEVIN_GLYPHS = NAME_KEVIN.glyphs

/** Inter-word + inter-copy spacing, in glyph viewBox units (1000-em font). */
const WORD_GAP = 300
const INTER_COPY_GAP = 300

/** x-offset applied to the shibuya glyph group within each copy. */
const SHIBUYA_X_OFFSET = NAME_KEVIN.totalAdvance + WORD_GAP // 2900

const LAST_SHIBUYA = SHIBUYA_GLYPHS[SHIBUYA_GLYPHS.length - 1]
const SHIBUYA_LOCAL_END = LAST_SHIBUYA.x + LAST_SHIBUYA.advance // 3790

/** Per-copy SVG viewBox width: kevin + word-gap + shibuya + inter-copy gap. */
const VIEWBOX_WIDTH = SHIBUYA_X_OFFSET + SHIBUYA_LOCAL_END + INTER_COPY_GAP // 6990
const VIEWBOX_HEIGHT = NAME_ASCENT + NAME_DESCENT // 1070

interface NameCopyProps {
  refs: MutableRefObject<(SVGPathElement | null)[]>
  phase: Phase
}

function glyphClassName(phase: Phase): string {
  const isFinal = phase === 'crossfade' || phase === 'marquee'
  const isCrossfade = phase === 'crossfade'
  return [
    'footer-marquee-glyph',
    isFinal ? 'footer-marquee-glyph--final' : '',
    isCrossfade ? 'footer-marquee-glyph--crossfade' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function NameCopy({ refs, phase }: NameCopyProps): React.JSX.Element {
  const cls = glyphClassName(phase)
  return (
    <svg
      className="footer-marquee-track-copy"
      viewBox={`0 ${-NAME_ASCENT} ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      preserveAspectRatio="xMinYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {KEVIN_GLYPHS.map((g, i) => (
        <path
          key={`k-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          d={g.d}
          className={cls}
        />
      ))}
      <g transform={`translate(${SHIBUYA_X_OFFSET}, 0)`} data-shibuya-group>
        {SHIBUYA_GLYPHS.map((g, i) => (
          <path
            key={`s-${i}`}
            ref={(el) => {
              refs.current[KEVIN_GLYPHS.length + i] = el
            }}
            d={g.d}
            className={cls}
          />
        ))}
      </g>
    </svg>
  )
}

export function FooterNameMarquee(): React.JSX.Element {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  // Reduced motion skips IDLE / TRACING / CROSSFADE entirely and lands in
  // the visual end-state (cream-stroked, single static copy) from mount.
  const [phase, setPhase] = useState<Phase>(
    prefersReducedMotion ? 'marquee' : 'idle'
  )

  const trackRef = useRef<HTMLDivElement>(null)
  const copy1Refs = useRef<(SVGPathElement | null)[]>([])
  const copy2Refs = useRef<(SVGPathElement | null)[]>([])

  // Reduced motion: imperatively land the single rendered copy in its final
  // dashoffset:0 state before first paint, so paths render stroked instead
  // of invisible (the base CSS rule starts dashoffset:1 = hidden).
  useLayoutEffect(() => {
    if (!prefersReducedMotion) return
    const paths = copy1Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )
    paths.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '0'
    })
  }, [prefersReducedMotion])

  // IDLE → TRACING: arm the IntersectionObserver. Set initial dashoffset:1
  // on every path so the trace can animate from hidden.
  useEffect(() => {
    if (prefersReducedMotion) return
    if (phase !== 'idle') return

    const track = trackRef.current
    if (!track) return

    const allPaths = [...copy1Refs.current, ...copy2Refs.current].filter(
      (p): p is SVGPathElement => p !== null
    )

    // jsdom (vitest) doesn't run SVG layout — feature-detect a browser-only
    // API and short-circuit straight to the marquee phase there.
    if (typeof allPaths[0]?.getBBox !== 'function') {
      setPhase('marquee')
      return
    }

    allPaths.forEach((p) => {
      p.setAttribute('pathLength', '1')
      p.style.strokeDasharray = '1'
      p.style.strokeDashoffset = '1'
    })

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
          observer.disconnect()
          setPhase('tracing')
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(track)

    return () => {
      observer.disconnect()
    }
  }, [prefersReducedMotion, phase])

  // TRACING: drive copy 1 then copy 2 sequentially, schedule the crossfade
  // phase flip. The marquee phase is scheduled by the next effect so its
  // cleanup never accidentally cancels a pending crossfade-→-marquee timer.
  useEffect(() => {
    if (phase !== 'tracing') return

    const copy1 = copy1Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )
    const copy2 = copy2Refs.current.filter(
      (p): p is SVGPathElement => p !== null
    )

    // Reset transitions before scheduling new ones (mirrors HeroNameDrawing).
    ;[...copy1, ...copy2].forEach((p) => {
      p.style.transition = 'none'
    })
    void document.body.offsetHeight

    const copy1Duration = (copy1.length - 1) * STAGGER_MS + TRACE_DUR_MS
    const copy2StartDelay = copy1Duration + PAUSE_BETWEEN_COPIES_MS
    const copy2Duration = (copy2.length - 1) * STAGGER_MS + TRACE_DUR_MS
    const totalTrace = copy2StartDelay + copy2Duration

    const rafId = requestAnimationFrame(() => {
      copy1.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
      copy2.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${copy2StartDelay + i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
    })

    // When the trace is done, clear inline transitions (which only cover
    // stroke-dashoffset). Otherwise they would override the CSS rule for
    // the --crossfade class transition (which covers stroke + stroke-width).
    const crossfadeTimer = window.setTimeout(() => {
      ;[...copy1Refs.current, ...copy2Refs.current].forEach((p) => {
        if (p) p.style.transition = ''
      })
      setPhase('crossfade')
    }, totalTrace + 50)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(crossfadeTimer)
    }
  }, [phase])

  // CROSSFADE → MARQUEE: hold for CROSSFADE_DUR_MS, then flip to marquee.
  useEffect(() => {
    if (phase !== 'crossfade') return
    const marqueeTimer = window.setTimeout(() => {
      setPhase('marquee')
    }, CROSSFADE_DUR_MS)
    return () => {
      window.clearTimeout(marqueeTimer)
    }
  }, [phase])

  return (
    <>
      <h2 className="sr-only">{t('footer.bigText')}</h2>
      <div className="footer-marquee" aria-hidden="true">
        <div
          ref={trackRef}
          className={`footer-marquee-track footer-marquee-track--${phase}`}
        >
          <NameCopy refs={copy1Refs} phase={phase} />
          {!prefersReducedMotion && (
            <NameCopy refs={copy2Refs} phase={phase} />
          )}
        </div>
      </div>
    </>
  )
}
