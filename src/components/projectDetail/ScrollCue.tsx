import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'

const EASE = [0.22, 1, 0.36, 1] as const
const DISMISS_THRESHOLD_PX = 30
// Hero entrance ends at ~1.2s (StatRow lands then). Wait a beat past that
// so the cue feels like it follows the hero, not interrupts it.
const APPEAR_DELAY_S = 1.4
const FADE_OUT_S = 0.4

export function ScrollCue() {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Pre-check: if the page opens already past the threshold (e.g., the
    // browser restored scroll position before our manual reset landed), skip
    // the animation entirely so we don't tease a cue that's about to dismiss.
    if (window.scrollY > DISMISS_THRESHOLD_PX) {
      setDismissed(true)
      return
    }
    const onScroll = () => {
      if (window.scrollY > DISMISS_THRESHOLD_PX) setDismissed(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="scroll-cue-slot" aria-hidden>
      <motion.div
        className="scroll-cue"
        initial={{ opacity: 0 }}
        animate={{ opacity: dismissed ? 0 : 1 }}
        transition={{
          duration: FADE_OUT_S,
          delay: dismissed ? 0 : APPEAR_DELAY_S,
          ease: EASE,
        }}
      >
        <span className="scroll-cue-label">{t('projectDetail.scroll')}</span>
        <motion.span
          className="scroll-cue-arrow"
          animate={
            prefersReducedMotion || dismissed ? { y: 0 } : { y: [0, 6, 0] }
          }
          transition={
            prefersReducedMotion || dismissed
              ? { duration: 0 }
              : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: APPEAR_DELAY_S }
          }
        >
          ↓
        </motion.span>
      </motion.div>
    </div>
  )
}
