export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDayKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Sunday 00:00 local time for the week containing `date`. */
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

/** Seven YYYY-MM-DD keys from Sunday through Saturday of the current week. */
export function getWeekDayKeys(date = new Date()) {
  const start = getWeekStart(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toDayKey(d)
  })
}

const SKIP_DEPOSIT = new Set(['FAILED', 'ABANDONED', 'CANCELLED'])
const SKIP_SEND = new Set(['FAILED', 'CANCELLED'])

/**
 * Aggregate money in (deposits) and money out (scheduled sends) per weekday
 * for the current calendar week (Sun–Sat, resets Sunday 00:00).
 */
export function buildWeeklyActivity({ transactions = [], deposits = [], now = new Date() }) {
  const dayKeys = getWeekDayKeys(now)
  const todayIndex = now.getDay()

  const inByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]))
  const outByDay = Object.fromEntries(dayKeys.map((k) => [k, 0]))

  for (const t of transactions) {
    if (SKIP_SEND.has(t.status)) continue
    const key = String(t.scheduled_for).slice(0, 10)
    if (key in outByDay) outByDay[key] += Number(t.amount) || 0
  }

  for (const d of deposits) {
    if (SKIP_DEPOSIT.has(d.status)) continue
    const key = String(d.created_at).slice(0, 10)
    if (key in inByDay) inByDay[key] += Number(d.amount) || 0
  }

  return dayKeys.map((dayKey, i) => ({
    label: WEEKDAY_LABELS[i],
    dayKey,
    moneyIn: inByDay[dayKey],
    moneyOut: outByDay[dayKey],
    isToday: i === todayIndex,
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
