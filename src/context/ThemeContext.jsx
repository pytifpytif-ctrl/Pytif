import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'pytif-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function systemPrefersDark() {
  return typeof window !== 'undefined' && media().matches
}

function applyTheme(mode) {
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', isDark)
  return isDark
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'system'
    return localStorage.getItem(STORAGE_KEY) || 'system'
  })
  const [isDark, setIsDark] = useState(() => applyTheme(mode))

  useEffect(() => {
    setIsDark(applyTheme(mode))
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  // React to OS changes only while following the system.
  useEffect(() => {
    if (mode !== 'system') return undefined
    const mq = media()
    const onChange = () => setIsDark(applyTheme('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  // Cycle light -> dark -> system -> light
  const cycle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'))
  }, [])

  const value = useMemo(() => ({ mode, isDark, setMode, cycle }), [mode, isDark, cycle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
