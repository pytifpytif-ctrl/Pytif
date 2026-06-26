import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import { clearUnlock } from '../lib/appPasscode.js'
import { clearPageCache } from '../lib/pageCache.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const u = await api.currentUser()
      setUser(u)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const u = await api.currentUser()
        if (mounted) setUser(u)
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    // Resolve OAuth redirects (Google) and keep the session in sync.
    const unsubscribe = api.onAuthChange?.(async () => {
      try {
        const u = await api.currentUser()
        if (mounted) setUser(u)
      } catch {
        /* Ignore transient network blips during token refresh. */
      }
    })

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [])

  const register = useCallback(async (payload) => {
    const res = await api.register(payload)
    if (res?.user) setUser(res.user)
    return res
  }, [])

  const resendConfirmation = useCallback((payload) => api.resendConfirmation(payload), [])

  const login = useCallback(async (payload) => {
    const u = await api.login(payload)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    const id = user?.id
    await api.logout()
    if (id) clearUnlock(id)
    clearPageCache()
    setUser(null)
  }, [user?.id])

  const signInWithGoogle = useCallback(async () => {
    await api.signInWithGoogle()
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const u = await api.updateProfile(payload)
    setUser(u)
    return u
  }, [])

  const uploadAvatar = useCallback(async (file) => {
    const u = await api.uploadAvatar(file)
    setUser(u)
    return u
  }, [])

  const confirmMpesaNumber = useCallback(async (payload) => {
    const u = await api.confirmMpesaNumber(payload)
    setUser(u)
    return u
  }, [])

  const updatePassword = useCallback((payload) => api.updatePassword(payload), [])

  const value = {
    user,
    loading,
    register,
    resendConfirmation,
    login,
    logout,
    refresh,
    signInWithGoogle,
    updateProfile,
    uploadAvatar,
    confirmMpesaNumber,
    updatePassword,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
