// Local, in-browser backend used when Supabase is not configured.
// It persists to localStorage and simulates the full Jiokoe lifecycle:
// deposit (STK) -> activation -> pre-generated transactions -> scheduler ticks
// that "fire" B2C sends and deduct the locked balance.
//
// This lets the entire UX run end-to-end with zero infrastructure. The exact
// same flow is implemented for real in /supabase (SQL + Daraja edge functions).

import { depositBreakdownForDates, feeFor } from './fees.js'
import { computeActiveDates, generateTransactions } from './schedule.js'

const DB_KEY = 'jiokoe_db_v1'
const SESSION_KEY = 'jiokoe_session_v1'

function uid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { users: [], schedules: [], slots: [], transactions: [], deposits: [] }
}

function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

// NOTE: this is a demo-only obfuscation, NOT a secure hash. Real auth uses
// Supabase Auth (bcrypt) — see /supabase and README.
function pseudoHash(password) {
  return 'mock$' + btoa(unescape(encodeURIComponent(password))).split('').reverse().join('')
}

function normalizePhone(num) {
  let digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254')) digits = '0' + digits.slice(3)
  if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits
  return digits
}

function delay(ms = 350) {
  return new Promise((res) => setTimeout(res, ms))
}

// ---- Session ----
function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}
function setSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ---- Auth ----
async function register({ name, email, password }) {
  await delay()
  const db = loadDb()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(cleanEmail)) throw new Error('Enter a valid email address.')
  if (db.users.some((u) => u.email === cleanEmail)) {
    throw new Error('An account with this email already exists. Try logging in.')
  }
  const user = {
    id: uid(),
    name: name.trim(),
    email: cleanEmail,
    mpesa_number: '', // captured + confirmed during onboarding
    password_hash: pseudoHash(password),
    is_verified: false,
    created_at: new Date().toISOString(),
  }
  db.users.push(user)
  saveDb(db)
  setSession({ userId: user.id })
  // Demo mode has no email delivery, so we skip confirmation and log straight in.
  return { user: publicUser(user), needsEmailConfirm: false }
}

async function resendConfirmation() {
  await delay()
  return true
}

async function login({ email, password }) {
  await delay()
  const db = loadDb()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const user = db.users.find((u) => u.email === cleanEmail)
  if (!user || user.password_hash !== pseudoHash(password)) {
    throw new Error('Wrong email or password.')
  }
  setSession({ userId: user.id })
  return publicUser(user)
}

async function logout() {
  setSession(null)
}

async function currentUser() {
  const session = getSession()
  if (!session) return null
  const db = loadDb()
  const user = db.users.find((u) => u.id === session.userId)
  return user ? publicUser(user) : null
}

async function signInWithGoogle() {
  throw new Error('Google sign-in needs a Supabase connection (set VITE_SUPABASE_URL).')
}

async function updateProfile({ name, mpesaNumber }) {
  await delay()
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Not signed in')
  const user = db.users.find((u) => u.id === session.userId)
  if (user) {
    if (name) user.name = name.trim()
    if (mpesaNumber) user.mpesa_number = normalizePhone(mpesaNumber)
    saveDb(db)
  }
  return publicUser(user)
}

async function confirmMpesaNumber({ mpesaNumber, confirmMpesaNumber }) {
  await delay()
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Not signed in')
  const phone = normalizePhone(mpesaNumber)
  const confirm = normalizePhone(confirmMpesaNumber)
  if (!/^0\d{9}$/.test(phone)) throw new Error('Enter a valid Safaricom number, e.g. 0712345678')
  if (phone !== confirm) throw new Error('Numbers do not match. Check both fields and try again.')
  if (db.users.some((u) => u.id !== session.userId && u.mpesa_number === phone && u.is_verified)) {
    throw new Error('That M-Pesa number is already linked to another account.')
  }
  const user = db.users.find((u) => u.id === session.userId)
  user.mpesa_number = phone
  user.is_verified = true
  saveDb(db)
  return publicUser(user)
}

function onAuthChange() {
  return () => {}
}

async function resetPassword({ email }) {
  await delay()
  const db = loadDb()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const user = db.users.find((u) => u.email === cleanEmail)
  if (!user) throw new Error('No account found for that email.')
  return true
}

