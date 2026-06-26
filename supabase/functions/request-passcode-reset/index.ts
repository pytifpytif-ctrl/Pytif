// POST /request-passcode-reset  (authenticated)
// Emails a link to reset the optional 4-digit app passcode.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog, enforceRateLimit } from '../_shared/auth.ts'
import { requireJsonContentType } from '../_shared/security.ts'
import { sha256Hex, userFromRequest } from '../_shared/otp.ts'
import { sendPasscodeResetEmail } from '../_shared/email.ts'

const TOKEN_TTL_MS = 15 * 60 * 1000

function appOrigin(req?: Request): string {
  const origin = req?.headers.get('Origin') ?? ''
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  const raw = Deno.env.get('APP_URL') ?? ''
  const first = raw.split(',')[0]?.trim()
  return first || 'http://localhost:5173'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401, req)
    if (!user.email) return json({ error: 'No email on your account.' }, 400, req)

    const ok = await enforceRateLimit(supabase, `passcode-reset:${user.id}`, 3, 3600)
    if (!ok) return json({ error: 'Too many reset requests. Try again later.' }, 429, req)

    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const tokenHash = await sha256Hex(rawToken)
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()

    await supabase
      .from('passcode_reset_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('consumed_at', null)

    const { error: insErr } = await supabase.from('passcode_reset_tokens').insert({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    if (insErr) throw insErr

    const resetUrl = `${appOrigin(req)}/reset-passcode?token=${encodeURIComponent(rawToken)}`
    const emailed = await sendPasscodeResetEmail(user.email, resetUrl)

    await auditLog(supabase, 'passcode_reset_requested', { emailed }, user.id, req)

    const origin = req.headers.get('Origin') ?? ''
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    const payload: Record<string, unknown> = { sent: true, emailed, email: user.email }
    if (!emailed && isLocalDev) payload.devResetUrl = resetUrl

    return json(payload, 200, req)
  } catch (e: any) {
    return json({ error: e?.message || 'Could not send reset email.' }, 500, req)
  }
})
