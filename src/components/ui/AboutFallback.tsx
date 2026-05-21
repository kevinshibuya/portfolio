import { useTranslation } from 'react-i18next'

export function AboutFallback() {
  const { t } = useTranslation()

  return (
    <section id="about" className="about-fallback">
      <small className="about-fallback__label">{t('sections.about.label')}</small>
      <picture className="about-fallback__picture">
        <source type="image/webp" srcSet="/images/about-toy-poster.webp" />
        <img
          src="/images/about-toy-poster.png"
          alt=""
          className="about-fallback__poster"
          loading="lazy"
        />
      </picture>
      <p className="about-fallback__paragraph">
        {t('sections.about.fallbackParagraph')}
      </p>
    </section>
  )
}
