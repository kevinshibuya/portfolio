import { useTranslation } from 'react-i18next'
import { FooterNameMarquee } from '../ui/FooterNameMarquee'

const MODEL_URL =
  'https://sketchfab.com/3d-models/vintage-toy-robot-7780d6de101b47e085fc5397f7e33701'
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <FooterNameMarquee />
      <div className="footer-bottom">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.builtWith')}</span>
        <span className="footer-meta__attribution">
          {t('sections.footer.modelCredit')}{' '}
          <a href={MODEL_URL} target="_blank" rel="noopener noreferrer">
            Vintage Toy Robot
          </a>
          {' '}
          {t('sections.footer.by')} Tom Scudder {t('sections.footer.via')} Sketchfab ·{' '}
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
        </span>
      </div>
    </footer>
  )
}
