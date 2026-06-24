import { useEffect } from 'react'
import { api } from '../lib/api.js'

// Drives the mock backend's scheduler (the pg_cron equivalent) while the app
// is open, so scheduled sends "fire" in real time during a demo. No-op when
// running against Supabase (pg_cron handles it server-side).
export function useScheduler(onTick) {
  useEffect(() => {
    const run = () => {
      const changed = api.tick?.()
      if (changed && onTick) onTick()
    }
    run()
    const id = setInterval(run, 5000)
    return () => clearInterval(id)
  }, [onTick])
}
