// Supabase-backed implementation of the Wastel data API.
//
// Activated automatically when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
// Mirrors the mock backend's surface so the UI is backend-agnostic.
//
// Auth: we treat the Mpesa number as the login identifier by mapping it to a
// synthetic email (<number>@wastel.user) inside Supabase Auth. The public
// `users` row stores the real Mpesa number, name and verification flag.
//
// Heavy lifting (STK push, B2C, pre-generating transactions) lives in the
// Postgres functions and Daraja edge functions under /supabase.

import { supabase } from './supabaseClient.js'
import { depositBreakdown, feeFor } from './fees.js'

function phoneToEmail(phone) {
  return `${normalizePhone(phone)}@wastel.user`
}

function normalizePhone(num) {
  let digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254')) digits = '0' + digits.slice(3)
  if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits
  return digits
}

async function register({ name, mpesaNumber, password }) {
  const phone = normalizePhone(mpesaNumber)
  if (!/^0\d{9}$/.test(phone)) throw new Error('Enter a valid Safaricom number, e.g. 0712345678')

  // Create the (auto-confirmed) account server-side via the admin API, then
  // sign in to obtain a session.
  const { data, error } = await supabase.functions.invoke('register', {
    body: { name, mpesaNumber: phone, password },
  })
  if (error) throw new Error(await readFnError(error, 'Could not create account.'))
  if (data?.error) throw new Error(data.error)

  return login({ mpesaNumber: phone, password })
}

async function login({ mpesaNumber, password }) {
  const phone = normalizePhone(mpesaNumber)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password,
  })
  if (error) throw new Error('Wrong number or password.')
  return currentUser() ?? { id: data.user.id, mpesa_number: phone }
}

async function logout() {
  await supabase.auth.signOut()
}

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { data: profile } = await supabase
    .from('users')
    .select('id,name,mpesa_number,is_verified')
    .eq('id', data.user.id)
    .single()
  return profile || { id: data.user.id, name: data.user.user_metadata?.name }
}

async function resetPassword({ mpesaNumber, newPassword }) {
  const phone = normalizePhone(mpesaNumber)
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { mpesaNumber: phone, newPassword },
  })
  if (error) throw new Error(await readFnError(error, 'Could not reset password.'))
  if (data?.error) throw new Error(data.error)
  return true
}

// Edge function errors arrive as a FunctionsHttpError whose response body holds
// the JSON { error } we returned. Surface that message to the user.
async function readFnError(error, fallback) {
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return body.error
  } catch {
    /* ignore */
  }
  return error?.message || fallback
}

async function createSchedule(payload) {
  // Compute the deposit total on the client for the summary, but the
  // edge function recomputes authoritatively before triggering STK push.
  const activeSlots = payload.slots.filter((s) => Number(s.amount) > 0)
  const { data, error } = await supabase.functions.invoke('create-schedule', {
    body: payload,
  })
  if (error) throw new Error(error.message)
  return {
    scheduleId: data.scheduleId,
    depositId: data.depositId,
    breakdown: data.breakdown ?? depositBreakdown(activeSlots, data.activeDays ?? 0),
  }
}

async function confirmDeposit(depositId) {
  // In production the STK callback (edge function) confirms the deposit and
  // activates the schedule. The client polls the deposit row until CONFIRMED.
  for (let i = 0; i < 40; i += 1) {
    const { data } = await supabase
      .from('deposits')
      .select('status,mpesa_reference,schedule_id')
      .eq('id', depositId)
      .single()
    if (data?.status === 'CONFIRMED') {
      const { data: schedule } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', data.schedule_id)
        .single()
      return { schedule, mpesaReference: data.mpesa_reference }
    }
    if (data?.status === 'FAILED') throw new Error('Payment failed or was cancelled.')
    await new Promise((r) => setTimeout(r, 1500))
  }
  throw new Error('Timed out waiting for payment confirmation.')
}

async function listSchedules() {
  const { data } = await supabase
    .from('schedules')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

async function getSchedule(id) {
  const { data: schedule } = await supabase.from('schedules').select('*').eq('id', id).single()
  if (!schedule) return null
  const { data: slots } = await supabase.from('send_slots').select('*').eq('schedule_id', id)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('schedule_id', id)
    .order('scheduled_for', { ascending: true })
  return { schedule, slots: slots || [], transactions: transactions || [] }
}

async function listTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select('*, schedules(name)')
    .order('scheduled_for', { ascending: false })
  return (data || []).map((t) => ({ ...t, schedule_name: t.schedules?.name }))
}

async function getDashboard() {
  const schedules = await listSchedules()
  const totalLocked = schedules
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.locked_balance, 0)

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const { data: today } = await supabase
    .from('transactions')
    .select('*, schedules(name)')
    .gte('scheduled_for', start.toISOString())
    .lt('scheduled_for', end.toISOString())
    .order('scheduled_for', { ascending: true })

  const upcomingToday = (today || []).map((t) => ({ ...t, schedule_name: t.schedules?.name }))

  const cards = schedules.map((s) => {
    const next = upcomingToday.find((t) => t.schedule_id === s.id && t.status === 'PENDING')
    return {
      ...s,
      nextSendToday: next ? next.scheduled_for : null,
      remainingDays: Math.max(0, (s.total_days || 0) - (s.days_completed || 0)),
    }
  })

  return { totalLocked, schedules: cards, upcomingToday }
}

async function getRecycleDraft(scheduleId) {
  const { schedule, slots } = await getSchedule(scheduleId)
  return {
    name: schedule.name,
    pattern: schedule.pattern,
    activeDays: schedule.active_days,
    activeDates: schedule.active_dates,
    destination: schedule.destination_mpesa,
    recycledFrom: schedule.id,
    slots: slots.map((s) => ({ send_time: s.send_time, amount: s.amount, label: s.label })),
  }
}

async function requestCancellation(scheduleId) {
  const { error } = await supabase
    .from('schedules')
    .update({ cancellation_requested: true })
    .eq('id', scheduleId)
  if (error) throw new Error(error.message)
  return true
}

// In production the scheduler is pg_cron, not the client.
function tick() {
  return false
}

async function seedDemo() {
  throw new Error('Demo seeding is only available in local (no-Supabase) mode.')
}

export const supabaseBackend = {
  isMock: false,
  register,
  login,
  logout,
  currentUser,
  resetPassword,
  createSchedule,
  confirmDeposit,
  listSchedules,
  getSchedule,
  listTransactions,
  getDashboard,
  getRecycleDraft,
  requestCancellation,
  seedDemo,
  tick,
  feeFor,
}
