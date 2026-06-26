// POST /create-schedule
// Auth: requires the user's JWT (Authorization: Bearer <access_token>).
// Creates a PAUSED schedule + slots + a PENDING deposit, then fires an STK push.
// The schedule is only ACTIVATED later by the stk-callback once payment confirms.

import { corsHeaders, json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabaseAdmin.ts'
import { stkPush } from '../_shared/daraja.ts'

const MPESA_BANDS: [number, number][] = [
  [100, 0], [500, 11], [1000, 15], [1500, 27], [2500, 29],
  [3500, 52], [5000, 69], [7500, 87], [10000, 115],
]
const mpesaFee = (a: number) => {
  if (a <= 0) return 0
  for (const [max, fee] of MPESA_BANDS) if (a <= max) return fee
  return 115
}
const sendFee = (a: number) => (a > 0 ? mpesaFee(a) + 5 : 0)

function normalizeDest(num: string) {
  let d = String(num || '').replace(/\D/g, '')
  if (d.startsWith('254')) d = '0' + d.slice(3)
  if (d.length === 9 && d.startsWith('7')) d = '0' + d
  return d
}

function isoDow(d: Date) {
  const js = d.getUTCDay()
  return js === 0 ? 7 : js
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** The list of calendar dates a schedule fires on. */
function activeDateList(p: any): Date[] {
  if (p.pattern === 'CUSTOM_DATES') {
    return (p.activeDates || []).map((k: string) => new Date(`${k}T00:00:00Z`))
  }
  const out: Date[] = []
  const cur = new Date(p.startDate)
  const end = new Date(p.endDate)
  let guard = 0
  while (cur <= end && guard < 1000) {
    guard++
    if (p.pattern === 'EVERY_DAY' || (p.activeDays || []).includes(isoDow(cur))) out.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

/** Slots that apply on a given date, honoring per-day `day_key`. */
function slotsForDate(date: Date, slots: any[], pattern: string): any[] {
  const hasPerDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!hasPerDay) return slots
  const key = pattern === 'CUSTOM_DATES' ? dateKey(date) : String(isoDow(date))
  return slots.filter((s) => String(s.day_key) === key)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = adminClient()
    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)
    const userId = userData.user.id

    const p = await req.json()
    const nameNorm = String(p.name || '').trim()
    if (!nameNorm) return json({ error: 'Give your schedule a name.' }, 400)

    const { data: existingSchedules } = await supabase
      .from('schedules')
      .select('name')
      .eq('user_id', userId)
    const nameTaken = (existingSchedules || []).some(
      (s) => String(s.name || '').trim().toLowerCase() === nameNorm.toLowerCase(),
    )
    if (nameTaken) {
      return json({ error: 'You already have a schedule with this name. Pick another.' }, 400)
    }

    const dates = activeDateList(p)
    const activeDays = dates.length
    const slots = (p.slots || []).filter((s: any) => Number(s.amount) > 0)
    if (slots.length === 0) return json({ error: 'No valid send slots' }, 400)
    if (activeDays === 0) return json({ error: 'Schedule has no active days' }, 400)

    // Sum across the real per-day mapping (slots may differ by day).
    let total = 0
    let totalSends = 0
    for (const date of dates) {
      for (const s of slotsForDate(date, slots, p.pattern)) {
        total += Number(s.amount) + sendFee(Number(s.amount))
        totalSends += 1
      }
    }
    if (totalSends === 0) return json({ error: 'No sends scheduled on any active day' }, 400)

    const { data: profile } = await supabase
      .from('users')
      .select('mpesa_number,is_verified')
      .eq('id', userId)
      .single()
    if (!profile?.is_verified) {
      return json({ error: 'Verify your M-Pesa number before creating a schedule.' }, 403)
    }
    const destination = normalizeDest(profile.mpesa_number)
    if (!/^0\d{9}$/.test(destination)) {
      return json({ error: 'Verify your M-Pesa number before creating a schedule.' }, 403)
    }
    if (p.destination && normalizeDest(p.destination) !== destination) {
      return json({ error: 'Payouts can only go to your verified M-Pesa number.' }, 403)
    }
    const startKey = p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : null
    const endKey = p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : null

    const { data: schedule, error: schedErr } = await supabase
      .from('schedules')
      .insert({
        user_id: userId,
        name: p.name,
        pattern: p.pattern,
        active_days: p.activeDays || [],
        active_dates: p.activeDates || [],
        start_date: startKey,
        end_date: endKey,
        total_days: activeDays,
        destination_mpesa: destination,
        status: 'PAUSED',
        recycled_from: p.recycledFrom || null,
      })
      .select()
      .single()
    if (schedErr) throw schedErr

    const { data: deposit, error: depErr } = await supabase
      .from('deposits')
      .insert({ user_id: userId, schedule_id: schedule.id, amount: total, status: 'PENDING' })
      .select()
      .single()
    if (depErr) throw depErr

    const { error: slotsErr } = await supabase.from('send_slots').insert(
      slots.map((s: any) => ({
        schedule_id: schedule.id,
        label: s.label || '',
        send_time: s.send_time,
        amount: Number(s.amount),
        fee: sendFee(Number(s.amount)),
        day_key: s.day_key ?? null,
        is_active: true,
      })),
    )
    if (slotsErr) throw slotsErr

    // Fire STK push (account reference = schedule id so the callback can match).
    let stk: any = null
    try {
      stk = await stkPush({
        amount: total,
        phone: destination,
        accountReference: schedule.id,
        description: 'Jiokoe deposit',
      })
      if (stk?.CheckoutRequestID) {
        await supabase
          .from('deposits')
          .update({ checkout_request_id: stk.CheckoutRequestID })
          .eq('id', deposit.id)
      }
    } catch (e) {
      // Surface STK errors but keep the draft so the user can retry.
      return json(
        { scheduleId: schedule.id, depositId: deposit.id, breakdown: { total }, activeDays, stkError: String(e) },
        200,
      )
    }

    return json({
      scheduleId: schedule.id,
      depositId: deposit.id,
      activeDays,
      breakdown: { total, activeDays, totalSends },
      stkPending: Boolean(stk?.CheckoutRequestID),
    })
  } catch (e: any) {
    const msg = e?.message || e?.details || (typeof e === 'string' ? e : 'Could not create schedule.')
    return json({ error: msg }, 500)
  }
})
