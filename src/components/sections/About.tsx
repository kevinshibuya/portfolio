import { Trans, useTranslation } from 'react-i18next'
import { Stagger } from '../ui/Stagger'
import { SectionHeading } from '../ui/SectionHeading'
import { STAGGER_PRESETS } from '../../utils/animations'

interface Tactic {
  num: string
  title: string
  body: string
}

export function About() {
  const { t } = useTranslation()

  // Mirrors the defensive pattern in Hero.tsx — t() with returnObjects can
  // hand back a string when the key is missing or i18next isn't ready yet.
  const rawTactics = t('sections.about.tactics', { returnObjects: true })
  const tactics: Tactic[] = Array.isArray(rawTactics) ? (rawTactics as Tactic[]) : []

  return (
    <section id="about" className="section">
      <SectionHeading title={t('sections.about.title')} />

      <div className="about-grid">
        <div className="about-bio-wrap">
          <p className="about-bio">
            <Trans i18nKey="sections.about.bio" components={{ em: <em /> }} />
          </p>
        </div>

        <Stagger
          recipe="fadeUp"
          stagger={STAGGER_PRESETS.workRows}
          className="about-tactics"
        >
          {tactics.map((tactic, i) => (
            <div key={tactic.num} className="about-tactic">
              <span className="about-tactic-num">{tactic.num}</span>
              <div>
                <h3 className="about-tactic-title">
                  {t(`sections.about.tactics.${i}.title`)}
                </h3>
                <p className="about-tactic-body">
                  <Trans
                    i18nKey={`sections.about.tactics.${i}.body`}
                    components={{ em: <em /> }}
                  />
                </p>
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
