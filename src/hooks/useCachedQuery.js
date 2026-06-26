import { useCallback, useEffect, useState } from 'react'
import { readPageCache, writePageCache } from '../lib/pageCache.js'
import { useLiveDataOptional } from '../context/LiveDataContext.jsx'

/**
 * Stale-while-revalidate: show cached data immediately on revisit, refresh in background.
 */
export function useCachedQuery(key, fetcher, { enabled = true } = {}) {
  const cached = readPageCache(key)
  const [data, setData] = useState(cached ?? null)
  const [loading, setLoading] = useState(!cached)
  const live = useLiveDataOptional()
  const version = live?.version ?? 0

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      const hasCache = readPageCache(key) != null
      if (!silent && !hasCache) setLoading(true)
      try {
        const result = await fetcher()
        writePageCache(key, result)
        setData(result)
        return result
      } finally {
        setLoading(false)
      }
    },
    [key, fetcher],
  )

  useEffect(() => {
    if (!enabled) return
    reload({ silent: readPageCache(key) != null })
  }, [enabled, key, reload, version])

  return { data, loading: loading && data == null, reload, refreshing: loading && data != null }
}
