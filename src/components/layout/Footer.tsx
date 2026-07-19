import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t, i18n } = useTranslation()
  const year = new Date().getFullYear()
  const toggleLanguage = (): void => {
    i18n.changeLanguage(i18n.language.startsWith('pt') ? 'en' : 'pt')
  }

  return (
    <footer className="footer">
      <h2 className="footer-name">{t('footer.bigText')}</h2>
      <div className="footer-bottom">
        <div className="footer-meta-left">
          <span>{t('footer.copyright', { year })}</span>
          <span className="footer-meta-sep" aria-hidden="true">·</span>
          <span>{t('footer.builtWith')}</span>
        </div>
        <div className="footer-meta-right">
          <span>{t('footer.location')}</span>
          <span className="footer-meta-sep" aria-hidden="true">·</span>
          <button
            className="footer-lang"
            onClick={toggleLanguage}
            aria-label={t('footer.langSwitch')}
          >
            {t('lang')}
          </button>
        </div>
      </div>
    </footer>
  )
}
