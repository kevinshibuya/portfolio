import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'

const EASE = [0.22, 1, 0.36, 1] as const
const DISMISS_THRESHOLD_PX = 30
// Hero entrance ends at ~1.2s (StatRow lands then). Wait a beat past that
// so the cue feels like it follows the hero, not interrupts it.
const APPEAR_DELAY_S = 1.4

export function ScrollCue() {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > DISMISS_THRESHOLD_PX) setDismissed(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="scroll-cue-slot" aria-hidden>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            className="scroll-cue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              delay: APPEAR_DELAY_S,
              ease: EASE,
            }}
          >
            <span className="scroll-cue-label">{t('projectDetail.scroll')}</span>
            <motion.span
              className="scroll-cue-arrow"
              animate={prefersReducedMotion ? { y: 0 } : { y: [0, 6, 0] }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: APPEAR_DELAY_S }
              }
            >
              ↓
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
