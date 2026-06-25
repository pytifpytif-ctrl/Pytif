import { useEffect } from 'react'
import { api } from '../lib/api.js'
import { useLiveDataOptional } from '../context/LiveDataContext.jsx'

// Keeps pages fresh: mock scheduler ticks + Supabase realtime via LiveDataContext.
export function useScheduler(onTick) {
  const live = useLiveDataOptional()
  const version = live?.version ?? 0

  useEffect(() => {
    if (!onTick) return undefined
    const run = () => {
      const changed = api.tick?.()
      if (changed) onTick()
    }
    run()
    const id = setInterval(run, 5000)
    return () => clearInterval(id)
  }, [onTick])

  useEffect(() => {
    if (version > 0 && onTick) onTick()
  }, [version, onTick])
}
