import { useTranslation } from 'react-i18next'
import { archive, yearBlocks } from '../../data/archive'
import { resolveTitle, type ArchiveItem } from '../../types/content'
import { WorkRow } from '../ui/WorkRow'
import { accentFor, accentDeepFor, accentDeepLargeFor } from '../../utils/palette'

/**
 * The archive's accessible twin.
 *
 * The wall is 171 cells drawn on a canvas, which is nothing at all to a
 * keyboard or a screen reader. This is the same 171 pieces as real DOM, year by
 * year, in the wall's own reading order — one component in two states.
 *
 * `hidden` is the state that runs alongside the scene: every row is focusable
 * but clipped to a pixel, and focusing one both surfaces it as a pill at the
 * top of the viewport and travels the camera to its cell. `visible` is the
 * whole thing in normal flow, and it is the archive when there is no WebGL to
 * draw the wall with.
 *
 * No state, no Framer Motion, no canvas import, no router hook — the camera
 * travel belongs to the section that owns the wrapper, and reaches here as
 * `onRowFocus`.
 */

/** Static data: the packing never changes at runtime, so neither does this. */
const BLOCKS = yearBlocks(archive)

/** `dd/mm/yyyy` → `dd.mm`. Case studies carry a bare year and never reach this. */
function dayMonth(date: string): string {
  const [day, month] = date.split('/')
  return day && month ? `${day}.${month}` : date
}

export interface StreamProps {
  /** 'hidden' while the scene runs (focusable, offscreen); 'visible' without WebGL. */
  mode: 'hidden' | 'visible'
  /** Fires on focus of a row, with the archive item id. Undefined in 'visible' mode. */
  onRowFocus?: (itemId: string) => void
}

export function Stream({ mode, onRowFocus }: StreamProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const hidden = mode === 'hidden'

  return (
    <section
      id="archive"
      className={`stream ${hidden ? 'stream--hidden' : 'stream--visible'}`}
      aria-labelledby="stream-title"
    >
      {/* First in DOM order, so a reader who does not want 171 rows meets the
          way out before the first of them. */}
      {hidden && (
        <a className="stream-skip" href="#work">
          {t('sections.archive.skipPast')}
        </a>
      )}

      <header className="stream-header">
        <h2 id="stream-title" className="stream-title">
          {t('sections.archive.title')}
        </h2>
        <p className="stream-total">{t('sections.archive.pieces', { count: archive.length })}</p>
      </header>

      {BLOCKS.map((block) => (
        <div className="stream-year" data-year={block.year} key={block.year}>
          <h3 className="stream-year-label">
            {block.year}
            <span className="stream-year-count">
              {t('sections.archive.pieces', { count: block.count })}
            </span>
          </h3>
          <ol className="stream-list">
            {block.items.map((item) => (
              <StreamItem key={item.id} item={item} lang={lang} onRowFocus={onRowFocus} />
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
  onRowFocus?: (itemId: string) => void
}

function StreamItem({ item, lang, onRowFocus }: StreamItemProps): React.ReactElement {
  const { t } = useTranslation()
  const title = resolveTitle(item, lang)
  // The item's position in the WHOLE stream, newest at 0, so the tricolor
  // rotates down the list rather than restarting inside every year.
  const position = archive.length - item.serial
  const serial = String(item.serial)

  // Focus bubbles, so one handler on the li covers both row kinds — WorkRow
  // exposes no onFocus of its own, and the dense row would need a second copy.
  const onFocus = onRowFocus ? () => onRowFocus(item.id) : undefined

  return (
    <li
      className="stream-item"
      data-item-id={item.id}
      data-serial={item.serial}
      data-origin={item.origin}
      onFocus={onFocus}
    >
      {item.caseStudy ? (
        <>
          <span className="stream-serial" aria-hidden="true">
            {serial}
          </span>
          <WorkRow
            index={position}
            title={title}
            // The wall's own word, not the raw value: PT `personal` is
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
          <span className="stream-body">
            {/* Editorial titles are Portuguese only (ADR 0001), so the row
                declares the language its own text is actually in. */}
            <span className="stream-row-title" lang="pt">
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
