const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-XSS-Protection': '1; mode=block',
  'Cache-Control': 'no-store',
}

function allowedOrigins(): string[] {
  return (Deno.env.get('APP_URL') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function resolveOrigin(req?: Request): string {
  const allowed = allowedOrigins()
  const origin = req?.headers.get('Origin') ?? ''

  if (allowed.length === 0) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
    return '*'
  }

  if (origin && allowed.includes(origin)) return origin
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return allowed[0]
}

export function corsHeaders(req?: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-jiokoe-webhook-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    ...SECURITY_HEADERS,
  }
}

export function json(body: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

/** @deprecated use corsHeaders(req) */
export const corsHeadersLegacy = corsHeaders()
