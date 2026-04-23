import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SectionHeading } from '../ui/SectionHeading'
import { Tag } from '../ui/Tag'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import { workExperiences } from '../../data/workExperience'

export function WorkExperience() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'pt'
  const listRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<number | null>(
    workExperiences[0]?.id ?? null,
  )

  useScrollReveal(listRef, { childSelector: '[data-work-row]', stagger: 0.08 })

  const toggle = (id: number): void => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <section
      id="work"
      className="relative max-w-[1440px] mx-auto px-6 md:px-12 lg:px-20 py-28 md:py-36"
    >
      <SectionHeading
        index={t('sections.work.index')}
        label={t('sections.work.label')}
        title={t('sections.work.title')}
        description={t('sections.work.description')}
        deps={[lang]}
      />

      <div
        ref={listRef}
        className="bg-bg border border-border rounded-[18px] overflow-hidden max-w-[1080px]"
      >
        {workExperiences.map((exp, i) => {
          const open = expandedId === exp.id
          const num = String(i + 1).padStart(2, '0')

          return (
            <div
              key={exp.id}
              data-work-row
              className={`border-b border-border last:border-b-0 transition-colors duration-500 ${
                open ? 'bg-bg-sand' : 'bg-transparent'
              }`}
            >
              <button
                onClick={() => toggle(exp.id)}
                className="w-full text-left grid [grid-template-columns:40px_1fr_24px] md:[grid-template-columns:56px_1fr_28px] gap-4 md:gap-6 items-center px-5 md:px-8 py-6 md:py-7 hover:bg-bg-sand transition-colors duration-500 group cursor-pointer"
                aria-expanded={open}
              >
                <span className="font-body text-[11px] tabular-nums tracking-[0.1em] text-text-faded">
                  {num}
                </span>

                <div className="flex flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3
                      className={`font-display font-medium lowercase tracking-[-0.02em] text-[22px] md:text-2xl transition-colors duration-300 ${
                        open
                          ? 'text-terra-400'
                          : 'text-text group-hover:text-terra-400'
                      }`}
                    >
                      {exp.company}
                    </h3>
                    <span className="font-body text-[11px] tabular-nums lowercase tracking-[0.08em] text-text-muted whitespace-nowrap">
                      {exp.period}
                    </span>
                  </div>
                  <span className="font-body text-[13px] lowercase tracking-[0.02em] text-terra-400">
                    {exp.role[lang]}
                  </span>
                </div>

                <motion.span
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className={`font-body text-2xl font-light leading-none transition-colors duration-300 ${
                    open ? 'text-terra-400' : 'text-text'
                  }`}
                >
                  +
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key="body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 md:pl-[112px] md:pr-8 pb-8">
                      <ul className="flex flex-col gap-2.5 mb-6">
                        {exp.description[lang].map((bullet, j) => (
                          <li
                            key={j}
                            className="relative pl-5 font-body text-[14px] lowercase leading-[1.6] text-text-muted before:content-[''] before:absolute before:left-0 before:top-[0.65em] before:w-2 before:h-px before:bg-terra-300"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>

                      {exp.highlight && (
                        <div
                          className="mb-5 max-w-[640px] bg-terra-50 border-l-[3px] border-terra-400 px-5 py-3.5"
                          style={{ borderRadius: '0 10px 10px 0' }}
                        >
                          <span className="block mb-1 font-body text-[10px] font-semibold uppercase tracking-[0.15em] text-terra-500">
                            {t('sections.work.award')}
                          </span>
                          <p className="font-body text-[13px] lowercase leading-[1.5] text-text m-0">
                            {exp.highlight[lang]}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {exp.technologies.map((tech) => (
                          <Tag
                            key={tech}
                            label={tech.toLowerCase()}
                            variant="muted"
                            size="md"
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}
