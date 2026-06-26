// Display helpers. All money is integer KES.

/** App timezone — M-Pesa / schedules use Kenya local (EAT, UTC+3). */
export const APP_TIMEZONE = 'Africa/Nairobi'
export const APP_TZ_OFFSET = '+03:00'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** ISO timestamp → YYYY-MM-DD in {@link APP_TIMEZONE}. */
export function toLocalDayKey(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value
  return y && m && day ? `${y}-${m}-${day}` : ''
}

/** Today's calendar date key in {@link APP_TIMEZONE}. */
export function startOfTodayKey() {
  return toLocalDayKey(new Date())
}

/** Clock parts in {@link APP_TIMEZONE}. */
export function localTimeParts(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return { hour: 0, minute: 0, second: 0 }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? 0),
    second: Number(parts.find((p) => p.type === 'second')?.value ?? 0),
  }
}

/** ISO timestamp → HH:MM in {@link APP_TIMEZONE}. */
export function toLocalTimeString(value) {
  const { hour, minute } = localTimeParts(value)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** ISO timestamp → 12-hour label in {@link APP_TIMEZONE}. */
export function formatLocalTime(value) {
  return formatTime12(toLocalTimeString(value))
}

/** UTC bounds for one calendar day in {@link APP_TIMEZONE} (for API queries). */
export function localDayRange(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + 1))
  const nextKey = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
  return {
    start: `${dayKey}T00:00:00${APP_TZ_OFFSET}`,
    end: `${nextKey}T00:00:00${APP_TZ_OFFSET}`,
  }
}

/** 0 = Sunday … 6 = Saturday in {@link APP_TIMEZONE}. */
export function getLocalDayOfWeek(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return 0
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(d)
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 0
}

/** Format a YYYY-MM-DD key for display (weekday + day + month in app TZ). */
export function formatDateKeyShort(dayKey) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return ''
  const anchor = `${dayKey}T12:00:00${APP_TZ_OFFSET}`
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(new Date(anchor))
  const day = Number(dayKey.slice(8, 10))
  const month = MONTHS[Number(dayKey.slice(5, 7)) - 1]
  return `${wd} ${day} ${month}`
}

/** Format a YYYY-MM-DD key for long display. */
export function formatDateKeyLong(dayKey) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return ''
  const anchor = `${dayKey}T12:00:00${APP_TZ_OFFSET}`
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(new Date(anchor))
  const day = Number(dayKey.slice(8, 10))
  const month = MONTHS[Number(dayKey.slice(5, 7)) - 1]
  const year = dayKey.slice(0, 4)
  return `${wd}, ${day} ${month} ${year}`
}

export function formatKes(amount) {
  const n = Math.round(Number(amount) || 0)
  return 'Ksh ' + n.toLocaleString('en-KE')
}

export function formatKesPlain(amount) {
  const n = Math.round(Number(amount) || 0)
  return n.toLocaleString('en-KE')
}

/** "06:00" or "06:00:00" -> "6:00 AM" */
export function formatTime12(time) {
  if (!time) return ''
  const [hStr, mStr] = String(time).split(':')
  let h = parseInt(hStr, 10)
  const m = mStr ?? '00'
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${period}`
}

export function formatDateShort(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateKeyShort(value)
  }
  const key = toLocalDayKey(value)
  if (key) return formatDateKeyShort(key)
  return ''
}

export function formatDateLong(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return formatDateKeyLong(value)
  }
  const key = toLocalDayKey(value)
  if (key) return formatDateKeyLong(key)
  return ''
}

export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${formatDateShort(d)} · ${formatLocalTime(d)}`
}

/** Kenyan Safaricom number: 07XXXXXXXX or 01XXXXXXXX */
export function isRealPhone(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254') && digits.length === 12) {
    return /^254(7|1)\d{8}$/.test(digits)
  }
  return /^(07|01)\d{8}$/.test(digits)
}

/** Display formatting: 0712 345 678 */
export function formatPhone(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return num
}

/** Masked display for UI: 07XX XXX 678 (checklist §8) */
export function maskPhone(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 2)}XX XXX ${digits.slice(7)}`
  }
  return '***'
}

/** Masked email for UI: j***@example.com */
export function maskEmail(email) {
  const raw = String(email || '').trim()
  const at = raw.indexOf('@')
  if (at <= 1) return 'your email'
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  return `${local[0]}***@${domain}`
}
