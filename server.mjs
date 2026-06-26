// Production static server + Supabase proxy (Render, preview, etc.).
// Vercel uses api/supabase/[...path].js instead; this keeps auth working everywhere else.

import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, 'dist')
const port = Number(process.env.PORT) || 10000
const supabaseBase = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')

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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function proxySupabase(req, res, pathname, search) {
  if (!supabaseBase) {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'Service unavailable' }))
    return
  }

  const upstreamUrl = `${supabaseBase}${pathname.replace(/^\/api\/supabase/, '')}${search || ''}`
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
  const outHeaders = {}
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'transfer-encoding' || lower === 'content-encoding') return
    outHeaders[key] = value
  })
  res.writeHead(upstream.status, outHeaders)
  res.end(Buffer.from(await upstream.arrayBuffer()))
}

function serveStatic(req, res, pathname) {
  const safePath = pathname.split('?')[0]
  const rel = safePath === '/' ? '/index.html' : safePath
  const filePath = join(root, rel)

  if (!filePath.startsWith(root)) {
    res.writeHead(403).end()
    return
  }

  if (existsSync(filePath) && extname(filePath)) {
    res.writeHead(200, { 'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream' })
    createReadStream(filePath).on('error', () => {
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }).pipe(res)
    return
  }

  const indexPath = join(root, 'index.html')
  if (!existsSync(indexPath)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('App not built. Run npm run build first.')
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  createReadStream(indexPath).on('error', () => {
    if (!res.headersSent) res.writeHead(500)
    res.end()
  }).pipe(res)
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/supabase/')) {
      await proxySupabase(req, res, url.pathname, url.search)
      return
    }
    serveStatic(req, res, url.pathname)
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Proxy error', message: String(err?.message || err) }))
    }
  }
}).listen(port, () => {
  console.log(`Jiokoe listening on port ${port}`)
})
