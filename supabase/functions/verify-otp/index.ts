// POST /verify-otp  { mpesaNumber, code }   (authenticated)

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { normalizePhone, isValidPhone, sha256Hex, userFromRequest } from '../_shared/otp.ts'
import { auditLog } from '../_shared/auth.ts'
import { requireJsonContentType, maskPhoneForLog } from '../_shared/security.ts'

const MAX_FAILED_BEFORE_LOCK = 5
const LOCK_MINUTES = 30

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401, req)

    const { data: userRow } = await supabase
      .from('users')
      .select('otp_failed_count, otp_locked_until')
      .eq('id', user.id)
      .maybeSingle()

    if (userRow?.otp_locked_until && new Date(userRow.otp_locked_until).getTime() > Date.now()) {
      return json({ error: 'Account locked for 30 minutes after too many failed attempts.' }, 429, req)
    }

    const { mpesaNumber, code } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!isValidPhone(phone)) return json({ error: 'Enter a valid number.' }, 400, req)

    const { data: rec } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('mpesa_number', phone)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!rec) return json({ error: 'No active code. Request a new one.' }, 400, req)
    if (new Date(rec.expires_at).getTime() < Date.now()) {
      await supabase.from('phone_verifications').update({ consumed: true }).eq('id', rec.id)
      return json({ error: 'Code expired. Request a new one.' }, 400, req)
    }

    // Single-use OTP: invalidate immediately on verification attempt.
    await supabase.from('phone_verifications').update({ consumed: true }).eq('id', rec.id)

    const codeHash = await sha256Hex(`${user.id}:${phone}:${String(code).trim()}`)
    if (codeHash !== rec.code_hash) {
      const failed = (userRow?.otp_failed_count ?? 0) + 1
      const patch: Record<string, unknown> = { otp_failed_count: failed }
      if (failed >= MAX_FAILED_BEFORE_LOCK) {
        patch.otp_locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
        patch.otp_failed_count = 0
      }
      await supabase.from('users').update(patch).eq('id', user.id)
      await auditLog(supabase, 'otp_verify_failed', { phone: maskPhoneForLog(phone), failed }, user.id, req)
      return json({ error: 'Incorrect code. Request a new one.' }, 400, req)
    }

    const { data: clash } = await supabase
      .from('users')
      .select('id')
      .eq('mpesa_number', phone)
      .eq('is_verified', true)
      .neq('id', user.id)
      .maybeSingle()
    if (clash) return json({ error: 'That Mpesa number is already linked to another account.' }, 409, req)

    const { error: updErr } = await supabase
      .from('users')
      .update({
        mpesa_number: phone,
        is_verified: true,
        otp_failed_count: 0,
        otp_locked_until: null,
      })
      .eq('id', user.id)
    if (updErr) return json({ error: updErr.message }, 500, req)

    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { mpesa_number: phone } })
    await auditLog(supabase, 'otp_verified', { phone: maskPhoneForLog(phone) }, user.id, req)

    return json({ ok: true }, 200, req)
  } catch {
    return json({ error: 'Internal error' }, 500, req)
  }
})
