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

/** OAuth access token (valid ~1 hour). */
export async function getAccessToken(): Promise<string> {
  const key = env('MPESA_CONSUMER_KEY')
  const secret = env('MPESA_CONSUMER_SECRET')
  const auth = btoa(`${key}:${secret}`)
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!res.ok) throw new Error(`Daraja token error: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

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

/** Trigger an STK push to collect the deposit. */
export async function stkPush(opts: {
  amount: number
  phone: string
  accountReference: string
  description: string
}) {
  const token = await getAccessToken()
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
  return await res.json()
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
      PartyA: env('MPESA_SHORTCODE'),
      PartyB: toMsisdn(opts.phone),
      Remarks: opts.remarks.slice(0, 100),
      QueueTimeOutURL: env('MPESA_B2C_QUEUE_TIMEOUT_URL'),
      ResultURL: env('MPESA_B2C_RESULT_URL'),
      Occasion: 'Wastel',
    }),
  })
  return await res.json()
}
