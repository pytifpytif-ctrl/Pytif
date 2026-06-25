// POST /reset-password — DISABLED
// Password reset must go through Supabase email flow (Forgot password page).
// This endpoint previously allowed reset by M-Pesa number alone and is removed.

import { corsHeaders, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return json(
    { error: 'This endpoint is disabled. Use the email password reset flow on the login page.' },
    410,
  )
})
