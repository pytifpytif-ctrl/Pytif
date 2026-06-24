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

function isoDow(d: Date) {
  const js = d.getUTCDay()
  return js === 0 ? 7 : js
}

function countActiveDays(p: any): number {
  if (p.pattern === 'CUSTOM_DATES') return (p.activeDates || []).length
  const start = new Date(p.startDate)
  const end = new Date(p.endDate)
  let count = 0
  const cur = new Date(start)
  let guard = 0
  while (cur <= end && guard < 1000) {
    guard++
    if (p.pattern === 'EVERY_DAY' || (p.activeDays || []).includes(isoDow(cur))) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
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
    const activeDays = countActiveDays(p)
    const slots = (p.slots || []).filter((s: any) => Number(s.amount) > 0)
    if (slots.length === 0) return json({ error: 'No valid send slots' }, 400)
    if (activeDays === 0) return json({ error: 'Schedule has no active days' }, 400)

    let total = 0
    for (const s of slots) total += (Number(s.amount) + sendFee(Number(s.amount))) * activeDays

    const { data: profile } = await supabase
      .from('users')
      .select('mpesa_number')
      .eq('id', userId)
      .single()
    const destination = p.destination || profile?.mpesa_number
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

    await supabase.from('send_slots').insert(
      slots.map((s: any) => ({
        schedule_id: schedule.id,
        label: s.label || '',
        send_time: s.send_time,
        amount: Number(s.amount),
        fee: sendFee(Number(s.amount)),
        is_active: true,
      })),
    )

    const { data: deposit } = await supabase
      .from('deposits')
      .insert({ user_id: userId, schedule_id: schedule.id, amount: total, status: 'PENDING' })
      .select()
      .single()

    // Fire STK push (account reference = schedule id so the callback can match).
    let stk: any = null
    try {
      stk = await stkPush({
        amount: total,
        phone: destination,
        accountReference: schedule.id,
        description: 'Wastel deposit',
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
      breakdown: { total, activeDays, totalSends: slots.length * activeDays },
      stk,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
