import { useCallback, useState, type ReactElement } from 'react'
import { useI18n } from '../../i18n'
import { useLenis } from '../../hooks/useLenis'
import { EMAIL, socialLinks } from '../../data/social'
import { FluidWaves } from '../canvas/FluidWaves'
import { Label } from '../ui/Label'
import { Roll } from '../ui/Roll'
import { Arrow, type ArrowKind } from '../ui/Arrow'
import { WorkRow } from '../ui/WorkRow'
import { NameHover } from '../ui/NameHover'

/** The share of the closing's height over which the paint rises out of the black above it. */
const SINK_TOP = 0.3

interface Channel {
  key: 'linkedin' | 'github' | 'resume'
  value: string
  href: string
  mark: ArrowKind
  download?: boolean
}

function socialUrl(platform: 'github' | 'linkedin'): string {
  return socialLinks.find((link) => link.platform === platform)?.url ?? '#'
}

/**
 * The block every page ends on: contact, then the footer, on the first
 * screen's paint shown at about a third of its brightness and entered from
 * black through the liquid edge. The address is a work row; the name in the
 * credit answers the pointer. The paint mounts only when the block is near.
 */
export function Closing(): ReactElement {
  const { t, lang } = useI18n()
  const { scrollTo } = useLenis()
  const year = new Date().getFullYear()

  const [near, setNear] = useState(false)
  const stageRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node || near) return
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setNear(true)
            io.disconnect()
          }
        },
        { rootMargin: '60% 0px' },
      )
      io.observe(node)
      return () => io.disconnect()
    },
    [near],
  )

  const channels: Channel[] = [
    {
      key: 'linkedin',
      value: 'in/kevin-shibuya',
      href: lang === 'pt' ? `${socialUrl('linkedin')}/?locale=pt` : socialUrl('linkedin'),
      mark: 'out',
    },
    { key: 'github', value: '@kevinshibuya', href: socialUrl('github'), mark: 'out' },
    { key: 'resume', value: t('contact.resumeValue'), href: `/cv-${lang}.pdf`, mark: 'down', download: true },
  ]

  return (
    <footer id="contact" className="closing" data-theme="dark" ref={stageRef}>
      <div className="closing-paint">{near && <FluidWaves kind="footer" sinkTop={SINK_TOP} />}</div>

      <div className="closing-body container">
        <div className="contact">
          <h2>
            <Label text={t('contact.title')} />
          </h2>
          <div className="contact-mail">
            <WorkRow big href={`mailto:${EMAIL}`} title={EMAIL} mark="out" />
          </div>
          <ul className="channels grid">
            {channels.map((channel) => (
              <li key={channel.key} className="channel">
                <span className="channel-name">{t(`contact.${channel.key}`)}</span>
                <a
                  href={channel.href}
                  className="channel-link p1"
                  target={channel.href.startsWith('http') ? '_blank' : undefined}
                  rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  download={channel.download ? '' : undefined}
                >
                  <Roll>{channel.value}</Roll>
                  <Arrow kind={channel.mark} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer grid">
          <p className="footer-copy">{t('footer.copyright', { year })}</p>
          <p className="footer-credit">
            {t('footer.by')} <NameHover text={t('footer.name')} side="up" filmed />
          </p>
          <p className="footer-end">
            <span>{t('footer.place')}</span>
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                scrollTo(0, { duration: 1.2 })
              }}
            >
              <Roll>{t('footer.top')}</Roll>
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
