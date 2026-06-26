import { toLocalDayKey, getLocalDayOfWeek } from './format.js'
import { addDays, fromDateKey, toDateKey } from './schedule.js'
import { CONFIRMED_DEPOSIT } from './moneyEvents.js'

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Sunday YYYY-MM-DD (Nairobi) for the week containing `now`. */
export function getWeekStartKey(now = new Date()) {
  const todayKey = toLocalDayKey(now)
  const dow = getLocalDayOfWeek(now)
  return toDateKey(addDays(fromDateKey(todayKey), -dow))
}

/** Seven YYYY-MM-DD keys from Sunday through Saturday of the current Nairobi week. */
export function getWeekDayKeys(now = new Date()) {
  const startKey = getWeekStartKey(now)
  const start = fromDateKey(startKey)
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(start, i)))
}

const SKIP_SEND = new Set(['FAILED', 'CANCELLED'])

/**
 * Aggregate money in (confirmed deposits) and money out (scheduled sends) per weekday
 * for the current calendar week (Sun–Sat, Nairobi time).
 */
export function buildWeeklyActivity({ transactions = [], deposits = [], now = new Date() }) {
  const dayKeys = getWeekDayKeys(now)
  const todayKey = toLocalDayKey(now)
  const todayIndex = getLocalDayOfWeek(now)

  const inByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]))
  const outByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]))

  for (const t of transactions) {
    if (SKIP_SEND.has(t.status)) continue
    const key = toLocalDayKey(t.scheduled_for)
    if (key in outByDay) outByDay[key] += Number(t.amount) || 0
  }

  for (const d of deposits) {
    if (d.status !== CONFIRMED_DEPOSIT) continue
    const key = toLocalDayKey(d.created_at)
    if (key in inByDay) inByDay[key] += Number(d.amount) || 0
  }

  return dayKeys.map((dayKey, i) => ({
    label: WEEKDAY_LABELS[i],
    dayKey,
    moneyIn: inByDay[dayKey],
    moneyOut: outByDay[dayKey],
    isToday: dayKey === todayKey,
  }))
}

export function sumWeeklyActivity(days) {
  return days.reduce(
    (acc, d) => ({
      moneyIn: acc.moneyIn + d.moneyIn,
      moneyOut: acc.moneyOut + d.moneyOut,
    }),
    { moneyIn: 0, moneyOut: 0 },
  )
}