const PASSCODE_RESET_PREFIX = 'jiokoe_passcode_reset_'

async function requestPasscodeReset() {
  await delay(300)
  const session = getSession()
  if (!session) throw new Error('Not signed in')
  const db = loadDb()
  const user = db.users.find((u) => u.id === session.userId)
  if (!user?.email) throw new Error('No email on your account.')

  const token = uid()
  localStorage.setItem(
    `${PASSCODE_RESET_PREFIX}${token}`,
    JSON.stringify({ userId: session.userId, exp: Date.now() + 15 * 60 * 1000 }),
  )

  return {
    sent: true,
    email: user.email,
    devResetUrl: `${window.location.origin}/reset-passcode?token=${token}`,
  }
}

function readPasscodeResetToken(token) {
  const raw = localStorage.getItem(`${PASSCODE_RESET_PREFIX}${token}`)
  if (!raw) throw new Error('Invalid or expired reset link.')
  const parsed = JSON.parse(raw)
  if (Date.now() > parsed.exp) throw new Error('Reset link expired. Request a new one.')
  const session = getSession()
  if (!session || session.userId !== parsed.userId) {
    throw new Error('Sign in with the same account, then open the link again.')
  }
  return parsed
}

async function verifyPasscodeResetToken({ token }) {
  await delay(150)
  readPasscodeResetToken(token)
  return { ok: true }
}

async function completePasscodeReset({ token }) {
  await delay(150)
  readPasscodeResetToken(token)
  localStorage.removeItem(`${PASSCODE_RESET_PREFIX}${token}`)
  return { ok: true }
}

async function updatePassword({ newPassword }) {
  await delay()
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Not signed in')
  const user = db.users.find((u) => u.id === session.userId)
  user.password_hash = pseudoHash(newPassword)
  saveDb(db)
  return true
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    mpesa_number: u.is_verified && /^0\d{9}$/.test(String(u.mpesa_number || '')) ? u.mpesa_number : null,
    is_verified: u.is_verified,
    avatar_url: u.avatar_url || null,
    needs_onboarding: !u.is_verified || !/^0\d{9}$/.test(String(u.mpesa_number || '')),
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read image.'))
    reader.readAsDataURL(file)
  })
}

