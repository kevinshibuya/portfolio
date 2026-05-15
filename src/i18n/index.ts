import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import pt from './locales/pt.json'

// Respect ?lang=en|pt on the URL at first paint so deep-links can pick
// a language without the user toggling the header switch. Anything else
// (missing, "fr", junk) falls through to English.
function getInitialLang(): 'en' | 'pt' {
  if (typeof window === 'undefined') return 'en'
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    if (param === 'en' || param === 'pt') return param
  } catch {
    /* malformed query string — fall through to default */
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: getInitialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
