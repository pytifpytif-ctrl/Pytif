// POST /stk-callback  (set as MPESA_STK_CALLBACK_URL)
// Safaricom calls this after the user enters their PIN.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'

function parseAmount(items: { Name?: string; Value?: unknown }[]): number | null {
  const raw = items.find((i) => i.Name === 'Amount')?.Value
  const n = Number(raw)
  return Number.isFinite(n) ? Math.round(n) : null
}

Deno.serve(async (req) => {
  const supabase = adminClient()
  try {
    const body = await req.json()
    const cb = body?.Body?.stkCallback
    if (!cb) return json({ ResultCode: 0, ResultDesc: 'Ignored' })

    const checkoutId = cb.CheckoutRequestID
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle()

    if (!deposit) {
      await auditLog(supabase, 'stk_callback_unknown_checkout', { checkoutId }, null, req)
      return json({ ResultCode: 0, ResultDesc: 'No matching deposit' })
    }

    if (deposit.status === 'CONFIRMED') {
      return json({ ResultCode: 0, ResultDesc: 'Already confirmed' })
    }

    if (cb.ResultCode === 0) {
      const items = cb.CallbackMetadata?.Item ?? []
      const paidAmount = parseAmount(items)
      const receipt = items.find((i: { Name?: string }) => i.Name === 'MpesaReceiptNumber')?.Value ?? null

      if (paidAmount == null || paidAmount !== deposit.amount) {
        await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id)
        await auditLog(supabase, 'stk_callback_amount_mismatch', {
          depositId: deposit.id,
          expected: deposit.amount,
          received: paidAmount,
        }, deposit.user_id, req)
        return json({ ResultCode: 1, ResultDesc: 'Amount mismatch' })
      }

      await supabase
        .from('deposits')
        .update({ status: 'CONFIRMED', mpesa_reference: receipt })
        .eq('id', deposit.id)
        .eq('status', 'PENDING')

      if (deposit.deposit_type === 'topup') {
        await supabase.rpc('apply_schedule_topup', { p_deposit_id: deposit.id })
        await auditLog(supabase, 'stk_topup_confirmed', {
          depositId: deposit.id,
          amount: paidAmount,
          receipt,
        }, deposit.user_id, req)
      } else {
        await supabase
          .from('schedules')
          .update({ locked_balance: deposit.amount, total_deposited: deposit.amount })
          .eq('id', deposit.schedule_id)

        await supabase.rpc('activate_schedule', { p_schedule_id: deposit.schedule_id })
        await auditLog(supabase, 'stk_callback_confirmed', {
          depositId: deposit.id,
          amount: paidAmount,
          receipt,
        }, deposit.user_id, req)
      }
    } else {
      await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id).eq('status', 'PENDING')
      await auditLog(supabase, 'stk_callback_failed', {
        depositId: deposit.id,
        resultCode: cb.ResultCode,
        desc: cb.ResultDesc,
      }, deposit.user_id, req)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await auditLog(supabase, 'stk_callback_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
