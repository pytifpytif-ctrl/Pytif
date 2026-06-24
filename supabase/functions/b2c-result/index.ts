// POST /b2c-result  (set as MPESA_B2C_RESULT_URL)
// Final outcome of a B2C send. Settles the transaction and deducts the locked
// balance on success.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const result = body?.Result
    if (!result) return json({ ResultCode: 0, ResultDesc: 'Ignored' })

    const supabase = adminClient()
    const conversationId = result.ConversationID
    const { data: txn } = await supabase
      .from('transactions')
      .select('id')
      .eq('mpesa_reference', conversationId)
      .maybeSingle()

    if (!txn) return json({ ResultCode: 0, ResultDesc: 'No matching transaction' })

    if (result.ResultCode === 0) {
      // Pull the actual Mpesa receipt from the result parameters.
      const params = result.ResultParameters?.ResultParameter ?? []
      const receipt =
        params.find((p: any) => p.Key === 'TransactionReceipt')?.Value ?? conversationId
      await supabase.rpc('mark_send_success', { p_txn_id: txn.id, p_mpesa_ref: String(receipt) })
    } else {
      await supabase.rpc('mark_send_failed', {
        p_txn_id: txn.id,
        p_reason: result.ResultDesc || 'B2C failed',
      })
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    return json({ ResultCode: 0, ResultDesc: 'Accepted (error logged): ' + String(e) })
  }
})
