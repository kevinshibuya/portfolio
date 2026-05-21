// TODO(Task 7): rewrite this file. Task 3 changed useAboutProgress's signature
// (no longer accepts an outerRef arg; no `beatOpacity`); this file currently
// targets the v1 hook. The build is expected to fail here until Task 7 lands.
// Tasks 4–6 produce new modules that this rewrite will wire together.
import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useTranslation } from 'react-i18next'
import { ABOUT_BEATS } from '../../../data/aboutBeats'
import { Scene } from './Scene'
import { useAboutProgress } from './useAboutProgress'

export function AboutScene() {
  const outerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress, beatOpacity } = useAboutProgress(outerRef)
  const { t } = useTranslation()

  return (
    <section id="about" className="about-outer" ref={outerRef}>
      {/* Accessibility twin — full content for screen readers. The canvas
          is decorative as far as a11y is concerned. */}
      <div className="sr-only" role="region" aria-label={t('sections.about.label')}>
        {ABOUT_BEATS.map((beat) => (
          <article key={beat.id}>
            <h3>{t(beat.titleKey)}</h3>
            <p>{t(beat.bodyKey)}</p>
          </article>
        ))}
      </div>

      <div className="about-sticky">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          aria-hidden="true"
        >
          <Scene scrollYProgress={scrollYProgress} beatOpacity={beatOpacity} />
        </Canvas>
      </div>
    </section>
  )
}
