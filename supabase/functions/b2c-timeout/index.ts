// POST /b2c-timeout  (set as MPESA_B2C_QUEUE_TIMEOUT_URL)

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'

async function sendSms(to: string, message: string) {
  const apiKey = Deno.env.get('AT_API_KEY')
  const username = Deno.env.get('AT_USERNAME')
  if (!apiKey || !username) return
  try {
    await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({ username, to, message }),
    })
  } catch (_) {
    // best-effort
  }
}

Deno.serve(async (req) => {
  const supabase = adminClient()
  try {
    const body = await req.json()
    const conversationId = body?.Result?.ConversationID ?? body?.ConversationID
    if (!conversationId) return json({ ResultCode: 0, ResultDesc: 'Ignored' })

    const { data: txn } = await supabase
      .from('transactions')
      .select('id, amount, status, user_id, schedules(destination_mpesa)')
      .eq('mpesa_reference', conversationId)
      .maybeSingle()

    if (!txn) {
      await auditLog(supabase, 'b2c_timeout_unknown', { conversationId }, null, req)
      return json({ ResultCode: 0, ResultDesc: 'No matching transaction' })
    }

    if (txn.status === 'PENDING_B2C_CONFIRM') {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: txn.id,
        p_reason: 'B2C queue timeout',
      })
      const phone = (txn as { schedules?: { destination_mpesa?: string } }).schedules?.destination_mpesa
      if (phone) {
        await sendSms(phone, `Pytif: a scheduled send of Ksh ${txn.amount} failed and will be retried.`)
      }
      await auditLog(supabase, 'b2c_timeout', { txnId: txn.id }, txn.user_id, req)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await auditLog(supabase, 'b2c_timeout_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
