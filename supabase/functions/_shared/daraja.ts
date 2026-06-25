// Minimal Daraja (Safaricom) client for STK Push (C2B) and B2C.
// Sandbox base URL by default; set MPESA_ENV=production to switch.

const BASE =
  (Deno.env.get('MPESA_ENV') ?? 'sandbox') === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'

function env(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** OAuth access token (valid ~1 hour). `force` skips any cached value. */
export async function getAccessToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.exp > Date.now()) return cachedToken.value
  const key = env('MPESA_CONSUMER_KEY')
  const secret = env('MPESA_CONSUMER_SECRET')
  const auth = btoa(`${key}:${secret}`)

  // Retry the token endpoint — the first call after a cold start can flake.
  let lastErr = ''
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.access_token) {
          // Cache a little under the ~1h validity.
          cachedToken = { value: data.access_token, exp: Date.now() + 50 * 60 * 1000 }
          return data.access_token
        }
        lastErr = JSON.stringify(data)
      } else {
        lastErr = `status ${res.status}`
      }
    } catch (e) {
      lastErr = String(e)
    }
    await sleep(600 * (attempt + 1))
  }
  throw new Error(`Daraja token error: ${lastErr}`)
}

let cachedToken: { value: string; exp: number } | null = null

function timestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}

/** Normalise to 2547XXXXXXXX (Daraja expects MSISDN without +). */
export function toMsisdn(phone: string): string {
  let p = phone.replace(/\D/g, '')
  if (p.startsWith('0')) p = '254' + p.slice(1)
  if (p.startsWith('7') && p.length === 9) p = '254' + p
  return p
}

/** One STK push attempt with a given token. */
async function stkPushOnce(token: string, opts: {
  amount: number
  phone: string
  accountReference: string
  description: string
}) {
  const shortcode = env('MPESA_SHORTCODE')
  const passkey = env('MPESA_PASSKEY')
  const ts = timestamp()
  const password = btoa(`${shortcode}${passkey}${ts}`)

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: 'CustomerPayBillOnline',
      Amount: opts.amount,
      PartyA: toMsisdn(opts.phone),
      PartyB: shortcode,
      PhoneNumber: toMsisdn(opts.phone),
      CallBackURL: env('MPESA_STK_CALLBACK_URL'),
      AccountReference: opts.accountReference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) }
}

/**
 * Trigger an STK push to collect the deposit, retrying transient failures.
 * Daraja (especially sandbox) frequently fails the first attempt — an expired
 * token, a cold connection, or a generic 500 — and succeeds on a retry.
 */
export async function stkPush(opts: {
  amount: number
  phone: string
  accountReference: string
  description: string
}) {
  let lastErr = ''
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // Force a fresh token on a retry in case the previous one was rejected.
      const token = await getAccessToken(attempt > 0)
      const { ok, status, body } = await stkPushOnce(token, opts)
      // Success: Daraja accepted the request for processing.
      if (ok && body?.ResponseCode === '0' && body?.CheckoutRequestID) return body
      lastErr = body?.errorMessage || body?.ResponseDescription || `status ${status}`
      // An invalid/expired token surfaces as 401/404.116 — drop the cache.
      if (status === 401) cachedToken = null
    } catch (e) {
      lastErr = String(e)
    }
    if (attempt < 2) await sleep(800 * (attempt + 1))
  }
  throw new Error(`STK push failed after retries: ${lastErr}`)
}

/** Send money from the company shortcode to a customer (scheduled disbursement). */
export async function b2cPayment(opts: { amount: number; phone: string; remarks: string }) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}/mpesa/b2c/v1/paymentrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      InitiatorName: env('MPESA_B2C_INITIATOR_NAME'),
      SecurityCredential: env('MPESA_B2C_SECURITY_CREDENTIAL'),
      CommandID: 'BusinessPayment',
      Amount: opts.amount,
      PartyA: Deno.env.get('MPESA_B2C_SHORTCODE') || env('MPESA_SHORTCODE'),
      PartyB: toMsisdn(opts.phone),
      Remarks: opts.remarks.slice(0, 100),
      QueueTimeOutURL: env('MPESA_B2C_QUEUE_TIMEOUT_URL'),
      ResultURL: env('MPESA_B2C_RESULT_URL'),
      Occasion: 'Jiokoe',
    }),
  })
  return await res.json()
}
