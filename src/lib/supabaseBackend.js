// Supabase-backed implementation of the Jiokoe data API.
//
// Activated automatically when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
// Mirrors the mock backend's surface so the UI is backend-agnostic.
//
// Auth: email/password (or Google) for login. M-Pesa number is collected separately
// and confirmed by entering it twice before any money can move.
//
// Heavy lifting (STK push, B2C, pre-generating transactions) lives in the
// Postgres functions and Daraja edge functions under /supabase.

import { supabase } from './supabaseClient.js'
import { depositBreakdown, feeFor } from './fees.js'
import { isRealPhone } from './format.js'

function normalizePhone(num) {
  let digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254')) digits = '0' + digits.slice(3)
  if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits
  return digits
}

async function register({ name, email, password }) {
  // Standard sign-up: Supabase emails a confirmation link. The account has no
  // session until the email is confirmed. M-Pesa is added in Settings afterwards.
  const cleanEmail = String(email || '').trim().toLowerCase()
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { name: name?.trim() }, emailRedirectTo: `${window.location.origin}/app` },
  })
  if (error) throw new Error(error.message)

  // If email confirmation is disabled on the project, a session is returned and
  // the user is logged straight in. Otherwise they must confirm via email.
  if (data.session) return { user: await currentUser(), needsEmailConfirm: false }
  return { needsEmailConfirm: true, email: cleanEmail }
}

async function resendConfirmation({ email }) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: String(email || '').trim().toLowerCase(),
    options: { emailRedirectTo: `${window.location.origin}/app` },
  })
  if (error) throw new Error(error.message)
  return true
}

async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim().toLowerCase(),
    password,
  })
  if (error) throw new Error('Wrong email or password.')
  return (await currentUser()) ?? { id: data.user.id, email: data.user.email }
}

/** Save M-Pesa number after the user enters it twice. */
async function confirmMpesaNumber({ mpesaNumber, confirmMpesaNumber }) {
  const { error } = await supabase.rpc('confirm_mpesa_number', {
    p_phone: mpesaNumber,
    p_confirm: confirmMpesaNumber,
  })
  if (error) throw new Error(error.message || 'Could not save number.')
  return currentUser()
}

async function logout() {
  await supabase.auth.signOut()
}

async function currentUser() {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const meta = data.user.user_metadata || {}
  const { data: profile } = await supabase
    .from('users')
    .select('id,name,mpesa_number,is_verified,avatar_url')
    .eq('id', data.user.id)
    .maybeSingle()

  const base = profile || {
    id: data.user.id,
    name: meta.name || meta.full_name || 'Jiokoe user',
    mpesa_number: null,
    is_verified: false,
  }
  const rawMpesa = base.mpesa_number
  const phoneVerified = Boolean(base.is_verified && isRealPhone(rawMpesa))
  return {
    ...base,
    name: base.name || meta.name || meta.full_name || 'Jiokoe user',
    avatar_url: base.avatar_url || meta.avatar_url || meta.picture || null,
    email: data.user.email,
    provider: data.user.app_metadata?.provider || 'email',
    mpesa_number: phoneVerified ? rawMpesa : null,
    is_verified: phoneVerified,
    needs_onboarding: !phoneVerified,
  }
}

/** Upload a profile picture to storage and save its URL on the profile. */
async function uploadAvatar(file) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not signed in')
  if (!file) throw new Error('No file selected')
  if (!file.type?.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.')

  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const path = `${auth.user.id}/avatar.${ext}`

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (upErr) throw new Error(upErr.message)

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust so the new image shows immediately after re-upload.
  const url = `${pub.publicUrl}?v=${Date.now()}`

  const { error: updErr } = await supabase.from('users').update({ avatar_url: url }).eq('id', auth.user.id)
  if (updErr) throw new Error(updErr.message)
  await supabase.auth.updateUser({ data: { avatar_url: url } })
  return currentUser()
}

async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/app` },
  })
  if (error) throw new Error(error.message)
  // Browser redirects to Google; resolution happens on return.
}

/** Save / complete a user's profile (used by Google onboarding). */
async function updateProfile({ name, mpesaNumber }) {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Not signed in')
  const phone = normalizePhone(mpesaNumber)
  if (!isRealPhone(phone)) throw new Error('Enter a valid Safaricom number, e.g. 0712345678')

  // Guard against a number already linked to another account.
  const { data: clash } = await supabase
    .from('users')
    .select('id')
    .eq('mpesa_number', phone)
    .neq('id', auth.user.id)
    .maybeSingle()
  if (clash) throw new Error('That Mpesa number is already linked to another account.')

  const row = {
    name: name?.trim() || auth.user.user_metadata?.name || 'Jiokoe user',
    mpesa_number: phone,
  }
  const { data: existing } = await supabase.from('users').select('id,is_verified').eq('id', auth.user.id).maybeSingle()
  if (existing) {
    const { error } = await supabase.from('users').update(row).eq('id', auth.user.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('users').insert({
      id: auth.user.id,
      ...row,
      is_verified: false,
    })
    if (error) throw new Error(error.message)
  }
  await supabase.auth.updateUser({ data: { mpesa_number: phone, name: row.name } })
  return currentUser()
}

/** Subscribe to auth changes (needed so OAuth redirects resolve the session). */
function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange(() => callback())
  return () => data.subscription.unsubscribe()
}

async function resetPassword({ email }) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email || '').trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/reset` },
  )
  if (error) throw new Error(error.message)
  return true
}