async function uploadAvatar(file) {
  await delay()
  if (!file?.type?.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB.')
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Not signed in')
  const user = db.users.find((u) => u.id === session.userId)
  user.avatar_url = await readFileAsDataUrl(file)
  saveDb(db)
  return publicUser(user)
}

// ---- Schedules ----
/**
 * Create a schedule + slots + a PENDING deposit (simulating STK push initiation).
 * Schedule is created as PAUSED and only becomes ACTIVE on deposit confirmation.
 */
async function createSchedule(payload) {
  await delay(500)
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Not signed in')

  const nameNorm = String(payload.name || '').trim()
  if (!nameNorm) throw new Error('Give your schedule a name.')
  const nameTaken = db.schedules.some(
    (s) =>
      s.user_id === session.userId &&
      String(s.name || '').trim().toLowerCase() === nameNorm.toLowerCase() &&
      !(s.status === 'PAUSED' && !s.total_deposited && !s.locked_balance),
  )
  if (nameTaken) throw new Error('You already have a schedule with this name. Pick another.')

  const activeDates = computeActiveDates({
    pattern: payload.pattern,
    activeDays: payload.activeDays,
    activeDates: payload.activeDates,
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    endDate: payload.endDate ? new Date(payload.endDate) : null,
  })
  const activeSlots = payload.slots.filter((s) => Number(s.amount) > 0)
  const breakdown = depositBreakdownForDates(activeDates, activeSlots, payload.pattern)

  const scheduleId = uid()
  const schedule = {
    id: scheduleId,
    user_id: session.userId,
    name: payload.name?.trim() || 'My schedule',
    pattern: payload.pattern,
    active_days: payload.activeDays || [],
    active_dates: payload.activeDates || [],
    start_date: activeDates.length ? toKey(activeDates[0]) : null,
    end_date: activeDates.length ? toKey(activeDates[activeDates.length - 1]) : null,
    total_days: activeDates.length,
    days_completed: 0,
    locked_balance: 0,
    total_deposited: 0,
    destination_mpesa: payload.destination,
    status: 'PAUSED',
    recycled_from: payload.recycledFrom || null,
    created_at: new Date().toISOString(),
  }
  db.schedules.push(schedule)

  for (const s of activeSlots) {
    db.slots.push({
      id: uid(),
      schedule_id: scheduleId,
      label: s.label || '',
      send_time: s.send_time,
      amount: Number(s.amount),
      fee: feeFor(s.amount),
      day_key: s.day_key ?? null,
      is_active: true,
    })
  }

  const deposit = {
    id: uid(),
    user_id: session.userId,
    schedule_id: scheduleId,
    amount: breakdown.total,
    mpesa_reference: null,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  }
  db.deposits.push(deposit)
  saveDb(db)

  return { scheduleId, depositId: deposit.id, breakdown }
}

async function addFunds({ scheduleId, sends }) {
  const db = loadDb()
  const session = getSession()
  if (!session) throw new Error('Log in to add funds.')
  const schedule = db.schedules.find((s) => s.id === scheduleId && s.user_id === session.userId)
  if (!schedule) throw new Error('Schedule not found.')
  if (schedule.status !== 'ACTIVE') throw new Error('You can only add funds to an active schedule.')
  if (!Array.isArray(sends) || sends.length === 0) throw new Error('Add at least one send.')

  let total = 0
  for (const raw of sends) {
    const amount = Number(raw.amount)
    if (!amount || amount <= 0) throw new Error('Enter a valid amount for each send.')
    total += amount + feeFor(amount)
  }

  const deposit = {
    id: uid(),
    user_id: session.userId,
    schedule_id: scheduleId,
    amount: total,
    mpesa_reference: null,
    status: 'PENDING',
    deposit_type: 'topup',
    topup_sends: sends.map((s) => ({
      date: s.date,
      send_time: s.send_time,
      amount: Number(s.amount),
      label: s.label || 'Top-up',
    })),
    created_at: new Date().toISOString(),
  }
  db.deposits.push(deposit)
  saveDb(db)
  return { depositId: deposit.id, total, scheduleId, sendCount: sends.length }
}

/** Simulates the C2B/STK callback confirming payment, then activates + pre-generates txns. */
async function confirmDeposit(depositId) {
  await delay(1200)
  const db = loadDb()
  const deposit = db.deposits.find((d) => d.id === depositId)
  if (!deposit) throw new Error('Deposit not found')
  deposit.status = 'CONFIRMED'
  deposit.mpesa_reference = 'WSL' + Math.random().toString(36).slice(2, 9).toUpperCase()

  const schedule = db.schedules.find((s) => s.id === deposit.schedule_id)

  if (deposit.deposit_type === 'topup') {
    for (const item of deposit.topup_sends || []) {
      const amount = Number(item.amount)
      db.transactions.push({
        id: uid(),
        schedule_id: schedule.id,
        slot_id: null,
        user_id: schedule.user_id,
        label: item.label || 'Top-up',
        amount,
        fee: feeFor(amount),
        mpesa_reference: null,
        status: 'PENDING',
        scheduled_for: new Date(`${item.date}T${item.send_time}:00+03:00`).toISOString(),
        sent_at: null,
        failure_reason: null,
      })
    }
    schedule.locked_balance += deposit.amount
    schedule.total_deposited += deposit.amount
    saveDb(db)
    tick()
    return { schedule, mpesaReference: deposit.mpesa_reference }
  }

  schedule.total_deposited = deposit.amount
  schedule.locked_balance = deposit.amount
  schedule.status = 'ACTIVE'

  const slots = db.slots.filter((s) => s.schedule_id === schedule.id)
  const activeDates = computeActiveDates({
    pattern: schedule.pattern,
    activeDays: schedule.active_days,
    activeDates: schedule.active_dates,
    startDate: schedule.start_date ? new Date(schedule.start_date) : null,
    endDate: schedule.end_date ? new Date(schedule.end_date) : null,
  })
  const txns = generateTransactions(activeDates, slots, schedule.pattern)
  for (const t of txns) {
    db.transactions.push({
      id: uid(),
      schedule_id: schedule.id,
      slot_id: t.slot_id,
      user_id: schedule.user_id,
      label: t.label,
      amount: t.amount,
      fee: t.fee,
      mpesa_reference: null,
      status: 'PENDING',
      scheduled_for: t.scheduled_for,
      sent_at: null,
      failure_reason: null,
    })
  }
  saveDb(db)
  tick() // fire anything already due (useful for demo back-dated schedules)
  return { schedule, mpesaReference: deposit.mpesa_reference }
}

function isEstablishedSchedule(schedule) {
  if (!schedule) return false
  return schedule.status !== 'PAUSED' || Number(schedule.total_deposited) > 0 || Number(schedule.locked_balance) > 0
}

function abandonUnpaidSchedule(scheduleId) {
  const db = loadDb()
  const schedule = db.schedules.find((s) => s.id === scheduleId)
  if (!schedule || schedule.status !== 'PAUSED' || schedule.total_deposited > 0 || schedule.locked_balance > 0) {
    return false
  }
  const hasConfirmed = db.deposits.some((d) => d.schedule_id === scheduleId && d.status === 'CONFIRMED')
  if (hasConfirmed) return false

  db.schedules = db.schedules.filter((s) => s.id !== scheduleId)
  db.slots = db.slots.filter((s) => s.schedule_id !== scheduleId)
  db.deposits = db.deposits.filter((d) => d.schedule_id !== scheduleId)
  db.transactions = db.transactions.filter((t) => t.schedule_id !== scheduleId)
  saveDb(db)
  return true
}

async function abandonSchedule(scheduleId) {
  await delay(100)
  return { removed: abandonUnpaidSchedule(scheduleId) }
}

async function listSchedules() {
  const db = loadDb()
  const session = getSession()
  if (!session) return []
  return db.schedules
    .filter((s) => s.user_id === session.userId)
    .filter(isEstablishedSchedule)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

async function getSchedule(id) {
  const db = loadDb()
  const schedule = db.schedules.find((s) => s.id === id)
  if (!schedule) return null
  const slots = db.slots.filter((s) => s.schedule_id === id)
  const transactions = db.transactions
    .filter((t) => t.schedule_id === id)
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  return { schedule, slots, transactions }
}

async function listTransactions() {
  const db = loadDb()
  const session = getSession()
  if (!session) return []
  const byId = Object.fromEntries(db.schedules.map((s) => [s.id, s]))
  return db.transactions
    .filter((t) => t.user_id === session.userId)
    .map((t) => ({ ...t, schedule_name: byId[t.schedule_id]?.name || 'Schedule' }))
    .sort((a, b) => new Date(b.scheduled_for) - new Date(a.scheduled_for))
}

async function listDeposits() {
  const db = loadDb()
  const session = getSession()
  if (!session) return []
  const byId = Object.fromEntries(db.schedules.map((s) => [s.id, s]))
  return db.deposits
    .filter((d) => d.user_id === session.userId)
    .map((d) => ({ ...d, schedule_name: byId[d.schedule_id]?.name || 'Schedule' }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

async function getDashboard() {
  const db = loadDb()
  const session = getSession()
  if (!session) return { totalLocked: 0, schedules: [], upcomingToday: [], upcoming: [] }
  const schedules = db.schedules.filter((s) => s.user_id === session.userId)
  const totalLocked = schedules
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.locked_balance, 0)

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const upcomingToday = db.transactions
    .filter((t) => {
      const when = new Date(t.scheduled_for)
      return t.user_id === session.userId && when >= start && when < end
    })
    .map((t) => ({ ...t, schedule_name: schedules.find((s) => s.id === t.schedule_id)?.name }))
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))

  const now = new Date()
  const upcoming = db.transactions
    .filter((t) => t.user_id === session.userId && t.status === 'PENDING' && new Date(t.scheduled_for) >= now)
    .map((t) => ({ ...t, schedule_name: schedules.find((s) => s.id === t.schedule_id)?.name }))
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
    .slice(0, 30)

  const cards = schedules.map((s) => {
    const txns = db.transactions.filter((t) => t.schedule_id === s.id)
    const nextToday = upcomingToday.find((t) => t.schedule_id === s.id && t.status === 'PENDING')
    const nextAny = upcoming.find((t) => t.schedule_id === s.id)
    const remainingDays = remainingActiveDays(s, db)
    return {
      ...s,
      nextSendToday: nextToday ? nextToday.scheduled_for : null,
      nextSend: nextAny ? nextAny.scheduled_for : null,
      remainingDays,
      totalTxns: txns.length,
      sentTxns: txns.filter((t) => t.status === 'SUCCESS').length,
    }
  })

  return { totalLocked, schedules: cards, upcomingToday, upcoming }
}

function remainingActiveDays(schedule, db) {
  const txns = db.transactions.filter((t) => t.schedule_id === schedule.id)
  const days = new Set(
    txns.filter((t) => t.status === 'PENDING').map((t) => t.scheduled_for.slice(0, 10)),
  )
  return days.size
}

/** Recycle: clone a completed schedule's config back into an editable draft payload. */
async function getRecycleDraft(scheduleId) {
  const { schedule, slots } = await getSchedule(scheduleId)
  return {
    name: schedule.name,
    pattern: schedule.pattern,
    activeDays: schedule.active_days,
    activeDates: schedule.active_dates,
    destination: schedule.destination_mpesa,
    recycledFrom: schedule.id,
    slots: slots.map((s) => ({
      send_time: s.send_time,
      amount: s.amount,
      label: s.label,
      day_key: s.day_key ?? null,
    })),
  }
}

async function requestCancellation(scheduleId) {
  // Phase 1: no free withdrawal. This only flags for manual support review.
  await delay()
  const db = loadDb()
  const schedule = db.schedules.find((s) => s.id === scheduleId)
  if (schedule) {
    schedule.cancellation_requested = true
    saveDb(db)
  }
  return true
}

function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---- Scheduler simulation (the pg_cron equivalent) ----
// Finds PENDING transactions that are due and "sends" them.
function tick() {
  const db = loadDb()
  const now = Date.now()
  let changed = false

  for (const t of db.transactions) {
    if (t.status !== 'PENDING') continue
    const due = new Date(t.scheduled_for).getTime()
    if (due > now) continue
    const schedule = db.schedules.find((s) => s.id === t.schedule_id)
    if (!schedule || schedule.status !== 'ACTIVE') continue
    if (schedule.locked_balance < t.amount) {
      t.status = 'FAILED'
      t.failure_reason = 'Insufficient locked balance'
      t.sent_at = new Date().toISOString()
      changed = true
      continue
    }
    // Fire B2C (simulated success).
    t.status = 'SUCCESS'
    t.sent_at = new Date().toISOString()
    t.mpesa_reference = 'B2C' + Math.random().toString(36).slice(2, 9).toUpperCase()
    schedule.locked_balance -= t.amount
    changed = true
  }

  // Update days_completed + completion status.
  for (const schedule of db.schedules) {
    if (schedule.status !== 'ACTIVE') continue
    const txns = db.transactions.filter((x) => x.schedule_id === schedule.id)
    const dayMap = {}
    for (const x of txns) {
      const day = x.scheduled_for.slice(0, 10)
      dayMap[day] = dayMap[day] || []
      dayMap[day].push(x)
    }
    const completedDays = Object.values(dayMap).filter((list) =>
      list.every((x) => x.status === 'SUCCESS' || x.status === 'FAILED'),
    ).length
    if (completedDays !== schedule.days_completed) {
      schedule.days_completed = completedDays
      changed = true
    }
    const allDone = txns.length > 0 && txns.every((x) => x.status === 'SUCCESS' || x.status === 'FAILED')
    if (allDone) {
      schedule.status = 'COMPLETED'
      changed = true
    }
  }

  if (changed) saveDb(db)
  return changed
}

export const mockBackend = {
  isMock: true,
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
  requestPasscodeReset,
  verifyPasscodeResetToken,
  completePasscodeReset,
  createSchedule,
  addFunds,
  confirmDeposit,
  abandonSchedule,
  listSchedules,
  getSchedule,
  listTransactions,
  listDeposits,
  getDashboard,
  getRecycleDraft,
  requestCancellation,
  tick,
}
