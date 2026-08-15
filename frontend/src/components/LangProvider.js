import { createContext, useContext } from 'react'
import { DEFAULT_LANG } from '../lib/i18n'

// Context de idioma de la app. `LangProvider` lo provee desde `App.js` (estado
// inicial de `readLang`, persistencia en `handleSelectLang`). Los componentes
// leen `useLang()` y traducen con `t(lang, ...)` de `lib/i18n`.
const LangContext = createContext({ lang: DEFAULT_LANG, setLang: () => {} })

export function LangProvider({ lang, setLang, children }) {
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}
