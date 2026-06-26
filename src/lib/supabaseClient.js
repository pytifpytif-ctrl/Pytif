import { createClient } from '@supabase/supabase-js'

const directUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_PREFIX = '/api/supabase'

export const isSupabaseConfigured = Boolean(directUrl && anonKey)

function useSameOriginProxy() {
  if (import.meta.env.VITE_SUPABASE_PROXY === 'false') return false
  return typeof window !== 'undefined'
}

/** Route Supabase HTTP calls through our app origin so DevTools never logs the project URL. */
function toProxyUrl(url) {
  if (!useSameOriginProxy() || !directUrl || !url.startsWith(directUrl)) return url
  return `${PROXY_PREFIX}${url.slice(directUrl.length)}`
}

function proxyFetch(input, init) {
  if (typeof input === 'string') {
    return fetch(toProxyUrl(input), init)
  }
  if (input instanceof Request) {
    const proxied = toProxyUrl(input.url)
    if (proxied === input.url) return fetch(input, init)
    return fetch(new Request(proxied, input), init)
  }
  return fetch(input, init)
}

export const supabase = isSupabaseConfigured
  ? createClient(directUrl, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 20 } },
      global: { fetch: proxyFetch },
    })
  : null
