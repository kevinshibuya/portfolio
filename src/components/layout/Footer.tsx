import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { SPRINGS } from '../../utils/animations'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <motion.div
        className="footer-big"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0, transition: SPRINGS.soft }}
        viewport={{ once: true, amount: 0.3 }}
      >
        {t('footer.bigText')}
      </motion.div>
      <div className="footer-bottom">
        <span>{t('footer.copyright', { year })}</span>
        <span>{t('footer.builtWith')}</span>
      </div>
    </footer>
  )
}
