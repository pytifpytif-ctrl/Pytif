// Local, in-browser backend used when Supabase is not configured.
// It persists to localStorage and simulates the full Wastel lifecycle:
// deposit (STK) -> activation -> pre-generated transactions -> scheduler ticks
// that "fire" B2C sends and deduct the locked balance.
//
// This lets the entire UX run end-to-end with zero infrastructure. The exact
// same flow is implemented for real in /supabase (SQL + Daraja edge functions).

import { depositBreakdown, feeFor } from './fees.js'
import { computeActiveDates, generateTransactions } from './schedule.js'

const DB_KEY = 'wastel_db_v1'
const SESSION_KEY = 'wastel_session_v1'

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

// ---- Auth ----
async function register({ name, mpesaNumber, password }) {
  await delay()
  const db = loadDb()
  const phone = normalizePhone(mpesaNumber)
  if (!/^0\d{9}$/.test(phone)) throw new Error('Enter a valid Safaricom number, e.g. 0712345678')
  if (db.users.some((u) => u.mpesa_number === phone)) {
    throw new Error('An account with this number already exists. Try logging in.')
  }
  const user = {
    id: uid(),
    name: name.trim(),
    mpesa_number: phone,
    password_hash: pseudoHash(password),
    is_verified: true, // OTP auto-verified in demo
    created_at: new Date().toISOString(),
  }
  db.users.push(user)
  saveDb(db)
  const session = { userId: user.id }
  setSession(session)
  return publicUser(user)
}

async function login({ mpesaNumber, password }) {
  await delay()
  const db = loadDb()
  const phone = normalizePhone(mpesaNumber)
  const user = db.users.find((u) => u.mpesa_number === phone)
  if (!user || user.password_hash !== pseudoHash(password)) {
    throw new Error('Wrong number or password.')
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

async function resetPassword({ mpesaNumber, newPassword }) {
  await delay()
  const db = loadDb()
  const phone = normalizePhone(mpesaNumber)
  const user = db.users.find((u) => u.mpesa_number === phone)
  if (!user) throw new Error('No account found for that number.')
  user.password_hash = pseudoHash(newPassword)
  saveDb(db)
  return true
}

function publicUser(u) {
  return { id: u.id, name: u.name, mpesa_number: u.mpesa_number, is_verified: u.is_verified }
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

  const activeDates = computeActiveDates({
    pattern: payload.pattern,
    activeDays: payload.activeDays,
    activeDates: payload.activeDates,
    startDate: payload.startDate ? new Date(payload.startDate) : null,
    endDate: payload.endDate ? new Date(payload.endDate) : null,
  })
  const activeSlots = payload.slots.filter((s) => Number(s.amount) > 0)
  const breakdown = depositBreakdown(activeSlots, activeDates.length)

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

/** Simulates the C2B/STK callback confirming payment, then activates + pre-generates txns. */
async function confirmDeposit(depositId) {
  await delay(1200)
  const db = loadDb()
  const deposit = db.deposits.find((d) => d.id === depositId)
  if (!deposit) throw new Error('Deposit not found')
  deposit.status = 'CONFIRMED'
  deposit.mpesa_reference = 'WSL' + Math.random().toString(36).slice(2, 9).toUpperCase()

  const schedule = db.schedules.find((s) => s.id === deposit.schedule_id)
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
  const txns = generateTransactions(activeDates, slots)
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

async function listSchedules() {
  const db = loadDb()
  const session = getSession()
  if (!session) return []
  return db.schedules
    .filter((s) => s.user_id === session.userId)
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

async function getDashboard() {
  const db = loadDb()
  const session = getSession()
  if (!session) return { totalLocked: 0, schedules: [], upcomingToday: [] }
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

  const cards = schedules.map((s) => {
    const txns = db.transactions.filter((t) => t.schedule_id === s.id)
    const nextToday = upcomingToday.find((t) => t.schedule_id === s.id && t.status === 'PENDING')
    const remainingDays = remainingActiveDays(s, db)
    return {
      ...s,
      nextSendToday: nextToday ? nextToday.scheduled_for : null,
      remainingDays,
      totalTxns: txns.length,
      sentTxns: txns.filter((t) => t.status === 'SUCCESS').length,
    }
  })

  return { totalLocked, schedules: cards, upcomingToday }
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

// ---- Demo seeding ----
async function seedDemo() {
  const db = loadDb()
  if (db.users.length) {
    setSession({ userId: db.users[0].id })
    return publicUser(db.users[0])
  }
  const user = {
    id: uid(),
    name: 'Demo User',
    mpesa_number: '0712345678',
    password_hash: pseudoHash('demo1234'),
    is_verified: true,
    created_at: new Date().toISOString(),
  }
  db.users.push(user)
  saveDb(db)
  setSession({ userId: user.id })
  return publicUser(user)
}

export const mockBackend = {
  isMock: true,
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
}
