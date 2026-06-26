// Schedule date math. Days of week use ISO numbering: Mon=1 ... Sun=7
// to match the schema's active_days int[].
// All calendar dates and send times use Africa/Nairobi (see format.js).

import {
  APP_TZ_OFFSET,
  getLocalDayOfWeek,
  localTimeParts,
  startOfTodayKey,
  toLocalDayKey,
} from './format.js'

export const PATTERNS = {
  EVERY_DAY: 'EVERY_DAY',
  SPECIFIC_DAYS: 'SPECIFIC_DAYS',
  CUSTOM_DATES: 'CUSTOM_DATES',
}

/** Builder-only pattern: stored as EVERY_DAY with start = end on submit. */
export const BUILDER_PATTERNS = {
  ONCE: 'ONCE',
  ...PATTERNS,
}

export const WEEKDAY_LABELS = [
  { iso: 1, short: 'Mon', long: 'Monday' },
  { iso: 2, short: 'Tue', long: 'Tuesday' },
  { iso: 3, short: 'Wed', long: 'Wednesday' },
  { iso: 4, short: 'Thu', long: 'Thursday' },
  { iso: 5, short: 'Fri', long: 'Friday' },
  { iso: 6, short: 'Sat', long: 'Saturday' },
  { iso: 7, short: 'Sun', long: 'Sunday' },
]

/** JS getDay() (Sun=0..Sat=6) -> ISO (Mon=1..Sun=7) in app timezone. */
export function isoDayOfWeek(date) {
  const js = getLocalDayOfWeek(date)
  return js === 0 ? 7 : js
}

/** Returns YYYY-MM-DD for a Date or date key in app timezone. */
export function toDateKey(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  return toLocalDayKey(date)
}

/** Parse YYYY-MM-DD as noon in app timezone (stable for calendar math). */
export function fromDateKey(key) {
  return new Date(`${key}T12:00:00${APP_TZ_OFFSET}`)
}

export function addDays(date, days) {
  const key = toDateKey(date)
  const [y, m, d] = key.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days))
  return fromDateKey(
    `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`,
  )
}

/** Midnight today in app timezone, as a Date anchor. */
export function startOfToday() {
  return fromDateKey(startOfTodayKey())
}

/** Sends must be at least this far in the future (matches TimeWheel 5-min steps). */
export const MIN_SEND_LEAD_MS = 60 * 60 * 1000

export function timeToMinutes(time) {
  const [h, m] = String(time || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function isTimeBefore(time, minTime) {
  if (!minTime) return false
  return timeToMinutes(time) < timeToMinutes(minTime)
}

export function clampTimeToMin(time, minTime) {
  if (!minTime || !isTimeBefore(time, minTime)) return time
  return minTime
}

/** Earliest selectable HH:MM on `dateKey` when it is today; otherwise null. */
export function earliestAllowedTimeForDate(dateKey, now = new Date()) {
  if (dateKey !== startOfTodayKey()) return null
  const { hour, minute } = localTimeParts(now)
  let totalMin = hour * 60 + minute + MIN_SEND_LEAD_MS / 60000
  totalMin = Math.ceil(totalMin / 5) * 5
  if (totalMin >= 24 * 60) return '23:55'
  return minutesToTime(totalMin)
}

/** Default slot time — today uses now + 1 hour (rounded), future days use 6:00 AM. */
export function defaultSendTimeForDate(dateKey) {
  return earliestAllowedTimeForDate(dateKey) || '06:00'
}

/** Minimum send time when editing a per-day slot row. */
export function minSendTimeForDayKey(dayKey, pattern, resolvedDates = []) {
  const todayKey = startOfTodayKey()
  if (pattern === PATTERNS.CUSTOM_DATES) {
    return dayKey === todayKey ? earliestAllowedTimeForDate(todayKey) : null
  }
  if (pattern === PATTERNS.SPECIFIC_DAYS) {
    if (String(isoDayOfWeek(startOfToday())) !== String(dayKey)) return null
    return resolvedDates.some((d) => toDateKey(d) === todayKey) ? earliestAllowedTimeForDate(todayKey) : null
  }
  return null
}

export function defaultSendTimeForDayKey(dayKey, pattern, resolvedDates = []) {
  return minSendTimeForDayKey(dayKey, pattern, resolvedDates) || '06:00'
}

/** Minimum send time for uniform slots that fire on every resolved date. */
export function minSendTimeForFlatSlots(resolvedDates = []) {
  const todayKey = startOfTodayKey()
  return resolvedDates.some((d) => toDateKey(d) === todayKey) ? earliestAllowedTimeForDate(todayKey) : null
}

export function bumpSlotTimesIfNeeded(slots, minTime) {
  if (!minTime) return slots
  let changed = false
  const next = slots.map((s) => {
    if (isTimeBefore(s.send_time, minTime)) {
      changed = true
      return { ...s, send_time: minTime }
    }
    return s
  })
  return changed ? next : slots
}

/**
 * Compute the list of calendar dates (Date objects, midnight) on which a
 * schedule fires, given its config.
 */
export function computeActiveDates({ pattern, activeDays = [], activeDates = [], startDate, endDate }) {
  if (pattern === PATTERNS.CUSTOM_DATES) {
    return [...activeDates]
      .map((k) => fromDateKey(k))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a - b)
  }

  if (!startDate || !endDate) return []
  const result = []
  let cursor = fromDateKey(toDateKey(startDate))
  const endKey = toDateKey(endDate)
  let guard = 0
  while (toDateKey(cursor) <= endKey && guard < 1000) {
    guard += 1
    if (pattern === PATTERNS.EVERY_DAY) {
      result.push(new Date(cursor))
    } else if (pattern === PATTERNS.SPECIFIC_DAYS) {
      if (activeDays.includes(isoDayOfWeek(cursor))) {
        result.push(new Date(cursor))
      }
    }
    cursor = addDays(cursor, 1)
  }
  return result
}

export function dayKeyForDate(date, pattern) {
  if (pattern === PATTERNS.CUSTOM_DATES) return toDateKey(date)
  return String(isoDayOfWeek(date))
}

export function slotsForDate(date, slots, pattern) {
  const hasPerDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!hasPerDay) return slots
  const key = dayKeyForDate(date, pattern)
  return slots.filter((s) => String(s.day_key) === key)
}

/** Build scheduled_for ISO string for a calendar date + HH:MM in app timezone. */
export function scheduledForIso(dateKey, sendTime) {
  const time = String(sendTime || '06:00').slice(0, 5)
  return `${dateKey}T${time}:00${APP_TZ_OFFSET}`
}

export function generateTransactions(activeDateList, slots, pattern) {
  const txns = []
  const activeSlots = slots.filter((s) => Number(s.amount) > 0 && s.is_active !== false)
  for (const date of activeDateList) {
    for (const slot of slotsForDate(date, activeSlots, pattern)) {
      const dateKey = toDateKey(date)
      txns.push({
        slot_id: slot.id,
        label: slot.label || '',
        amount: Number(slot.amount),
        fee: Number(slot.fee) || 0,
        scheduled_for: scheduledForIso(dateKey, slot.send_time),
        status: 'PENDING',
      })
    }
  }
  return txns.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
}

/** Duration presets for calendar step. */
export const DURATION_PRESETS = [7, 14, 30]
