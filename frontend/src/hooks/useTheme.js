import { useEffect, useState } from 'react'

const THEME_KEY = 'mandarina-theme'
const LEGACY_KEYS = ['mandarine-theme', 'fimplify-theme']

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored =
      localStorage.getItem(THEME_KEY) ??
      LEGACY_KEYS.map((k) => localStorage.getItem(k)).find((v) => v != null)
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark]
}
