import { Suspense, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotionValue, type MotionValue } from 'framer-motion'
import { ToyModel } from './ToyModel'
import { BeatText } from './BeatText'
import { ABOUT_BEATS, beatIndexAtProgress } from '../../../data/aboutBeats'

interface SceneProps {
  scrollYProgress: MotionValue<number>
  beatOpacity: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
}

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
  // Always-on opacity for the counter (spec line 33 — visible across all
  // beats as a persistent navigation aid, not tied to beat-3 fade-in).
  const alwaysOn = useMotionValue(1)

  const counterText = `0${active + 1} / 03`

  return (
    <>
      <ambientLight intensity={0.6} color="#F6F9FC" />
      <directionalLight position={[3, 4, 5]} intensity={0.9} color="#FFFFFF" />

      {/* Atmospheric back-plane — sits behind everything, gives the
          transparent canvas a soft sky-blue depth rather than reading
          flat against the page's cream background. */}
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial color="#DCF0FF" transparent opacity={0.55} />
      </mesh>

      <Suspense fallback={null}>
        <ToyModel progress={scrollYProgress} />
      </Suspense>

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

      <BeatText
        content={counterText}
        position={[2.2, -1.6, 1]}
        fontSize={0.16}
        fontWeight={400}
        color="#6A8CAA"
        anchorX="right"
        anchorY="bottom"
        opacity={alwaysOn}
      />
    </>
  )
}
