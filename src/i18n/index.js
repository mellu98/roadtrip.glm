import { useState, useEffect } from 'react'
import it from './it'
import en from './en'

const translations = { it, en }

const LANGUAGE_KEY = 'roadtrip_language'

export function getLanguage() {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_KEY) : null
  if (saved && translations[saved]) return saved
  // Detect browser language
  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : 'it'
  return translations[browserLang] ? browserLang : 'it'
}

export function setLanguage(lang) {
  localStorage.setItem(LANGUAGE_KEY, lang)
}

export function t(key) {
  const lang = getLanguage()
  const keys = key.split('.')
  let result = translations[lang]
  for (const k of keys) {
    result = result?.[k]
  }
  return result || key
}

export function useTranslation() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const handleLangChange = () => forceUpdate(n => n + 1)
    window.addEventListener('languagechange', handleLangChange)
    return () => window.removeEventListener('languagechange', handleLangChange)
  }, [])

  return {
    t,
    lang: getLanguage(),
    setLang: (l) => {
      setLanguage(l)
      window.dispatchEvent(new Event('languagechange'))
    },
  }
}
