import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'jiokoe-theme'

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Saved choice wins; on first visit we fall back to the OS preference.
function getInitialMode() {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme(mode) {
  const isDark = mode === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  return isDark
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode)
  const [isDark, setIsDark] = useState(() => applyTheme(getInitialMode()))

  useEffect(() => {
    setIsDark(applyTheme(mode))
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(() => ({ mode, isDark, setMode, toggle }), [mode, isDark, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
