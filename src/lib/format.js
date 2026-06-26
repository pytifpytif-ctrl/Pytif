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

/** Kenyan Safaricom number: 0712345678 */
export function isRealPhone(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254') && digits.length === 12) return /^2547\d{8}$/.test(digits)
  return /^0\d{9}$/.test(digits)
}

/** Kenyan number formatting helper: 0712345678 -> 0712 345 678 */
export function formatPhone(num) {
  const digits = String(num || '').replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  return num
}
