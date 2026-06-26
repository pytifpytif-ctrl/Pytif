import { toLocalDayKey } from './format.js'
export const CONFIRMED_DEPOSIT = 'CONFIRMED'

/** Successful payout status. */
export const SUCCESS_PAYOUT = 'SUCCESS'

const PENDING_SEND = new Set(['PENDING', 'PENDING_B2C_CONFIRM'])

/** Completed movements only — notifications logbook. */
export function buildNotificationEvents(deposits = [], txns = []) {
  const inEvents = deposits
    .filter((d) => d.status === CONFIRMED_DEPOSIT)
    .map((d) => ({
      id: `dep-${d.id}`,
      kind: 'IN',
      when: d.created_at,
      amount: d.amount,
      title: 'Money locked in',
      detail: d.schedule_name,
      schedule: d.schedule_name,
      reference: d.mpesa_reference,
    }))

  const outEvents = txns
    .filter((t) => t.status === SUCCESS_PAYOUT)
    .map((t) => ({
      id: `txn-${t.id}`,
      kind: 'OUT',
      when: t.sent_at || t.scheduled_for,
      amount: t.amount,
      title: t.label ? t.label : 'Paid out to M-Pesa',
      detail: t.schedule_name,
      schedule: t.schedule_name,
      reference: t.mpesa_reference,
    }))

  return [...inEvents, ...outEvents].sort((a, b) => new Date(b.when) - new Date(a.when))
}

/** History sends tab — exclude completed payouts. */
export function isHistorySend(txn) {
  return txn.status !== SUCCESS_PAYOUT
}

/** Nearest pending send first, then most recent failures. */
export function sortHistorySends(txns = []) {
  const pending = txns.filter((t) => PENDING_SEND.has(t.status))
  const failed = txns.filter((t) => t.status === 'FAILED')
  pending.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  failed.sort((a, b) => new Date(b.scheduled_for) - new Date(a.scheduled_for))
  return [...pending, ...failed]
}

/** Nearest upcoming send at the top. */
export function sortUpcomingSends(txns = []) {
  return [...txns].sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
}

/** Newest schedule first. */
export function sortSchedulesLatest(schedules = []) {
  return [...schedules].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/** Group sends by day, preserving list order (for history / upcoming lists). */
export function groupSendsByDay(txns = []) {
  const map = new Map()
  for (const t of txns) {
    const day = toLocalDayKey(t.scheduled_for)
    if (!map.has(day)) map.set(day, [])
    map.get(day).push(t)
  }
  return [...map.entries()]
}
