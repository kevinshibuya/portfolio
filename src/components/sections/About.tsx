import type { ReactElement } from 'react'
import { useI18n } from '../../i18n'
import { workExperiences } from '../../data/workExperience'
import { Frame } from '../ui/Frame'
import { PaintWindow } from '../canvas/PaintWindow'

/** The year of the first job on record, read from the experience data. */
const FIRST_YEAR = Math.min(...workExperiences.map((job) => Number(job.period.en.match(/\d{4}/)?.[0] ?? Infinity)))

/**
 * The person, as one scene on cream: a statement set large at the left, the
 * portrait as a frame at the right (it holds the first screen's paint until a
 * photograph takes its place), the years as a numeral cut out of the paint
 * with one line beside it, and two small lines under the portrait.
 */
export function About(): ReactElement {
  const { t } = useI18n()
  const years = String(new Date().getFullYear() - FIRST_YEAR)

  return (
    <section id="about" className="about container grid">
      <h2 className="about-statement h1">{t('about.statement')}</h2>
      <Frame className="about-portrait">
        <PaintWindow />
      </Frame>
      <div className="about-fact">
        <PaintWindow text={years} className="mega about-years" />
        <p className="h4">{t('about.fact')}</p>
      </div>
      <div className="about-meta p2">
        <p>{t('about.stack')}</p>
        <p>{t('about.place')}</p>
      </div>
    </section>
  )
}
