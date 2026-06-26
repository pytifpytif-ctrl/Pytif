// Display helpers. All money is integer KES.

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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDateShort(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatDateLong(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateTime(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return `${formatDateShort(d)} · ${formatTime12(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )}`
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
