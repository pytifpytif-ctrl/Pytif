// POST /stk-callback  (set as MPESA_STK_CALLBACK_URL)
// Safaricom calls this after the user enters their PIN. On success we confirm
// the deposit and activate the schedule (which pre-generates all transactions).
// IMPORTANT: never activate on STK initiation — only here, on confirmed payment.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'

Deno.serve(async (req) => {
  try {
    const body = await req.json()
    const cb = body?.Body?.stkCallback
    if (!cb) return json({ ResultCode: 0, ResultDesc: 'Ignored' })

    const supabase = adminClient()
    const checkoutId = cb.CheckoutRequestID
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('checkout_request_id', checkoutId)
      .single()

    if (!deposit) return json({ ResultCode: 0, ResultDesc: 'No matching deposit' })

    if (cb.ResultCode === 0) {
      // Extract the Mpesa receipt from the callback metadata.
      const items = cb.CallbackMetadata?.Item ?? []
      const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value ?? null

      await supabase
        .from('deposits')
        .update({ status: 'CONFIRMED', mpesa_reference: receipt })
        .eq('id', deposit.id)

      await supabase
        .from('schedules')
        .update({ locked_balance: deposit.amount, total_deposited: deposit.amount })
        .eq('id', deposit.schedule_id)

      // Activate + pre-generate every transaction.
      await supabase.rpc('activate_schedule', { p_schedule_id: deposit.schedule_id })
    } else {
      await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    return json({ ResultCode: 0, ResultDesc: 'Accepted (error logged): ' + String(e) })
  }
})
