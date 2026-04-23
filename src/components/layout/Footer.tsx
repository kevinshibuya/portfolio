import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-bg-dark text-text-light px-6 md:px-12 lg:px-20 pt-14 pb-9 border-t border-border-light">
      <h2
        className="ghost-outline--dark font-display font-bold lowercase leading-[0.88] tracking-[-0.06em] m-0 mb-10 whitespace-nowrap overflow-hidden"
        style={{ fontSize: 'clamp(80px, 18vw, 280px)' }}
      >
        {t('footer.bigText')}
      </h2>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-6 border-t border-border-light font-body text-[11px] lowercase tracking-[0.04em] text-text-light/40">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
