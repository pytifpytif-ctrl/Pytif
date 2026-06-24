// POST /register  { name, mpesaNumber, password }
// Creates an auth user with email_confirm = true (no email round-trip), using
// the Mpesa number mapped to a synthetic email. The on_auth_user_created
// trigger then creates the matching public.users profile row.

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
    const { name, mpesaNumber, password } = await req.json()
    const phone = normalizePhone(mpesaNumber)
    if (!/^0\d{9}$/.test(phone)) return json({ error: 'Enter a valid Safaricom number, e.g. 0712345678' }, 400)
    if (!password || String(password).length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400)

    const supabase = adminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${phone}@wastel.user`,
      password,
      email_confirm: true,
      user_metadata: { name: name?.trim() || 'Wastel user', mpesa_number: phone },
    })

    if (error) {
      const msg = /already/i.test(error.message)
        ? 'An account with this number already exists. Try logging in.'
        : error.message
      return json({ error: msg }, 400)
    }

    // Defensive upsert in case the trigger is not installed.
    if (data.user) {
      await supabase
        .from('users')
        .upsert({ id: data.user.id, name: name?.trim() || 'Wastel user', mpesa_number: phone, is_verified: true })
    }

    return json({ ok: true, userId: data.user?.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
