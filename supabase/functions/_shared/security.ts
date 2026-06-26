// Shared security helpers for edge functions (Pytif checklist v1.0).

import { clientIp, auditLog } from './auth.ts'
import { json } from './cors.ts'

export const MAX_SEND_KES = 70_000
export const MIN_SEND_KES = 1
export const MAX_SCHEDULE_NAME = 50
export const MAX_LABEL_LEN = 80
export const CALLBACK_MAX_AGE_MS = 5 * 60 * 1000

/** Kenyan M-Pesa: 07XXXXXXXX or 01XXXXXXXX (10 digits). */
export function normalizeMpesaPhone(num: string): string {
  let d = String(num || '').replace(/\D/g, '')
  if (d.startsWith('254') && d.length === 12) d = '0' + d.slice(3)
  if (d.length === 9 && (d.startsWith('7') || d.startsWith('1'))) d = '0' + d
  return d
}

export function isValidMpesaPhone(num: string): boolean {
  return /^(07|01)\d{8}$/.test(normalizeMpesaPhone(num))
}

export function validateSendAmount(raw: unknown): { ok: true; amount: number } | { ok: false; error: string } {
  const amount = Math.round(Number(raw))
  if (!Number.isFinite(amount) || !Number.isInteger(Number(raw))) {
    return { ok: false, error: 'Amount must be a whole number of shillings.' }
  }
  if (amount < MIN_SEND_KES) return { ok: false, error: `Minimum send is Ksh ${MIN_SEND_KES}.` }
  if (amount > MAX_SEND_KES) return { ok: false, error: `Maximum send is Ksh ${MAX_SEND_KES.toLocaleString('en-KE')}.` }
  return { ok: true, amount }
}

export function sanitizeText(raw: unknown, maxLen: number): string {
  return String(raw ?? '')
    .replace(/[\0-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLen)
}

export function requireJsonContentType(req: Request): Response | null {
  const ct = req.headers.get('content-type') ?? ''
  if (req.method === 'POST' && !ct.toLowerCase().includes('application/json')) {
    return json({ error: 'Content-Type must be application/json' }, 415, req)
  }
  return null
}

/** Safaricom callback IP allowlist + optional shared webhook secret. */
export function verifyMpesaCallback(req: Request): { ok: true } | { ok: false; reason: string } {
  const env = (Deno.env.get('MPESA_ENV') ?? 'sandbox').toLowerCase()
  const ip = clientIp(req)

  const allowlist = (Deno.env.get('MPESA_CALLBACK_IP_ALLOWLIST') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (allowlist.length > 0 && !allowlist.includes(ip)) {
    return { ok: false, reason: `callback_ip_rejected:${ip}` }
  }

  const secret = Deno.env.get('INTERNAL_WEBHOOK_SECRET') ?? ''
  if (secret) {
    const header = req.headers.get('x-jiokoe-webhook-secret') ?? ''
    if (header !== secret) return { ok: false, reason: 'webhook_secret_invalid' }
  } else if (env === 'production' && allowlist.length === 0) {
    return { ok: false, reason: 'production_callbacks_unconfigured' }
  }

  return { ok: true }
}

/** Parse Safaricom TransactionDate / Result timestamp; reject stale callbacks. */
export function isCallbackTooOld(timestamp: unknown): boolean {
  if (timestamp == null || timestamp === '') return false
  let ms: number
  const s = String(timestamp)
  if (/^\d{14}$/.test(s)) {
    const y = +s.slice(0, 4)
    const mo = +s.slice(4, 6) - 1
    const d = +s.slice(6, 8)
    const h = +s.slice(8, 10)
    const mi = +s.slice(10, 12)
    const se = +s.slice(12, 14)
    ms = Date.UTC(y, mo, d, h - 3, mi, se)
  } else {
    ms = Date.parse(s)
  }
  if (!Number.isFinite(ms)) return false
  return Date.now() - ms > CALLBACK_MAX_AGE_MS
}

export async function logMpesaCallback(
  supabase: ReturnType<typeof import('./supabaseAdmin.ts').adminClient>,
  type: string,
  req: Request,
  payload: unknown,
  accepted: boolean,
  rejectReason?: string,
) {
  try {
    await supabase.from('mpesa_callback_log').insert({
      callback_type: type,
      ip_address: clientIp(req),
      payload: payload as Record<string, unknown>,
      accepted,
      reject_reason: rejectReason ?? null,
    })
  } catch {
    // Never block callback path on logging failure.
  }
  await auditLog(
    supabase,
    accepted ? `${type}_accepted` : `${type}_rejected`,
    { rejectReason, ip: clientIp(req), payloadSummary: summarizePayload(payload) },
    null,
    req,
  )
}

function summarizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {}
  const p = payload as Record<string, unknown>
  const body = (p.Body ?? p) as Record<string, unknown>
  const cb = (body.stkCallback ?? body.Result ?? body) as Record<string, unknown>
  return {
    checkoutId: cb.CheckoutRequestID ?? cb.ConversationID,
    resultCode: cb.ResultCode,
  }
}

/** Mask for logs: 07XX XXX 678 */
export function maskPhoneForLog(num: string): string {
  const d = normalizeMpesaPhone(num)
  if (d.length !== 10) return '***'
  return `${d.slice(0, 2)}XX XXX ${d.slice(7)}`
}
