import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { statsReceipt, type StatRow } from '../../data/stats'
import { useMotion } from '../../context/MotionContext'
import { Stagger } from '../ui/Stagger'
import { STAGGER_PRESETS } from '../../utils/animations'

interface CountUpProps {
  target: number
  suffix: string
  durationMs?: number
}

function CountUp({ target, suffix, durationMs = 1400 }: CountUpProps) {
  const { prefersReducedMotion } = useMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [display, setDisplay] = useState(prefersReducedMotion ? target : 0)

  useEffect(() => {
    if (!inView || prefersReducedMotion) {
      setDisplay(target)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, durationMs, prefersReducedMotion])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

/**
 * Detect whether a pre-formatted stat value is "pure numeric" — i.e.
 * digits plus an optional trailing `+`. Examples:
 *   "7+"        -> { numeric: 7, suffix: "+" }
 *   "250+"      -> { numeric: 250, suffix: "+" }
 *   "R$ 129B"   -> null (not pure numeric)
 *   "760k"      -> null (suffix has letters, not just "+")
 */
function parsePureNumeric(
  value: string,
): { numeric: number; suffix: string } | null {
  const match = /^(\d+)(\+?)$/.exec(value)
  if (!match) return null
  return { numeric: parseInt(match[1], 10), suffix: match[2] }
}

function ReceiptRow({ row, index }: { row: StatRow; index: number }) {
  const { t } = useTranslation()
  const num = String(index + 1).padStart(2, '0')
  const pure = parsePureNumeric(row.value)

  return (
    <div className="stats-row">
      <span className="stats-row-num">{num}</span>
      <span className="stats-row-value">
        {pure ? (
          <CountUp target={pure.numeric} suffix={pure.suffix} />
        ) : (
          row.value
        )}
      </span>
      <span className="stats-row-ann">
        {t(row.annotationKey)}
        {row.caseStudy && (
          <Link
            to={`/projects/${row.caseStudy.slug}`}
            className="stats-row-link"
          >
            {t(row.caseStudy.labelKey)}
          </Link>
        )}
      </span>
    </div>
  )
}

export function Stats() {
  const { t } = useTranslation()

  return (
    <section id="stats" className="stats">
      <div className="stats-inner">
        <div className="stats-heading-col">
          <span className="stats-eyebrow">{t('stats.eyebrow')}</span>
          <h2
            className="section-title"
            dangerouslySetInnerHTML={{ __html: t('stats.heading') }}
          />
        </div>
        <Stagger
          recipe="stampIn"
          stagger={STAGGER_PRESETS.statValues}
          className="stats-rows"
        >
          {statsReceipt.map((row, i) => (
            <ReceiptRow key={row.annotationKey} row={row} index={i} />
          ))}
        </Stagger>
      </div>
    </section>
  )
}
