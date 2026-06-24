// POST /b2c-timeout  (set as MPESA_B2C_QUEUE_TIMEOUT_URL)
// Daraja calls this when a B2C request times out in its queue. We mark the
// transaction FAILED and flag it for retry. An SMS alert is sent via Africa's
// Talking if credentials are configured.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

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
  try {
    const body = await req.json()
    const conversationId = body?.Result?.ConversationID ?? body?.ConversationID
    const supabase = adminClient()

    if (conversationId) {
      const { data: txn } = await supabase
        .from('transactions')
        .select('id, amount, user_id, schedules(destination_mpesa)')
        .eq('mpesa_reference', conversationId)
        .maybeSingle()

      if (txn) {
        await supabase.rpc('mark_send_failed', {
          p_txn_id: txn.id,
          p_reason: 'B2C queue timeout',
        })
        const phone = (txn as any).schedules?.destination_mpesa
        if (phone) {
          await sendSms(phone, `Wastel: a scheduled send of Ksh ${txn.amount} failed and will be retried.`)
        }
      }
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    return json({ ResultCode: 0, ResultDesc: 'Accepted (error logged): ' + String(e) })
  }
})
