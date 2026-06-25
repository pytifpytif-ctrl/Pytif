// POST /b2c-result  (set as MPESA_B2C_RESULT_URL)

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  const supabase = adminClient()
  try {
    const body = await req.json()
    const result = body?.Result
    if (!result) return json({ ResultCode: 0, ResultDesc: 'Ignored' })

    const conversationId = result.ConversationID
    const { data: txn } = await supabase
      .from('transactions')
      .select('id, status, amount')
      .eq('mpesa_reference', conversationId)
      .maybeSingle()

    if (!txn) {
      await auditLog(supabase, 'b2c_result_unknown_conversation', { conversationId }, null, req)
      return json({ ResultCode: 0, ResultDesc: 'No matching transaction' })
    }

    if (txn.status === 'SUCCESS' || txn.status === 'FAILED') {
      return json({ ResultCode: 0, ResultDesc: 'Already settled' })
    }

    if (txn.status !== 'PENDING_B2C_CONFIRM') {
      await auditLog(supabase, 'b2c_result_invalid_state', { txnId: txn.id, status: txn.status }, null, req)
      return json({ ResultCode: 0, ResultDesc: 'Invalid transaction state' })
    }

    if (result.ResultCode === 0) {
      const params = result.ResultParameters?.ResultParameter ?? []
      const receipt =
        params.find((p: { Key?: string }) => p.Key === 'TransactionReceipt')?.Value ?? conversationId
      const amountParam = params.find((p: { Key?: string }) => p.Key === 'TransactionAmount')?.Value
      const paidAmount = amountParam != null ? Math.round(Number(amountParam)) : null
      if (paidAmount != null && paidAmount !== txn.amount) {
        await supabase.rpc('mark_send_failed', {
          p_txn_id: txn.id,
          p_reason: `B2C amount mismatch: expected ${txn.amount}, got ${paidAmount}`,
        })
        await auditLog(supabase, 'b2c_result_amount_mismatch', {
          txnId: txn.id,
          expected: txn.amount,
          received: paidAmount,
        }, null, req)
        return json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }
      await supabase.rpc('mark_send_success', { p_txn_id: txn.id, p_mpesa_ref: String(receipt) })
      await auditLog(supabase, 'b2c_result_success', { txnId: txn.id, receipt }, null, req)
    } else {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: txn.id,
        p_reason: result.ResultDesc || 'B2C failed',
      })
      await auditLog(supabase, 'b2c_result_failed', { txnId: txn.id, desc: result.ResultDesc }, null, req)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await auditLog(supabase, 'b2c_result_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
