import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { heroStats } from '../../data/stats'
import { useMotion } from '../../context/MotionContext'
import { Stagger } from '../ui/Stagger'
import { STAGGER_PRESETS } from '../../utils/animations'

interface CountUpProps {
  target: number
  durationMs?: number
}

function CountUp({ target, durationMs = 1400 }: CountUpProps) {
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

  return <span ref={ref}>{display}</span>
}

export function Stats() {
  const { t } = useTranslation()

  const parsed = heroStats.map((s) => ({
    n: parseInt(String(s.value).replace(/\D+/g, ''), 10) || 0,
    suffix: String(s.value).replace(/[\d\s]+/g, ''),
    labelKey: s.labelKey,
  }))

  return (
    <section id="stats" className="stats">
      <div className="stats-inner">
        <Stagger
          recipe="stampIn"
          stagger={STAGGER_PRESETS.statValues}
          className="stats-grid"
        >
          {parsed.map((s) => (
            <div key={s.labelKey} className="stats-item">
              <span className="hero-stat-v">
                <CountUp target={s.n} />{s.suffix}
              </span>
              <span className="hero-stat-l">{t(s.labelKey)}</span>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
