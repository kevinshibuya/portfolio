import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import en from './locales/en.json'
import pt from './locales/pt.json'
import type { Lang } from '../types/content'

/**
 * The site's two languages, held in one context.
 *
 * `t('a.b.c')` reads a string from the active locale file and fills
 * `{{name}}` slots from `vars`; a numeric `count` picks the `_one` or `_other`
 * form of the key. A key missing from the active locale falls back to English,
 * then to the key itself.
 */

type Dictionary = { readonly [key: string]: string | Dictionary }
type Vars = Readonly<Record<string, string | number>>

const DICTIONARIES: Record<Lang, Dictionary> = { en, pt }

function lookup(dictionary: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dictionary
  for (const part of key.split('.')) {
    if (typeof node !== 'object') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

function translate(lang: Lang, key: string, vars?: Vars): string {
  const plural = typeof vars?.count === 'number' ? `${key}_${vars.count === 1 ? 'one' : 'other'}` : null
  const template =
    (plural && (lookup(DICTIONARIES[lang], plural) ?? lookup(DICTIONARIES.en, plural))) ??
    lookup(DICTIONARIES[lang], key) ??
    lookup(DICTIONARIES.en, key) ??
    key
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (slot, name: string) => (name in vars ? String(vars[name]) : slot))
}

/** `?lang=en|pt` on the URL picks the first language; anything else is English. */
function initialLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    if (param === 'en' || param === 'pt') return param
  } catch {
    /* malformed query string: fall through to the default */
  }
  return 'en'
}

export type Translate = (key: string, vars?: Vars) => string

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }): ReactElement {
  const [lang, setLang] = useState<Lang>(initialLang)

  // The document's language follows the active one, so screen readers,
  // hyphenation and spellcheck read Portuguese copy as Portuguese.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const t = useCallback<Translate>((key, vars) => translate(lang, key, vars), [lang])
  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used within I18nProvider')
  return value
}
