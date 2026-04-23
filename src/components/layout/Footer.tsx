import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-big">{t('footer.bigText')}</div>
      <div className="footer-bottom">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
