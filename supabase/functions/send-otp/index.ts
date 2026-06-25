// POST /send-otp  { mpesaNumber }   (authenticated)

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { normalizePhone, isValidPhone, generateCode, sha256Hex, userFromRequest } from '../_shared/otp.ts'
import { sendSms, smsConfigured } from '../_shared/sms.ts'
import { auditLog, clientIp, enforceRateLimit } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const ip = clientIp(req)
    const userOk = await enforceRateLimit(supabase, `otp:user:${user.id}`, 5, 900)
    const ipOk = await enforceRateLimit(supabase, `otp:ip:${ip}`, 20, 3600)
    if (!userOk || !ipOk) {
      await auditLog(supabase, 'otp_rate_limited', { userId: user.id, ip }, user.id, req)
      return json({ error: 'Too many code requests. Try again later.' }, 429)
    }

    await supabase.from('users').upsert(
      {
        id: user.id,
        name: user.user_metadata?.name || user.user_metadata?.full_name || 'Jiokoe user',
        mpesa_number: user.email || user.id,
        is_verified: false,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )

    const { mpesaNumber } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!isValidPhone(phone)) return json({ error: 'Enter a valid Safaricom number, e.g. 0712345678' }, 400)

    const phoneOk = await enforceRateLimit(supabase, `otp:phone:${phone}`, 8, 3600)
    if (!phoneOk) return json({ error: 'Too many codes sent to this number. Try again later.' }, 429)

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

    await supabase.from('phone_verifications').delete().eq('user_id', user.id)
    const { error: insErr } = await supabase.from('phone_verifications').insert({
      user_id: user.id,
      mpesa_number: phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    })
    if (insErr) return json({ error: 'Could not create verification code.' }, 500)

    const sent = await sendSms(phone, `Your Jiokoe verification code is ${code}. It expires in 5 minutes.`)
    await auditLog(supabase, 'otp_sent', { phone, sent }, user.id, req)

    const isProd = (Deno.env.get('MPESA_ENV') ?? 'sandbox').toLowerCase() === 'production'
    return json({
      ok: true,
      sent,
      ...(smsConfigured() || isProd ? {} : { devCode: code }),
    })
  } catch (e) {
    return json({ error: 'Internal error' }, 500)
  }
})