/** Set a new password for the user currently in a recovery session. */
async function updatePassword({ newPassword }) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
  return true
}

// Edge function errors arrive as a FunctionsHttpError whose response body holds
// the JSON { error } we returned. Surface that message to the user.
function formatApiError(value, fallback) {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if (typeof value.message === 'string') return value.message
    if (typeof value.error === 'string') return value.error
    if (value.error) return formatApiError(value.error, fallback)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

async function readFnError(error, fallback) {
  const raw = error?.message || ''
  if (/failed to fetch|failed to load|networkerror|load resource/i.test(raw)) {
    return 'Could not reach the server. Log in again, then retry.'
  }
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return formatApiError(body.error, fallback)
    if (body?.message) return formatApiError(body.message, fallback)
  } catch {
    /* ignore */
  }
  return formatApiError(raw, fallback)
}

async function createSchedule(payload) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    throw new Error('Your session expired. Log in again, then retry.')
  }
  // Compute the deposit total on the client for the summary, but the
  // edge function recomputes authoritatively before triggering STK push.
  const activeSlots = payload.slots.filter((s) => Number(s.amount) > 0)
  const { data, error } = await supabase.functions.invoke('create-schedule', {
    body: payload,
  })
  if (error) throw new Error(await readFnError(error, 'Could not create schedule.'))
  if (data?.error) throw new Error(formatApiError(data.error, 'Could not create schedule.'))
  if (data?.stkError) {
    const detail = formatApiError(data.stkError, '')
    throw new Error(
      detail && !detail.startsWith('{')
        ? detail
        : "Couldn't start the M-Pesa prompt. Please try again in a moment.",
    )
  }
  return {
    scheduleId: data.scheduleId,
    depositId: data.depositId,
    breakdown: data.breakdown ?? depositBreakdown(activeSlots, data.activeDays ?? 0),
  }
}

async function addFunds({ scheduleId, sends }) {
  const { data: sessionData } = await supabase.auth.getSession()
  if (!sessionData.session) {
    throw new Error('Your session expired. Log in again, then retry.')
  }
  const { data, error } = await supabase.functions.invoke('add-funds', {
    body: { scheduleId, sends },
  })
  if (error) throw new Error(await readFnError(error, 'Could not add funds.'))
  if (data?.error) throw new Error(formatApiError(data.error, 'Could not add funds.'))
  if (data?.stkError) {
    return { depositId: data.depositId, total: data.total, stkError: data.stkError }
  }
  return {
    depositId: data.depositId,
    total: data.total,
    scheduleId: data.scheduleId,
    sendCount: data.sendCount,
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

async function listDeposits() {
  const { data } = await supabase
    .from('deposits')
    .select('*, schedules(name)')
    .order('created_at', { ascending: false })
  return (data || []).map((d) => ({ ...d, schedule_name: d.schedules?.name }))
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

  const { data: up } = await supabase
    .from('transactions')
    .select('*, schedules(name)')
    .eq('status', 'PENDING')
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(30)

  const upcoming = (up || []).map((t) => ({ ...t, schedule_name: t.schedules?.name }))

  const cards = schedules.map((s) => {
    const next = upcomingToday.find((t) => t.schedule_id === s.id && t.status === 'PENDING')
    const nextAny = upcoming.find((t) => t.schedule_id === s.id)
    return {
      ...s,
      nextSendToday: next ? next.scheduled_for : null,
      nextSend: nextAny ? nextAny.scheduled_for : null,
      remainingDays: Math.max(0, (s.total_days || 0) - (s.days_completed || 0)),
    }
  })

  return { totalLocked, schedules: cards, upcomingToday, upcoming }
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
    slots: slots.map((s) => ({ send_time: s.send_time, amount: s.amount, label: s.label, day_key: s.day_key ?? null })),
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

export const supabaseBackend = {
  isMock: false,
  register,
  resendConfirmation,
  login,
  logout,
  currentUser,
  signInWithGoogle,
  updateProfile,
  uploadAvatar,
  onAuthChange,
  confirmMpesaNumber,
  resetPassword,
  updatePassword,
  createSchedule,
  addFunds,
  confirmDeposit,
  listSchedules,
  getSchedule,
  listTransactions,
  listDeposits,
  getDashboard,
  getRecycleDraft,
  requestCancellation,
  tick,
  feeFor,
}
