// POST /send-otp  { mpesaNumber }   (authenticated)
// Generates a 6-digit code for the signed-in user, stores its hash with a
// 5-minute expiry, and texts it via Africa's Talking. When SMS is not
// configured (dev), the code is returned in the response so the flow is
// testable without a provider.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { normalizePhone, isValidPhone, generateCode, sha256Hex, userFromRequest } from '../_shared/otp.ts'
import { sendSms, smsConfigured } from '../_shared/sms.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { mpesaNumber } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!isValidPhone(phone)) return json({ error: 'Enter a valid Safaricom number, e.g. 0712345678' }, 400)

    // Block numbers already confirmed on another account.
    const { data: clash } = await supabase
      .from('users')
      .select('id')
      .eq('mpesa_number', phone)
      .eq('is_verified', true)
      .neq('id', user.id)
      .maybeSingle()
    if (clash) return json({ error: 'That Mpesa number is already linked to another account.' }, 409)

    const code = generateCode()
    const codeHash = await sha256Hex(`${user.id}:${phone}:${code}`)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Replace any previous pending codes for this user.
    await supabase.from('phone_verifications').delete().eq('user_id', user.id)
    const { error: insErr } = await supabase.from('phone_verifications').insert({
      user_id: user.id,
      mpesa_number: phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    if (insErr) return json({ error: insErr.message }, 500)

    const sent = await sendSms(phone, `Your Pytif verification code is ${code}. It expires in 5 minutes.`)

    // Dev fallback: surface the code only when no SMS provider is configured.
    return json({ ok: true, sent, devCode: smsConfigured() ? undefined : code })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
