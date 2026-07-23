import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { EASE_HOUSE } from '../../utils/animations'
import { FluidWaves } from '../canvas/FluidWaves'

const ROLE_DURATION_MS = 5000

// Entrance rise choreography: per-line duration + stagger delays (role line,
// name line 1, name line 2). The clip release is derived from these so tuning
// the rise can never de-sync it — releasing early pops glyphs mid-rise;
// releasing never leaves the 'y' descender + role focus ring clipped at rest.
const RISE_DURATION = 0.9
const LINE_DELAYS = [0, 0.08, 0.16] as const
const RELEASE_MS = (Math.max(...LINE_DELAYS) + RISE_DURATION) * 1000 + 90

export function Hero(): ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { prefersReducedMotion, entranceDone, entranceBypassed } = useMotion()

  // Entrance rise. The loader explosion reveals the shader; the hero text then
  // rises out of its clip masks once the explosion nears completion (main.tsx
  // resolves entranceDone at ~92% of the explosion). `riseSettled` releases the
  // clip to overflow:visible only AFTER the rise finishes, so the role focus
  // ring and glyph descenders aren't clipped at rest. Reduced-motion and SPA
  // back-nav skip straight to the settled state — no rise.
  const instant = prefersReducedMotion || entranceBypassed
  const [entered, setEntered] = useState(instant)
  const [riseSettled, setRiseSettled] = useState(instant)
  useEffect(() => {
    if (instant) return
    let cancelled = false
    let releaseTimer: ReturnType<typeof setTimeout> | undefined
    entranceDone.then(() => {
      if (cancelled) return
      setEntered(true)
      // Release the clip once the last line has finished rising (derived
      // from the rise constants above, plus a small buffer).
      releaseTimer = setTimeout(() => {
        if (!cancelled) setRiseSettled(true)
      }, RELEASE_MS)
    })
    return () => {
      cancelled = true
      if (releaseTimer) clearTimeout(releaseTimer)
    }
  }, [instant, entranceDone])

  // Rise transition per line; instant (duration 0) under reduced-motion/bypass.
  const rise = (delay: number) => ({
    duration: instant ? 0 : RISE_DURATION,
    ease: EASE_HOUSE,
    delay: instant ? 0 : delay,
  })

  const roles = useMemo(() => {
    const value = t('hero.roles', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
    // lang forces a recompute when the language toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, lang])

  // roles[0] is the canonical title; every load starts the cycle there.
  const [roleIdx, setRoleIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start (or reset) the auto-cycle interval. Clicking restarts the timer so
  // the user gets a full ROLE_DURATION_MS to read the role they advanced to.
  const startCycling = (): void => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (roles.length <= 1) return
    intervalRef.current = setInterval(() => {
      setRoleIdx((i) => (i + 1) % roles.length)
    }, ROLE_DURATION_MS)
  }

  useEffect(() => {
    setRoleIdx(0)
    // Reduced-motion users get the static canonical role (roles[0]) — no
    // interval, no Framer slide transition ever fires.
    if (!prefersReducedMotion) startCycling()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // startCycling is stable enough for our purposes; re-running on roles is
    // what matters (language toggle rebuilds the array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles, prefersReducedMotion])

  const cycleRole = (): void => {
    if (roles.length <= 1) return
    setRoleIdx((i) => (i + 1) % roles.length)
    startCycling()
  }

  const activeRole = roles[roleIdx] ?? ''

  // The loader explosion reveals the shader; then the hero text rises in (above).
  // main.tsx is the sole resolver of the entrance gate (finishLoader →
  // resolveEntrance) on the normal path, which flips `entered`; bypassEntrance()
  // owns the SPA back-nav path (instant). Hero only reads the gate — it never
  // resolves it.

  return (
    <section id="top" className="hero">
      <div className="hero-canvas">
        <FluidWaves variant="hero" />
      </div>
      {/* Inner 100svh zone owns the scrim + name/role, re-anchoring them so the
          MANDATORY AA scrim band and the name never fall into the entry veil.
          Byte-identical to the old .hero box, so the hero AA table stays valid. */}
      <div className="hero-zone">
        <div className="hero-scrim" aria-hidden="true" />

        <div className={`hero-bottom${riseSettled ? ' is-entered' : ''}`}>
        {/* Role line rises first out of its clip mask; the inner Framer
            AnimatePresence owns the separate click/keyboard cycle swap. */}
        <div className="hero-line-mask hero-role-line">
          <motion.div
            initial={{ y: instant ? '0%' : '125%' }}
            animate={{ y: entered ? '0%' : '125%' }}
            transition={rise(LINE_DELAYS[0])}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={`${lang}-${roleIdx}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{
                  y: -12,
                  opacity: 0,
                  // Shorter exit than enter (skill: exit < enter). Under reduced
                  // motion keep the prior 0.45s so that path stays untouched.
                  transition: { duration: prefersReducedMotion ? 0.45 : 0.3, ease: EASE_HOUSE },
                }}
                transition={{ duration: 0.45, ease: EASE_HOUSE }}
                whileTap={{ scale: 0.94 }}
                className="hero-role"
                onClick={cycleRole}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    cycleRole()
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`cycle role — currently ${activeRole}`}
              >
                {activeRole}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>

        <h1 className="hero-name" aria-label={`${t('hero.name1')} ${t('hero.name2')}`}>
          <span className="hero-line-mask">
            <motion.span
              className="hero-line"
              initial={{ y: instant ? '0%' : '125%' }}
              animate={{ y: entered ? '0%' : '125%' }}
              transition={rise(LINE_DELAYS[1])}
            >
              {t('hero.name1')}
            </motion.span>
          </span>
          <span className="hero-line-mask">
            <motion.span
              className="hero-line"
              initial={{ y: instant ? '0%' : '125%' }}
              animate={{ y: entered ? '0%' : '125%' }}
              transition={rise(LINE_DELAYS[2])}
            >
              {t('hero.name2')}
            </motion.span>
          </span>
        </h1>
        </div>
      </div>
      {/* Entry veil — static transparent→cream band over the still-rendering
          canvas, below the 100svh zone. No text ever renders here. */}
      <div className="hero-veil" aria-hidden="true" />
    </section>
  )
}
