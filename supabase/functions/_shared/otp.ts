// OTP helpers shared by send-otp / verify-otp.

export function normalizePhone(num: string): string {
  let d = String(num || '').replace(/\D/g, '')
  if (d.startsWith('254')) d = '0' + d.slice(3)
  if (d.length === 9 && d.startsWith('7')) d = '0' + d
  return d
}

export function isValidPhone(num: string): boolean {
  return /^0\d{9}$/.test(num)
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Pull the authenticated user id from the request's bearer token. */
export async function userFromRequest(req: Request, supabase: any) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
