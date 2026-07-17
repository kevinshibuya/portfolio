import { useRef } from 'react'
import { useScroll } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { HalftonePortrait } from '../../canvas/halftone/HalftonePortrait'

/**
 * Scene 1 — the byline. An asymmetric two-column composition: a halftone
 * portrait that "develops" (coarse → fine dots) as the section scrolls past,
 * offset from a wider first-person text column, with one scanned-handwriting
 * margin note tucked into the outer margin.
 *
 * The develop scrub is driven by a Framer `useScroll` progress MotionValue
 * scoped to the section root and passed straight into `HalftonePortrait` — the
 * scrub never touches React state, so it can't freeze an in-flight entrance
 * cascade. Plan 2 may re-source `progress` from the global Lenis MotionValue;
 * the `HalftonePortrait` prop contract is unchanged.
 */
export function Byline(): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  return (
    <section id="byline" className="byline" ref={ref}>
      <div className="byline-inner">
        <figure className="byline-portrait">
          <HalftonePortrait
            src="/images/portrait-placeholder.jpg"
            fallbackSrc="/images/portrait-duotone-placeholder.jpg"
            progress={scrollYProgress}
            alt={t('byline.portraitAlt')}
            className="byline-portrait-media"
          />
          <figcaption className="byline-caption">
            {t('byline.caption')}
          </figcaption>
        </figure>

        <div className="byline-text">
          <p className="byline-body">{t('byline.body')}</p>
        </div>

        <img
          className="byline-margin-note"
          src="/images/margin-note-placeholder.png"
          alt={t('byline.marginNoteAlt')}
        />
      </div>
    </section>
  )
}
