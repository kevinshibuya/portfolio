import { useTranslation } from 'react-i18next'
import { FooterNameMarquee } from '../ui/FooterNameMarquee'

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
          {t('sections.footer.modelAttribution', { author: 'TBD-replaced-Task-17' })}
        </span>
      </div>
    </footer>
  )
}
