// POST /reset-password  { mpesaNumber, newPassword }
// Phase 1 MVP reset. Looks up the user by Mpesa number and sets a new password
// via the admin API.
//
// NOTE: in production this MUST be gated behind a verified OTP (Africa's Talking)
// so that knowing a number alone cannot reset an account. The OTP check belongs
// right here before updateUserById is called.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

function normalizePhone(num: string): string {
  let d = String(num || '').replace(/\D/g, '')
  if (d.startsWith('254')) d = '0' + d.slice(3)
  if (d.length === 9 && d.startsWith('7')) d = '0' + d
  return d
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { mpesaNumber, newPassword } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!/^0\d{9}$/.test(phone)) return json({ error: 'Enter a valid number.' }, 400)
    if (!newPassword || String(newPassword).length < 6) return json({ error: 'New password must be at least 6 characters.' }, 400)

    const supabase = adminClient()
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('mpesa_number', phone)
      .maybeSingle()

    if (!profile) return json({ error: 'No account found for that number.' }, 404)

    const { error } = await supabase.auth.admin.updateUserById(profile.id, { password: newPassword })
    if (error) return json({ error: error.message }, 400)

    return json({ ok: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
