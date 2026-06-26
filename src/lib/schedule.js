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

/** Duration presets for Step 4. */
export const DURATION_PRESETS = [7, 14, 30]
