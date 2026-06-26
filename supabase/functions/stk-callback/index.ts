// POST /stk-callback  (set as MPESA_STK_CALLBACK_URL)
// Safaricom calls this after the user enters their PIN.

import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { auditLog } from '../_shared/auth.ts'
import {
  verifyMpesaCallback,
  logMpesaCallback,
  isCallbackTooOld,
  normalizeMpesaPhone,
  maskPhoneForLog,
} from '../_shared/security.ts'

function parseAmount(items: { Name?: string; Value?: unknown }[]): number | null {
  const raw = items.find((i) => i.Name === 'Amount')?.Value
  const n = Number(raw)
  return Number.isFinite(n) ? Math.round(n) : null
}

function parseItem(items: { Name?: string; Value?: unknown }[], name: string): string | null {
  const v = items.find((i) => i.Name === name)?.Value
  return v != null ? String(v) : null
}

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
    await logMpesaCallback(supabase, 'stk', req, body, false, verify.reason)
    return json({ ResultCode: 1, ResultDesc: 'Unauthorized callback' })
  }

  try {
    const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback
    if (!cb) {
      await logMpesaCallback(supabase, 'stk', req, body, true, 'ignored_no_stk')
      return json({ ResultCode: 0, ResultDesc: 'Ignored' })
    }

    const txDate = parseItem(cb.CallbackMetadata?.Item ?? [], 'TransactionDate')
    if (isCallbackTooOld(txDate)) {
      await logMpesaCallback(supabase, 'stk', req, body, false, 'callback_too_old')
      return json({ ResultCode: 1, ResultDesc: 'Stale callback' })
    }

    const checkoutId = cb.CheckoutRequestID as string
    const { data: deposit } = await supabase
      .from('deposits')
      .select('*')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle()

    if (!deposit) {
      await logMpesaCallback(supabase, 'stk', req, body, false, 'unknown_checkout')
      return json({ ResultCode: 0, ResultDesc: 'No matching deposit' })
    }

    if (deposit.status === 'CONFIRMED') {
      await logMpesaCallback(supabase, 'stk', req, body, true, 'already_confirmed')
      return json({ ResultCode: 0, ResultDesc: 'Already confirmed' })
    }

    if (cb.ResultCode === 0) {
      const items = (cb.CallbackMetadata as { Item?: { Name?: string; Value?: unknown }[] })?.Item ?? []
      const paidAmount = parseAmount(items)
      const receipt = parseItem(items, 'MpesaReceiptNumber')
      const partyA = parseItem(items, 'PhoneNumber')

      if (receipt) {
        const { data: dupDep } = await supabase
          .from('deposits')
          .select('id')
          .eq('mpesa_reference', receipt)
          .eq('status', 'CONFIRMED')
          .neq('id', deposit.id)
          .maybeSingle()
        if (dupDep) {
          await logMpesaCallback(supabase, 'stk', req, body, false, 'duplicate_receipt')
          await auditLog(supabase, 'stk_duplicate_receipt', { receipt, depositId: deposit.id }, deposit.user_id, req)
          return json({ ResultCode: 1, ResultDesc: 'Duplicate receipt' })
        }
      }

      if (paidAmount == null || paidAmount !== deposit.amount) {
        await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id).eq('status', 'PENDING')
        if (deposit.deposit_type !== 'topup') {
          await supabase.rpc('abandon_unpaid_schedule', { p_schedule_id: deposit.schedule_id })
        }
        await logMpesaCallback(supabase, 'stk', req, body, false, 'amount_mismatch')
        await auditLog(supabase, 'stk_callback_amount_mismatch', {
          depositId: deposit.id,
          expected: deposit.amount,
          received: paidAmount,
        }, deposit.user_id, req)
        return json({ ResultCode: 1, ResultDesc: 'Amount mismatch' })
      }

      const { data: profile } = await supabase
        .from('users')
        .select('mpesa_number')
        .eq('id', deposit.user_id)
        .single()
      const expectedPhone = normalizeMpesaPhone(profile?.mpesa_number ?? '')
      const payerPhone = normalizeMpesaPhone(partyA ?? '')
      if (partyA && expectedPhone && payerPhone !== expectedPhone) {
        await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id).eq('status', 'PENDING')
        if (deposit.deposit_type !== 'topup') {
          await supabase.rpc('abandon_unpaid_schedule', { p_schedule_id: deposit.schedule_id })
        }
        await logMpesaCallback(supabase, 'stk', req, body, false, 'phone_mismatch')
        await auditLog(supabase, 'stk_callback_phone_mismatch', {
          depositId: deposit.id,
          expected: maskPhoneForLog(expectedPhone),
          received: maskPhoneForLog(payerPhone),
        }, deposit.user_id, req)
        return json({ ResultCode: 1, ResultDesc: 'Phone mismatch' })
      }

      const { error: confirmErr } = await supabase
        .from('deposits')
        .update({ status: 'CONFIRMED', mpesa_reference: receipt })
        .eq('id', deposit.id)
        .eq('status', 'PENDING')

      if (confirmErr) {
        await logMpesaCallback(supabase, 'stk', req, body, false, confirmErr.message)
        return json({ ResultCode: 1, ResultDesc: 'Confirm failed' })
      }

      if (deposit.deposit_type === 'topup') {
        await supabase.rpc('apply_schedule_topup', { p_deposit_id: deposit.id })
        await logMpesaCallback(supabase, 'stk', req, body, true)
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
        await logMpesaCallback(supabase, 'stk', req, body, true)
        await auditLog(supabase, 'stk_callback_confirmed', {
          depositId: deposit.id,
          amount: paidAmount,
          receipt,
        }, deposit.user_id, req)
      }
    } else {
      await supabase.from('deposits').update({ status: 'FAILED' }).eq('id', deposit.id).eq('status', 'PENDING')
      if (deposit.deposit_type !== 'topup') {
        await supabase.rpc('abandon_unpaid_schedule', { p_schedule_id: deposit.schedule_id })
      }
      await logMpesaCallback(supabase, 'stk', req, body, true, 'stk_failed')
      await auditLog(supabase, 'stk_callback_failed', {
        depositId: deposit.id,
        resultCode: cb.ResultCode,
        desc: cb.ResultDesc,
      }, deposit.user_id, req)
    }

    return json({ ResultCode: 0, ResultDesc: 'Accepted' })
  } catch (e) {
    await logMpesaCallback(supabase, 'stk', req, body, false, String(e))
    await auditLog(supabase, 'stk_callback_error', { error: String(e) }, null, req)
    return json({ ResultCode: 1, ResultDesc: 'Processing error' })
  }
})
