// POST /verify-otp  { mpesaNumber, code }   (authenticated)
// Validates the code and, on success, saves the confirmed Mpesa number to the
// user's profile and marks them verified.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { normalizePhone, isValidPhone, sha256Hex, userFromRequest } from '../_shared/otp.ts'

const MAX_ATTEMPTS = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = adminClient()
    const user = await userFromRequest(req, supabase)
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { mpesaNumber, code } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!isValidPhone(phone)) return json({ error: 'Enter a valid number.' }, 400)

    const { data: rec } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('mpesa_number', phone)
      .eq('consumed', false)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (!rec) return json({ error: 'No active code. Request a new one.' }, 400)
    if (new Date(rec.expires_at).getTime() < Date.now()) return json({ error: 'Code expired. Request a new one.' }, 400)
    if (rec.attempts >= MAX_ATTEMPTS) return json({ error: 'Too many attempts. Request a new code.' }, 429)

    const codeHash = await sha256Hex(`${user.id}:${phone}:${String(code).trim()}`)
    if (codeHash !== rec.code_hash) {
      await supabase.from('phone_verifications').update({ attempts: rec.attempts + 1 }).eq('id', rec.id)
      return json({ error: 'Incorrect code. Try again.' }, 400)
    }

    // Re-check uniqueness right before committing.
    const { data: clash } = await supabase
      .from('users')
      .select('id')
      .eq('mpesa_number', phone)
      .eq('is_verified', true)
      .neq('id', user.id)
      .maybeSingle()
    if (clash) return json({ error: 'That Mpesa number is already linked to another account.' }, 409)

    const { error: updErr } = await supabase
      .from('users')
      .update({ mpesa_number: phone, is_verified: true })
      .eq('id', user.id)
    if (updErr) return json({ error: updErr.message }, 500)

    await supabase.from('phone_verifications').update({ consumed: true }).eq('id', rec.id)
    await supabase.auth.admin.updateUserById(user.id, { user_metadata: { mpesa_number: phone } })

    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
