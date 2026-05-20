import { useTranslation } from 'react-i18next'
import { ABOUT_BEATS } from '../../data/aboutBeats'

export function AboutFallback() {
  const { t } = useTranslation()

  return (
    <section
      id="about"
      className="about-fallback"
      aria-label={t('sections.about.label')}
    >
      <picture className="about-fallback__media">
        <source
          srcSet="/images/about-toy-poster.webp"
          type="image/webp"
        />
        <img
          src="/images/about-toy-poster.png"
          alt=""
          role="img"
          width={640}
          height={640}
          loading="lazy"
          decoding="async"
        />
      </picture>

      {ABOUT_BEATS.map((beat) => (
        <article key={beat.id} className="about-fallback__beat">
          <div className="about-fallback__eyebrow">
            {t(beat.eyebrowKey)}
          </div>
          <h3 className="about-fallback__title">{t(beat.titleKey)}</h3>
          <p className="about-fallback__body">{t(beat.bodyKey)}</p>
        </article>
      ))}
    </section>
  )
}
