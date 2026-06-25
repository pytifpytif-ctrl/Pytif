import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { subscribeUserData } from '../lib/realtime.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

const LiveDataContext = createContext({ version: 0, bump: () => {} })

export function LiveDataProvider({ children }) {
  const { user, refresh } = useAuth()
  const [version, setVersion] = useState(0)
  const refreshTimer = useRef(null)

  const bump = useCallback(() => {
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined

    const onLive = () => {
      bump()
      clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        refresh()
      }, 250)
    }

    let unsubRealtime = () => {}
    if (isSupabaseConfigured) {
      unsubRealtime = subscribeUserData(user.id, onLive)
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') onLive()
    }
    document.addEventListener('visibilitychange', onVisible)

    const onOnline = () => onLive()
    window.addEventListener('online', onOnline)

    const pollMs = isSupabaseConfigured ? 45000 : 5000
    const pollId = setInterval(bump, pollMs)

    return () => {
      unsubRealtime()
      clearTimeout(refreshTimer.current)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      clearInterval(pollId)
    }
  }, [user?.id, bump, refresh])

  return <LiveDataContext.Provider value={{ version, bump }}>{children}</LiveDataContext.Provider>
}

export function useLiveData() {
  return useContext(LiveDataContext)
}

/** Safe outside provider (auth pages). */
export function useLiveDataOptional() {
  return useContext(LiveDataContext)
}
