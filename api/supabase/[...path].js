// Same-origin proxy for Supabase REST/auth/storage calls (production on Vercel).
// Keeps the project URL out of browser DevTools; the anon key still ships in the JS bundle.

const FORWARD_HEADERS = [
  'apikey',
  'authorization',
  'content-type',
  'x-client-info',
  'x-supabase-api-version',
  'prefer',
  'range',
  'accept',
  'if-none-match',
  'if-modified-since',
]

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const base = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  if (!base) {
    res.status(502).json({ message: 'Service unavailable' })
    return
  }

  const segments = req.query.path
  const pathname = Array.isArray(segments) ? segments.join('/') : segments || ''

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const upstreamUrl = new URL(`${base}/${pathname}`)
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'path') upstreamUrl.searchParams.append(key, value)
  })

  const headers = {}
  for (const name of FORWARD_HEADERS) {
    const value = req.headers[name]
    if (value) headers[name] = value
  }

  let body
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readBody(req)
  }

  const upstream = await fetch(upstreamUrl, { method: req.method, headers, body })
  res.status(upstream.status)

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'transfer-encoding' || lower === 'content-encoding') return
    res.setHeader(key, value)
  })

  res.send(Buffer.from(await upstream.arrayBuffer()))
}
