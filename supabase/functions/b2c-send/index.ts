// POST /b2c-send  { transaction_id }
// Dispatched by the pg_cron scheduler (process_due_sends) for each due send.
// Fires the actual Daraja B2C call. Settlement happens in b2c-result / b2c-timeout.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { b2cPayment } from '../_shared/daraja.ts'

Deno.serve(async (req) => {
  try {
    const { transaction_id } = await req.json()
    const supabase = adminClient()

    const { data: txn } = await supabase
      .from('transactions')
      .select('*, schedules(name, destination_mpesa, status, locked_balance)')
      .eq('id', transaction_id)
      .single()

    if (!txn) return json({ error: 'transaction not found' }, 404)
    const schedule = txn.schedules
    if (!schedule || schedule.status !== 'ACTIVE' || schedule.locked_balance < txn.amount) {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: transaction_id,
        p_reason: 'Schedule inactive or insufficient locked balance',
      })
      return json({ ok: false, reason: 'precondition failed' })
    }

    const remarks = `${schedule.name} | ${txn.label || 'send'} | ${txn.scheduled_for.slice(0, 10)}`
    const res = await b2cPayment({
      amount: txn.amount,
      phone: schedule.destination_mpesa,
      remarks,
    })

    // Daraja returns ResponseCode "0" when the request was accepted for processing.
    if (res?.ResponseCode !== '0') {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: transaction_id,
        p_reason: res?.ResponseDescription || 'B2C request rejected',
      })
      return json({ ok: false, daraja: res })
    }

    // Store the conversation id for reconciliation; success is confirmed in b2c-result.
    await supabase
      .from('transactions')
      .update({ mpesa_reference: res.ConversationID })
      .eq('id', transaction_id)

    return json({ ok: true, daraja: res })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
