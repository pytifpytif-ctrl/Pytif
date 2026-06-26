// POST /confirm-mpesa  { mpesaNumber, confirmMpesaNumber }   (authenticated)

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { userFromRequest } from '../_shared/otp.ts'
import { auditLog, enforceRateLimit } from '../_shared/auth.ts'
import {
  requireJsonContentType,
  isValidMpesaPhone,
  normalizeMpesaPhone,
  maskPhoneForLog,
} from '../_shared/security.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401, req)

    const confirmOk = await enforceRateLimit(supabase, `confirm-mpesa:${user.id}`, 10, 3600)
    if (!confirmOk) return json({ error: 'Too many attempts. Try again later.' }, 429, req)

    const { mpesaNumber, confirmMpesaNumber } = await req.json()
    const phone = normalizeMpesaPhone(mpesaNumber)
    const confirm = normalizeMpesaPhone(confirmMpesaNumber)
    if (!isValidMpesaPhone(phone)) {
      return json({ error: 'Enter a valid Safaricom number, e.g. 0712345678' }, 400, req)
    }
    if (phone !== confirm) return json({ error: 'Numbers do not match. Check and try again.' }, 400, req)

    const { data: clash } = await supabase
      .from('users')
      .select('id')
      .eq('mpesa_number', phone)
      .eq('is_verified', true)
      .neq('id', user.id)
      .maybeSingle()
    if (clash) return json({ error: 'That M-Pesa number is already linked to another account.' }, 409, req)

    const name = user.user_metadata?.name || user.user_metadata?.full_name || 'Jiokoe user'
    const { error: upsertErr } = await supabase.from('users').upsert(
      {
        id: user.id,
        name,
        mpesa_number: phone,
        is_verified: true,
      },
      { onConflict: 'id' },
    )
    if (upsertErr) return json({ error: upsertErr.message }, 500, req)

    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { mpesa_number: phone, name } })
    await auditLog(supabase, 'mpesa_confirmed', { phone: maskPhoneForLog(phone) }, user.id, req)

    return json({ ok: true }, 200, req)
  } catch {
    return json({ error: 'Internal error' }, 500, req)
  }
})
