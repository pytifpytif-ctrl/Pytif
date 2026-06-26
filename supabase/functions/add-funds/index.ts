// POST /add-funds  { scheduleId, sends: [{ date, send_time, amount, label? }] }

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { stkPush } from '../_shared/daraja.ts'
import { auditLog, enforceRateLimit } from '../_shared/auth.ts'
import {
  requireJsonContentType,
  sanitizeText,
  validateSendAmount,
  isValidMpesaPhone,
  normalizeMpesaPhone,
  MAX_LABEL_LEN,
} from '../_shared/security.ts'
import { topUpTotalForSend, STK_MAX_DEPOSIT } from '../_shared/fees.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  const badCt = requireJsonContentType(req)
  if (badCt) return badCt

  try {
    const supabase = adminClient()
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401, req)
    const userId = userData.user.id

    const topupOk = await enforceRateLimit(supabase, `topup:${userId}`, 10, 3600)
    if (!topupOk) {
      await auditLog(supabase, 'topup_rate_limited', {}, userId, req)
      return json({ error: 'Too many top-up requests. Try again later.' }, 429, req)
    }

    const { scheduleId, sends } = await req.json()
    if (!scheduleId || !Array.isArray(sends) || sends.length === 0) {
      return json({ error: 'Add at least one send.' }, 400, req)
    }

    const { data: schedule } = await supabase
      .from('schedules')
      .select('id,user_id,status,destination_mpesa,name')
      .eq('id', scheduleId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!schedule) return json({ error: 'Schedule not found.' }, 404, req)
    if (schedule.status !== 'ACTIVE') {
      return json({ error: 'You can only add funds to an active schedule.' }, 400, req)
    }

    const { data: profile } = await supabase
      .from('users')
      .select('mpesa_number,is_verified')
      .eq('id', userId)
      .single()
    const destination = normalizeMpesaPhone(profile?.mpesa_number || '')
    if (!profile?.is_verified || !isValidMpesaPhone(destination)) {
      return json({ error: 'Verify your M-Pesa number before adding funds.' }, 403, req)
    }
    if (normalizeMpesaPhone(schedule.destination_mpesa) !== destination) {
      return json({ error: 'Payout number mismatch.' }, 403, req)
    }

    const normalized: { date: string; send_time: string; amount: number; label: string }[] = []
    let total = 0
    const now = Date.now()

    for (const raw of sends) {
      const amountCheck = validateSendAmount(raw.amount)
      if (!amountCheck.ok) return json({ error: amountCheck.error }, 400, req)
      const amount = amountCheck.amount
      const date = String(raw.date || '').slice(0, 10)
      const sendTime = String(raw.send_time || '06:00').slice(0, 5)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Pick a valid date.' }, 400, req)
      const scheduled = new Date(`${date}T${sendTime}:00+03:00`).getTime()
      if (scheduled <= now + 60 * 60 * 1000) {
        return json({ error: 'Each send must be at least 1 hour from now.' }, 400, req)
      }
      normalized.push({
        date,
        send_time: sendTime,
        amount,
        label: sanitizeText(raw.label, MAX_LABEL_LEN) || 'Top-up',
      })
      total += topUpTotalForSend(amount)
    }

    if (total > STK_MAX_DEPOSIT) {
      return json({
        error: `Total Ksh ${total.toLocaleString('en-KE')} exceeds the Ksh ${STK_MAX_DEPOSIT.toLocaleString('en-KE')} single M-Pesa payment limit.`,
      }, 400, req)
    }

    const { data: deposit, error: depErr } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        schedule_id: scheduleId,
        amount: total,
        status: 'PENDING',
        deposit_type: 'topup',
        topup_sends: normalized,
      })
      .select()
      .single()
    if (depErr) return json({ error: depErr.message }, 500, req)

    let stk: { CheckoutRequestID?: string } | null = null
    try {
      stk = await stkPush({
        amount: total,
        phone: destination,
        accountReference: `topup-${scheduleId.slice(0, 8)}`,
        description: 'Jiokoe top-up',
      })
      if (stk?.CheckoutRequestID) {
        await supabase
          .from('deposits')
          .update({ checkout_request_id: stk.CheckoutRequestID })
          .eq('id', deposit.id)
      }
    } catch (e) {
      return json({ depositId: deposit.id, total, stkError: String(e) }, 200, req)
    }

    return json({
      depositId: deposit.id,
      scheduleId,
      total,
      sendCount: normalized.length,
      stkPending: Boolean(stk?.CheckoutRequestID),
    }, 200, req)
  } catch (e: any) {
    return json({ error: e?.message || 'Could not add funds.' }, 500, req)
  }
})
