import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { EMAIL, socialLinks } from '../../data/social'

interface ContactRowData {
  num: string
  label: string
  meta: string
  href: string
}

function findLinkByPlatform(platform: string): string {
  return socialLinks.find((l) => l.platform === platform)?.url ?? '#'
}

export function Contact() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const contentRef = useRef<HTMLDivElement>(null)

  useScrollReveal(contentRef, {
    childSelector: '[data-contact-row]',
    stagger: 0.08,
  })

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
      href: findLinkByPlatform('linkedin'),
    },
    {
      num: '03',
      label: t('sections.contact.links.github'),
      meta: '@kevinshibuya',
      href: findLinkByPlatform('github'),
    },
    {
      num: '04',
      label: t('sections.contact.links.resume'),
      meta: 'kevin-shibuya.pdf',
      href: '/resume',
    },
  ]

  return (
    <section
      id="contact"
      className="relative bg-bg-dark text-text-light px-6 md:px-12 lg:px-20 pt-32 md:pt-40 pb-24 md:pb-32"
    >
      <div className="max-w-[1100px] mx-auto">
        <span className="block mb-4 font-body text-[11px] font-semibold lowercase tracking-[0.15em] text-terra-200">
          {t('sections.contact.index')} · {t('sections.contact.label')}
        </span>
        <h2
          key={lang}
          className="contact-title-heading font-display font-semibold lowercase leading-[0.88] tracking-[-0.05em] text-text-light m-0 mb-8"
          style={{ fontSize: 'clamp(64px, 13vw, 200px)' }}
          dangerouslySetInnerHTML={{ __html: t('sections.contact.title') }}
        />
        <p className="max-w-[560px] font-body text-[18px] lowercase leading-[1.6] text-text-light-muted mb-12">
          {t('sections.contact.subtitle')}
        </p>

        <div ref={contentRef} className="max-w-[880px]">
          {rows.map((row) => (
            <ContactRow key={row.num} {...row} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ContactRow({ num, label, meta, href }: ContactRowData) {
  const isExternal = href.startsWith('http')
  return (
    <motion.a
      data-contact-row
      data-cursor-hover
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      whileHover="hover"
      initial="rest"
      animate="rest"
      className="group grid items-center gap-5 py-6 border-b border-border-light [grid-template-columns:40px_1fr_auto_24px] md:[grid-template-columns:48px_1fr_auto_32px] transition-[padding-left,background] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:pl-5"
      style={{
        backgroundImage:
          'linear-gradient(90deg, rgba(224,122,86,0.06), transparent)',
        backgroundSize: '0% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <span className="font-body text-[10px] tabular-nums tracking-[0.1em] text-text-light/40">
        {num}
      </span>

      <motion.span
        variants={{
          rest: { fontStyle: 'normal', color: '#FAFAF8' },
          hover: { fontStyle: 'italic', color: '#F0A582' },
        }}
        transition={{ duration: 0.25 }}
        className="font-body font-medium uppercase tracking-[0.08em] leading-tight"
        style={{ fontSize: 'clamp(20px, 2.2vw, 32px)' }}
      >
        {label}
        <span className="inline-block ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          →
        </span>
      </motion.span>

      <motion.span
        variants={{
          rest: { opacity: 0, x: 8 },
          hover: { opacity: 1, x: 0 },
        }}
        transition={{ duration: 0.3 }}
        className="font-body text-[13px] lowercase text-text-light/50"
      >
        {meta}
      </motion.span>

      <span className="font-body text-base text-terra-200 text-center">↗</span>
    </motion.a>
  )
}
