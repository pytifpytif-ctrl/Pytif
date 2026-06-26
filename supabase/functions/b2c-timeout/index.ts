// POST /b2c-timeout  (set as MPESA_B2C_QUEUE_TIMEOUT_URL)

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'
import { verifyMpesaCallback, logMpesaCallback } from '../_shared/security.ts'

Deno.serve(async (req) => {
  const supabase = adminClient()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ ResultCode: 1, ResultDesc: 'Invalid JSON' })
  }

  const verify = verifyMpesaCallback(req)
  if (!verify.ok) {
    await logMpesaCallback(supabase, 'b2c_timeout', req, body, false, verify.reason)
    return json({ ResultCode: 1, ResultDesc: 'Unauthorized callback' })
  }

  try {
    const b = body as { Result?: { ConversationID?: string }; ConversationID?: string }
    const conversationId = b?.Result?.ConversationID ?? b?.ConversationID
    if (!conversationId) {
      await logMpesaCallback(supabase, 'b2c_timeout', req, body, true, 'ignored')
      return json({ ResultCode: 0, ResultDesc: 'Ignored' })
    }

    const { data: txn } = await supabase
      .from('transactions')
      .select('id, amount, status, user_id')
      .eq('mpesa_reference', conversationId)
      .maybeSingle()

    if (!txn) {
      await logMpesaCallback(supabase, 'b2c_timeout', req, body, false, 'unknown_conversation')
      return json({ ResultCode: 0, ResultDesc: 'No matching transaction' })
    }

    if (txn.status === 'PENDING_B2C_CONFIRM') {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: txn.id,
        p_reason: 'B2C queue timeout',
      })
      await logMpesaCallback(supabase, 'b2c_timeout', req, body, true)
      await auditLog(supabase, 'b2c_timeout', { txnId: txn.id }, txn.user_id, req)
    } else {
      await logMpesaCallback(supabase, 'b2c_timeout', req, body, true, 'already_settled')
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await logMpesaCallback(supabase, 'b2c_timeout', req, body, false, String(e))
    await auditLog(supabase, 'b2c_timeout_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
