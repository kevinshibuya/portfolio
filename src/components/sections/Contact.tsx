import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RevealOnView, childVariants } from '../ui/RevealOnView'
import { EMAIL, socialLinks } from '../../data/social'

interface ContactRowData {
  num: string
  label: string
  meta: string
  href: string
}

function getSocialUrl(platform: string): string {
  return socialLinks.find((l) => l.platform === platform)?.url ?? '#'
}

export function Contact() {
  const { t } = useTranslation()
  const contactTitleRef = useRef<HTMLHeadingElement>(null)

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
      meta: 'in/kevinshibuya',
      href: getSocialUrl('linkedin'),
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
      meta: 'kevin-shibuya.pdf',
      href: '/resume',
    },
  ]

  return (
    <section id="contact" className="section section--contact">
      <div className="contact-inner">
        <RevealOnView variant="fade-up">
          <span className="section-index">
            {t('sections.contact.index')} · {t('sections.contact.label')}
          </span>
          <h2
            ref={contactTitleRef}
            className="contact-title section-title"
            dangerouslySetInnerHTML={{ __html: t('sections.contact.title') }}
          />
          <p className="contact-lede">{t('sections.contact.subtitle')}</p>
        </RevealOnView>

        <RevealOnView variant="stagger-children" staggerAmount={0.06} className="contact-list">
          {rows.map((row) => (
            // ContactRow renders the motion.a directly — wrapping in motion.div
            // would make every .contact-row a sole child, breaking any
            // adjacent-sibling row dividers.
            <ContactRow key={row.num} {...row} />
          ))}
        </RevealOnView>
      </div>
    </section>
  )
}

function ContactRow({ num, label, meta, href }: ContactRowData) {
  const isExternal = href.startsWith('http')
  return (
    <motion.a
      variants={childVariants}
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="contact-row"
    >
      <span className="contact-num">{num}</span>
      <span className="contact-label">
        {label}
        <span className="contact-label-arrow">→</span>
      </span>
      <span className="contact-meta">{meta}</span>
      <span className="contact-icon">↗</span>
    </motion.a>
  )
}
