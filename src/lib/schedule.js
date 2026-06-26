// Schedule date math. Days of week use ISO numbering: Mon=1 ... Sun=7
// to match the schema's active_days int[].

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

/** JS getDay() (Sun=0..Sat=6) -> ISO (Mon=1..Sun=7) */
export function isoDayOfWeek(date) {
  const js = date.getDay()
  return js === 0 ? 7 : js
}

/** Returns YYYY-MM-DD for a Date (local). */
export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Sends must be at least this far in the future (matches TimeWheel 5-min steps). */
export const MIN_SEND_LEAD_MS = 30 * 60 * 1000

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
  if (dateKey !== toDateKey(startOfToday())) return null
  const min = new Date(now.getTime() + MIN_SEND_LEAD_MS)
  const roundedMinutes = Math.ceil(min.getMinutes() / 5) * 5
  min.setSeconds(0, 0)
  if (roundedMinutes >= 60) {
    min.setHours(min.getHours() + 1)
    min.setMinutes(0, 0, 0)
  } else {
    min.setMinutes(roundedMinutes, 0, 0)
  }
  return `${String(min.getHours()).padStart(2, '0')}:${String(min.getMinutes()).padStart(2, '0')}`
}

/** Default slot time — today uses now+30min (rounded), future days use 6:00 AM. */
export function defaultSendTimeForDate(dateKey) {
  return earliestAllowedTimeForDate(dateKey) || '06:00'
}

/** Minimum send time when editing a per-day slot row. */
export function minSendTimeForDayKey(dayKey, pattern, resolvedDates = []) {
  const todayKey = toDateKey(startOfToday())
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
  const todayKey = toDateKey(startOfToday())
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
 *
 * @param {object} cfg
 * @param {string} cfg.pattern
 * @param {number[]} cfg.activeDays  - ISO weekdays for SPECIFIC_DAYS
 * @param {string[]} cfg.activeDates - YYYY-MM-DD for CUSTOM_DATES
 * @param {Date} cfg.startDate
 * @param {Date} cfg.endDate
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
  let cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  let guard = 0
  while (cursor <= end && guard < 1000) {
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

/**
 * The day-key a slot is bound to, for per-day schedules:
 *  - SPECIFIC_DAYS: the ISO weekday as a string ("1".."7")
 *  - CUSTOM_DATES:  the date key "YYYY-MM-DD"
 *  - uniform (every day / no per-day): null
 */
export function dayKeyForDate(date, pattern) {
  if (pattern === PATTERNS.CUSTOM_DATES) return toDateKey(date)
  return String(isoDayOfWeek(date))
}

/** Returns the slots that apply on a given date, honoring per-day `day_key`. */
export function slotsForDate(date, slots, pattern) {
  const hasPerDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!hasPerDay) return slots
  const key = dayKeyForDate(date, pattern)
  return slots.filter((s) => String(s.day_key) === key)
}

/**
 * Pre-generate transaction records (the scheduler just fires PENDING rows).
 * Returns plain objects without ids — the data layer assigns those.
 *
 * @param {Date[]} activeDateList
 * @param {Array<{id, send_time, amount, fee, label, day_key}>} slots
 * @param {string} [pattern] - needed to map per-day `day_key`s
 */
export function generateTransactions(activeDateList, slots, pattern) {
  const txns = []
  const activeSlots = slots.filter((s) => Number(s.amount) > 0 && s.is_active !== false)
  for (const date of activeDateList) {
    for (const slot of slotsForDate(date, activeSlots, pattern)) {
      const [h, m] = String(slot.send_time).split(':').map(Number)
      const scheduledFor = new Date(date)
      scheduledFor.setHours(h || 0, m || 0, 0, 0)
      txns.push({
        slot_id: slot.id,
        label: slot.label || '',
        amount: Number(slot.amount),
        fee: Number(slot.fee) || 0,
        scheduled_for: scheduledFor.toISOString(),
        status: 'PENDING',
      })
    }
  }
  return txns.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
}

/** Duration presets for calendar step. */
export const DURATION_PRESETS = [7, 14, 30]
