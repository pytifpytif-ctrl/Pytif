// POST /b2c-send  { transaction_id }
// Internal only — called by pg_cron (process_due_sends) with the service role key.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { b2cPayment } from '../_shared/daraja.ts'
import { verifyServiceRole, auditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (!verifyServiceRole(req)) {
    return json({ error: 'Forbidden' }, 403)
  }

  try {
    const { transaction_id } = await req.json()
    const supabase = adminClient()

    const { data: txn } = await supabase
      .from('transactions')
      .select('*, schedules(name, destination_mpesa, status, locked_balance)')
      .eq('id', transaction_id)
      .single()

    if (!txn) return json({ error: 'transaction not found' }, 404)
    if (txn.status !== 'PENDING_B2C_CONFIRM') {
      return json({ error: 'transaction not in dispatch state' }, 409)
    }

    const schedule = txn.schedules
    if (!schedule || schedule.status !== 'ACTIVE' || schedule.locked_balance < txn.amount) {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: transaction_id,
        p_reason: 'Schedule inactive or insufficient locked balance',
      })
      await auditLog(supabase, 'b2c_send_precondition_failed', { transaction_id }, null, req)
      return json({ ok: false, reason: 'precondition failed' })
    }

    const remarks = `${schedule.name} | ${txn.label || 'send'} | ${txn.scheduled_for.slice(0, 10)}`
    const res = await b2cPayment({
      amount: txn.amount,
      phone: schedule.destination_mpesa,
      remarks,
    })

    if (res?.ResponseCode !== '0') {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: transaction_id,
        p_reason: res?.ResponseDescription || 'B2C request rejected',
      })
      await auditLog(supabase, 'b2c_send_rejected', { transaction_id, daraja: res }, null, req)
      return json({ ok: false })
    }

    await supabase
      .from('transactions')
      .update({ mpesa_reference: res.ConversationID })
      .eq('id', transaction_id)

    await auditLog(supabase, 'b2c_send_accepted', { transaction_id, conversationId: res.ConversationID }, null, req)
    return json({ ok: true })
  } catch (e) {
    await auditLog(adminClient(), 'b2c_send_error', { error: String(e) }, null, req)
    return json({ error: 'Internal error' }, 500)
  }
})
