// POST /b2c-result  (set as MPESA_B2C_RESULT_URL)

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'
import { verifyMpesaCallback, logMpesaCallback, isCallbackTooOld } from '../_shared/security.ts'

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
    await logMpesaCallback(supabase, 'b2c_result', req, body, false, verify.reason)
    return json({ ResultCode: 1, ResultDesc: 'Unauthorized callback' })
  }

  try {
    const result = (body as { Result?: Record<string, unknown> })?.Result
    if (!result) {
      await logMpesaCallback(supabase, 'b2c_result', req, body, true, 'ignored')
      return json({ ResultCode: 0, ResultDesc: 'Ignored' })
    }

    if (isCallbackTooOld(result.TransactionCompletedDateTime ?? result.OriginatorConversationID)) {
      await logMpesaCallback(supabase, 'b2c_result', req, body, false, 'callback_too_old')
      return json({ ResultCode: 1, ResultDesc: 'Stale callback' })
    }

    const conversationId = result.ConversationID as string
    const { data: txn } = await supabase
      .from('transactions')
      .select('id, status, amount')
      .eq('mpesa_reference', conversationId)
      .maybeSingle()

    if (!txn) {
      await logMpesaCallback(supabase, 'b2c_result', req, body, false, 'unknown_conversation')
      return json({ ResultCode: 0, ResultDesc: 'No matching transaction' })
    }

    if (txn.status === 'SUCCESS' || txn.status === 'FAILED') {
      await logMpesaCallback(supabase, 'b2c_result', req, body, true, 'already_settled')
      return json({ ResultCode: 0, ResultDesc: 'Already settled' })
    }

    if (txn.status !== 'PENDING_B2C_CONFIRM') {
      await logMpesaCallback(supabase, 'b2c_result', req, body, false, 'invalid_state')
      await auditLog(supabase, 'b2c_result_invalid_state', { txnId: txn.id, status: txn.status }, null, req)
      return json({ ResultCode: 0, ResultDesc: 'Invalid transaction state' })
    }

    if (result.ResultCode === 0) {
      const params = (result.ResultParameters as { ResultParameter?: { Key?: string; Value?: unknown }[] })
        ?.ResultParameter ?? []
      const receipt =
        String(params.find((p) => p.Key === 'TransactionReceipt')?.Value ?? conversationId)
      const amountParam = params.find((p) => p.Key === 'TransactionAmount')?.Value
      const paidAmount = amountParam != null ? Math.round(Number(amountParam)) : null

      if (paidAmount != null && paidAmount !== txn.amount) {
        await supabase.rpc('mark_send_failed', {
          p_txn_id: txn.id,
          p_reason: `B2C amount mismatch: expected ${txn.amount}, got ${paidAmount}`,
        })
        await logMpesaCallback(supabase, 'b2c_result', req, body, false, 'amount_mismatch')
        await auditLog(supabase, 'b2c_result_amount_mismatch', {
          txnId: txn.id,
          expected: txn.amount,
          received: paidAmount,
        }, null, req)
        return json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      try {
        await supabase.rpc('mark_send_success', { p_txn_id: txn.id, p_mpesa_ref: receipt })
      } catch (e) {
        await logMpesaCallback(supabase, 'b2c_result', req, body, false, String(e))
        await auditLog(supabase, 'b2c_result_duplicate_or_balance', { txnId: txn.id, error: String(e) }, null, req)
        return json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }

      await logMpesaCallback(supabase, 'b2c_result', req, body, true)
      await auditLog(supabase, 'b2c_result_success', { txnId: txn.id, receipt }, null, req)
    } else {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: txn.id,
        p_reason: (result.ResultDesc as string) || 'B2C failed',
      })
      await logMpesaCallback(supabase, 'b2c_result', req, body, true, 'b2c_failed')
      await auditLog(supabase, 'b2c_result_failed', { txnId: txn.id, desc: result.ResultDesc }, null, req)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await logMpesaCallback(supabase, 'b2c_result', req, body, false, String(e))
    await auditLog(supabase, 'b2c_result_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
