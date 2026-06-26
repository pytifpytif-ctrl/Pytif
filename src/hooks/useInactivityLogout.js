import { useEffect, useRef, useCallback } from 'react'

const EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll']
const DEFAULT_MS = 10 * 60 * 1000

/** Force logout after inactivity on financial screens (checklist §8). */
export function useInactivityLogout(logout, enabled = true, timeoutMs = DEFAULT_MS) {
  const timer = useRef(null)

  const reset = useCallback(() => {
    if (!enabled) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      logout?.()
    }, timeoutMs)
  }, [enabled, logout, timeoutMs])

  useEffect(() => {
    if (!enabled) return undefined
    reset()
    for (const ev of EVENTS) window.addEventListener(ev, reset, { passive: true })
    return () => {
      if (timer.current) clearTimeout(timer.current)
      for (const ev of EVENTS) window.removeEventListener(ev, reset)
    }
  }, [enabled, reset])
}
