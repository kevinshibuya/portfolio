import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { MotionValue } from 'framer-motion'
import { ToyModel } from './ToyModel'
import { BeatText } from './BeatText'
import { ABOUT_BEATS, beatIndexAtProgress } from '../../../data/aboutBeats'
import { useState, useEffect } from 'react'

interface SceneProps {
  scrollYProgress: MotionValue<number>
  beatOpacity: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
}

/**
 * Reads the current beat index off the scroll progress. Used to pick which
 * beat's strings the SHARED billboards (headline-behind, body-caption, etc.)
 * display. The per-beat opacity comes from useAboutProgress; this is just
 * about *which content* is shown at any given progress.
 */
function useActiveBeat(progress: MotionValue<number>): 0 | 1 | 2 {
  const [active, setActive] = useState<0 | 1 | 2>(beatIndexAtProgress(progress.get()))
  useEffect(() => {
    const unsub = progress.on('change', (v) => {
      const next = beatIndexAtProgress(v)
      setActive((cur) => (cur === next ? cur : next))
    })
    return () => unsub()
  }, [progress])
  return active
}

export function Scene({ scrollYProgress, beatOpacity }: SceneProps) {
  const { t } = useTranslation()
  const active = useActiveBeat(scrollYProgress)

  // Counter is derived from active (no opacity transform; counter is always visible).
  const counterText = `0${active + 1} / 03`

  return (
    <>
      <ambientLight intensity={0.6} color="#F6F9FC" />
      <directionalLight position={[3, 4, 5]} intensity={0.9} color="#FFFFFF" />

      <Suspense fallback={null}>
        <ToyModel progress={scrollYProgress} />
      </Suspense>

      {/* Headline behind the toy (one per beat — only the active beat's
          opacity is non-zero at any time, but rendering all three avoids
          a Troika SDF rebuild on beat change). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`headline-${beat.id}`}
          content={t(beat.titleKey)}
          position={[0, 0, -0.5]}
          fontSize={0.85}
          fontWeight={800}
          color="#D4E5F2"
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Eyebrow (top-left). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`eyebrow-${beat.id}`}
          content={t(beat.eyebrowKey)}
          position={[-2.2, 1.4, 1]}
          fontSize={0.18}
          fontWeight={400}
          color="#6A8CAA"
          anchorX="left"
          anchorY="top"
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Body caption (bottom-center). */}
      {ABOUT_BEATS.map((beat, i) => (
        <BeatText
          key={`body-${beat.id}`}
          content={t(beat.bodyKey)}
          position={[0, -1.6, 0.5]}
          fontSize={0.2}
          fontWeight={500}
          color="#2A4060"
          anchorY="bottom"
          maxWidth={4.0}
          opacity={beatOpacity[i]}
        />
      ))}

      {/* Counter (bottom-right) — single instance, content swaps. */}
      <BeatText
        content={counterText}
        position={[2.2, -1.6, 1]}
        fontSize={0.16}
        fontWeight={400}
        color="#6A8CAA"
        anchorX="right"
        anchorY="bottom"
        opacity={beatOpacity[2]}  // always-on after beat 2's enter; in practice opacity stays 1
      />
    </>
  )
}
