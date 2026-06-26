// POST /complete-passcode-reset  { token }  (authenticated)
// Marks the reset token used after the client saves a new passcode locally.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'
import { requireJsonContentType } from '../_shared/security.ts'
import { sha256Hex, userFromRequest } from '../_shared/otp.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401, req)

    const { token } = await req.json()
    if (!token || typeof token !== 'string') return json({ error: 'Missing reset link.' }, 400, req)

    const tokenHash = await sha256Hex(String(token).trim())
    const { data: row } = await supabase
      .from('passcode_reset_tokens')
      .select('id,user_id,expires_at,consumed_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (!row || row.user_id !== user.id) return json({ error: 'Invalid or expired reset link.' }, 400, req)
    if (row.consumed_at) return json({ ok: true }, 200, req)
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'Reset link expired.' }, 400, req)
    }

    await supabase
      .from('passcode_reset_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id)

    await auditLog(supabase, 'passcode_reset_completed', {}, user.id, req)
    return json({ ok: true }, 200, req)
  } catch (e: any) {
    return json({ error: e?.message || 'Could not complete reset.' }, 500, req)
  }
})
