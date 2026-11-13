import { useTranslation } from 'react-i18next'
import { archive, yearBlocks } from '../../data/archive'
import { resolveTitle, type ArchiveItem } from '../../types/content'
import { WorkRow } from '../ui/WorkRow'
import { accentFor, accentDeepFor, accentDeepLargeFor } from '../../utils/palette'

/**
 * Every piece, year by year, newest first, as real DOM in normal flow: the
 * content of All work (ADR 0014). Case studies link to their detail route,
 * Embeds out to the publisher.
 *
 * No state, no Framer Motion, no canvas import, no router hook.
 */

/** Static data: the packing never changes at runtime, so neither does this. */
const BLOCKS = yearBlocks(archive)

/** `dd/mm/yyyy` → `dd.mm`. Case studies carry a bare year and never reach this. */
function dayMonth(date: string): string {
  const [day, month] = date.split('/')
  return day && month ? `${day}.${month}` : date
}

export interface StreamProps {
  /** The title's heading level, years one below: 3 under the home page's section
   *  `h2`, 1 where the Stream is the page itself (All work). */
  headingLevel?: 1 | 3
}

export function Stream({ headingLevel = 3 }: StreamProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const Title = headingLevel === 1 ? 'h1' : 'h3'
  const YearLabel = headingLevel === 1 ? 'h2' : 'h4'

  return (
    <section
      id="archive"
      className="stream stream--visible"
      aria-labelledby="stream-title"
    >
      <header className="stream-header">
        <Title id="stream-title" className="stream-title">
          {t('sections.archive.title')}
        </Title>
        <p className="stream-total">{t('sections.archive.pieces', { count: archive.length })}</p>
      </header>

      {BLOCKS.map((block) => (
        <div className="stream-year" data-year={block.year} key={block.year}>
          <YearLabel className="stream-year-label">
            {block.year}
            <span className="stream-year-count">
              {t('sections.archive.pieces', { count: block.count })}
            </span>
          </YearLabel>
          <ol className="stream-list">
            {block.items.map((item) => (
              <StreamItem key={item.id} item={item} lang={lang} />
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}

interface StreamItemProps {
  item: ArchiveItem
  lang: 'en' | 'pt'
}

function StreamItem({ item, lang }: StreamItemProps): React.ReactElement {
  const { t } = useTranslation()
  const title = resolveTitle(item, lang)
  // The item's position in the WHOLE stream, newest at 0, so the tricolor
  // rotates down the list rather than restarting inside every year.
  const position = archive.length - item.serial
  const serial = String(item.serial)

  return (
    <li
      className="stream-item"
      data-item-id={item.id}
      data-serial={item.serial}
      data-origin={item.origin}
    >
      {item.caseStudy ? (
        <>
          <span className="stream-serial" aria-hidden="true">
            {serial}
          </span>
          <WorkRow
            index={position}
            title={title}
            // The localised word, not the raw value: PT `personal` is
            // `pessoal`, and the stream must not read English beside it.
            // `professional` is the default and says nothing worth a line.
            meta={
              item.origin === 'professional' ? undefined : [t(`sections.archive.origin.${item.origin}`)]
            }
            href={item.href}
            internal={item.internal}
          />
        </>
      ) : (
        <a
          className="stream-row"
          href={item.href}
          target="_blank"
          rel="noreferrer"
          style={{
            '--row-tint': accentFor(position),
            '--row-tint-deep': accentDeepFor(position),
            '--row-tint-deep-large': accentDeepLargeFor(position),
          } as React.CSSProperties}
        >
          <span className="stream-serial" aria-hidden="true">
            {serial}
          </span>
          {/* Editorial titles, types and outlets are Portuguese only (ADR
              0001), so the body declares the language its text is actually in. */}
          <span className="stream-body" lang="pt">
            <span className="stream-row-title">
              {title}
            </span>
            <span className="stream-row-meta">
              {[item.type, item.editorial, dayMonth(item.date)]
                .filter((part): part is string => Boolean(part))
                .map((part, i) => (
                  <span key={i} className="stream-row-meta-item">
                    {part}
                  </span>
                ))}
            </span>
          </span>
          <span className="stream-row-arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      )}
    </li>
  )
}
