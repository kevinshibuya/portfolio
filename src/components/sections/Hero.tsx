import { useEffect, type CSSProperties, type ReactElement } from 'react'
import { useI18n } from '../../i18n'
import { useEntered } from '../../hooks/useEntered'
import { FluidWaves } from '../canvas/FluidWaves'

const line = (index: number): CSSProperties => ({ '--rise-i': index }) as CSSProperties

/**
 * The first screen: the name set large at the bottom left, the role line above
 * it, both directly on the paint. The paint runs on below the first screen for
 * a band, where it dissolves into the cream page.
 */
export function Hero(): ReactElement {
  const { t, lang } = useI18n()
  const { entered, settled, instant } = useEntered(3)

  // The paint stays dark behind the type's own boxes: tell it when they move.
  useEffect(() => {
    window.dispatchEvent(new Event('hero:measure'))
  }, [lang, settled])

  return (
    // data-entrance="settled" marks the moment the rise has finished (or was
    // skipped): capture tooling waits on it. Nothing in the app reads it.
    <section id="top" className="hero" data-entrance={settled ? 'settled' : undefined} data-motion="entrance">
      <div className="hero-canvas">
        <FluidWaves kind="hero" />
      </div>
      <div className="hero-zone">
        <div
          className={`hero-bottom container rise${entered ? ' is-entered' : ''}${settled ? ' is-settled' : ''}${instant ? ' is-instant' : ''}`}
        >
          <p className="rise-mask hero-role-line">
            <span className="rise-line hero-role" style={line(0)}>
              {t('hero.role')}
            </span>
          </p>
          <h1 className="hero-name" aria-label={`${t('hero.name1')} ${t('hero.name2')}`}>
            <span className="rise-mask">
              <span className="rise-line" style={line(1)}>
                {t('hero.name1')}
              </span>
            </span>
            <span className="rise-mask rise-mask--descender">
              <span className="rise-line" style={line(2)}>
                {t('hero.name2')}
              </span>
            </span>
          </h1>
        </div>
      </div>
      <div className="hero-band" aria-hidden="true" />
    </section>
  )
}
