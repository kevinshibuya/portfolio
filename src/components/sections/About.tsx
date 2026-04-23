import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { useScrollReveal } from '../../hooks/useScrollReveal'

export function About() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const contentRef = useRef<HTMLDivElement>(null)

  useScrollReveal(contentRef, { stagger: 0.15 })

  const tags = useMemo(() => {
    const value = t('sections.about.tags', { returnObjects: true })
    return Array.isArray(value) ? (value as string[]) : []
  }, [t, lang])

  return (
    <section
      id="about"
      className="relative max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-28 md:py-36"
    >
      <SectionHeading
        index={t('sections.about.index')}
        label={t('sections.about.label')}
        title={t('sections.about.title')}
        deps={[lang]}
      />

      <div
        ref={contentRef}
        className="grid grid-cols-1 md:[grid-template-columns:380px_1fr] gap-12 md:gap-20 items-start"
      >
        <div className="flex flex-col gap-3.5 max-w-[380px]">
          <div
            className="relative aspect-[3/4] rounded-[24px] overflow-hidden grid place-items-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.015]"
            style={{
              background:
                'linear-gradient(160deg, #F8C5AE 0%, #F0A582 60%, #E07A56 100%)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.25), transparent 60%)',
              }}
              aria-hidden="true"
            />
            <span
              className="relative z-10 font-display font-bold lowercase tracking-[-0.04em]"
              style={{
                fontSize: 'clamp(96px, 15vw, 160px)',
                color: 'rgba(26, 21, 18, 0.18)',
              }}
            >
              ks
            </span>
          </div>
          <span className="font-body text-[11px] lowercase tracking-[0.08em] text-text-faded">
            {t('sections.about.portraitCaption')}
          </span>
        </div>

        <div className="pt-2 md:pt-5">
          <p
            className="hero-bio-lede font-body font-normal lowercase tracking-[-0.02em] text-text leading-[1.25] mb-7"
            style={{ fontSize: 'clamp(24px, 2.4vw, 34px)' }}
            dangerouslySetInnerHTML={{ __html: t('sections.about.lede') }}
          />
          <p className="max-w-[560px] font-body text-[16px] lowercase leading-[1.7] text-text-muted mb-5">
            {t('sections.about.bio1')}
          </p>
          <p className="max-w-[560px] font-body text-[16px] lowercase leading-[1.7] text-text-muted">
            {t('sections.about.bio2')}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-7">
            {tags.map((tag) => (
              <Tag key={tag} label={tag} variant="muted" size="md" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
