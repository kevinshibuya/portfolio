import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useAboutProgress } from './useAboutProgress'
import { Scene } from './Scene'

export function AboutScene() {
  const { t } = useTranslation()
  const {
    outerRef,
    scrollYProgress,
    cameraZ,
    robotSpinY,
    cylinderRotation,
    fragmentOpacities,
  } = useAboutProgress()

  return (
    <section
      id="about"
      ref={outerRef}
      className="about-outer"
      aria-label={t('sections.about.label')}
    >
      <div className="about-sticky">
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <Scene
              scrollYProgress={scrollYProgress}
              cameraZ={cameraZ}
              robotSpinY={robotSpinY}
              cylinderRotation={cylinderRotation}
              fragmentOpacities={fragmentOpacities}
            />
          </Suspense>
        </Canvas>
        </div>
        <p className="sr-only">{t('sections.about.fallbackParagraph')}</p>
      </div>
    </section>
  )
}
