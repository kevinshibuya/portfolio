import { useTranslation } from 'react-i18next'
import { RevealOnView } from '../ui/RevealOnView'
import { EMAIL, socialLinks } from '../../data/social'

// Contact keeps its heading reveal — unlike the other sections, this one
// is the page's closing moment, so the stampIn pause before the link
// list fades up reads as intentional emphasis rather than scroll noise.

interface ContactRowData {
  num: string
  label: string
  meta: string
  href: string
  download?: boolean
}

function getSocialUrl(platform: string): string {
  return socialLinks.find((l) => l.platform === platform)?.url ?? '#'
}

interface ContactProps {
  // Home renders Contact as section 05; project detail reuses the same
  // component as a closing CTA where "05 · get in touch" is meaningless.
  // Pass false from any non-home host to drop the eyebrow.
  showSectionIndex?: boolean
}

export function Contact({ showSectionIndex = true }: ContactProps = {}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'pt' ? 'pt' : 'en'
  const cvFile = `cv-${lang}.pdf`

  const rows: ContactRowData[] = [
    {
      num: '01',
      label: t('sections.contact.links.email'),
      meta: EMAIL,
      href: `mailto:${EMAIL}`,
    },
    {
      num: '02',
      label: t('sections.contact.links.linkedin'),
      meta: 'in/kevin-shibuya',
      href:
        lang === 'pt'
          ? `${getSocialUrl('linkedin')}/?locale=pt`
          : getSocialUrl('linkedin'),
    },
    {
      num: '03',
      label: t('sections.contact.links.github'),
      meta: '@kevinshibuya',
      href: getSocialUrl('github'),
    },
    {
      num: '04',
      label: t('sections.contact.links.resume'),
      meta: cvFile,
      href: `/${cvFile}`,
      download: true,
    },
  ]

  return (
    <section id="contact" className="section section--contact">
      <div className="contact-inner">
        <RevealOnView recipe="stampIn">
          {showSectionIndex && (
            <span className="section-index">
              {t('sections.contact.index')} · {t('sections.contact.label')}
            </span>
          )}
          <h2
            className="contact-title section-title"
            dangerouslySetInnerHTML={{ __html: t('sections.contact.title') }}
          />
          <p className="contact-lede">{t('sections.contact.subtitle')}</p>
        </RevealOnView>

        <RevealOnView recipe="fadeUp" className="contact-list section-spacing-content">
          {rows.map((row) => (
            <ContactRow key={row.num} {...row} />
          ))}
        </RevealOnView>
      </div>
    </section>
  )
}

function ContactRow({ num, label, meta, href, download }: ContactRowData) {
  const isExternal = href.startsWith('http')
  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      download={download ? '' : undefined}
      className="contact-row"
    >
      <span className="contact-num">{num}</span>
      <span className="contact-label">
        {label}
        <span className="contact-label-arrow">→</span>
      </span>
      <span className="contact-meta">{meta}</span>
      <span className="contact-icon">↗</span>
    </a>
  )
}
