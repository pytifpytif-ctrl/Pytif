import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const BalanceContext = createContext(null)
const STORAGE_KEY = 'pytif-hide-balance'

export function BalanceProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY) === '1'
  })

  useEffect(() => {
    if (hidden) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  }, [hidden])

  const toggle = useCallback(() => setHidden((h) => !h), [])

  // Replace a formatted amount with a masked placeholder when hidden.
  const mask = useCallback((value) => (hidden ? '••••••' : value), [hidden])

  const value = useMemo(() => ({ hidden, toggle, mask }), [hidden, toggle, mask])
  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
}

export function useBalance() {
  const ctx = useContext(BalanceContext)
  if (!ctx) throw new Error('useBalance must be used within BalanceProvider')
  return ctx
}
