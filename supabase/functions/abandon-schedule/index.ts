// POST /abandon-schedule  { scheduleId }
// Removes an unpaid schedule draft when the user cancels or payment times out.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'
import { requireJsonContentType } from '../_shared/security.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401, req)

    const { scheduleId } = await req.json()
    if (!scheduleId) return json({ error: 'Missing scheduleId' }, 400, req)

    const { data: schedule, error: schedErr } = await supabase
      .from('schedules')
      .select('id,user_id')
      .eq('id', scheduleId)
      .maybeSingle()
    if (schedErr) throw schedErr
    if (!schedule) return json({ ok: true, removed: false })
    if (schedule.user_id !== userData.user.id) return json({ error: 'Forbidden' }, 403, req)

    const { data: removed, error } = await supabase.rpc('abandon_unpaid_schedule', {
      p_schedule_id: scheduleId,
    })
    if (error) throw error

    if (removed) {
      await auditLog(supabase, 'schedule_abandoned', { scheduleId }, userData.user.id, req)
    }

    return json({ ok: true, removed: Boolean(removed) }, 200, req)
  } catch (e: any) {
    return json({ error: e?.message || 'Could not abandon schedule.' }, 500, req)
  }
})
