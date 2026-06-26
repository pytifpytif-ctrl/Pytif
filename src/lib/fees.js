// Jiokoe production fee engine — Safaricom tariffs (June 2026).
// Integer arithmetic only. Customer Bouquet: deposit fee absorbed by Jiokoe (not collected).

import { slotsForDate, computeActiveDates, addDays } from './schedule.js'

export const JIOKOE_DAILY_FEE = 10
/** @deprecated Use JIOKOE_DAILY_FEE — service fee is per active day, not per send */
export const JIOKOE_FEE_PER_SEND = JIOKOE_DAILY_FEE
/** @deprecated Use JIOKOE_DAILY_FEE */
export const WASTEL_FEE_PER_SEND = JIOKOE_DAILY_FEE

export const B2C_MAX = 150_000
export const MPESA_DAILY_LIMIT = 500_000
export const STK_MAX_DEPOSIT = 250_000
export const MAX_ACTIVE_DAYS = 365
export const MIN_SLOT_AMOUNT = 1

/** Safaricom send-money / B2C fee for a single chunk amount (exact bands). */
export function lookupB2cFee(amount) {
  const a = Math.round(Number(amount) || 0)
  if (a <= 100) return 0
  if (a <= 500) return 7
  if (a <= 1000) return 13
  if (a <= 1500) return 23
  if (a <= 2500) return 33
  if (a <= 3500) return 53
  if (a <= 5000) return 57
  if (a <= 7500) return 78
  if (a <= 10000) return 90
  if (a <= 15000) return 100
  if (a <= 20000) return 105
  return 108
}

/** @deprecated Use lookupB2cFee */
export function mpesaFeeFor(amount) {
  return lookupB2cFee(amount)
}

/** Customer Bouquet deposit fee Jiokoe absorbs — same tariff as B2C. */
export function lookupDepositFee(amount) {
  return lookupB2cFee(amount)
}

/** Split amounts above the B2C per-transaction limit into chunks. */
export function splitB2cSends(amount) {
  const total = Math.round(Number(amount) || 0)
  if (total <= 0) return []
  if (total <= B2C_MAX) return [total]
  const sends = []
  let remaining = total
  while (remaining > 0) {
    const chunk = Math.min(remaining, B2C_MAX)
    sends.push(chunk)
    remaining -= chunk
  }
  return sends
}

/** Total B2C fee for one scheduled send (handles split chunks). */
export function b2cFeeForSend(amount) {
  return splitB2cSends(amount).reduce((sum, chunk) => sum + lookupB2cFee(chunk), 0)
}

/** Per-send B2C fee shown in slot UI (not the daily Jiokoe service fee). */
export function feeFor(amount) {
  const a = Math.round(Number(amount) || 0)
  if (a <= 0) return 0
  return b2cFeeForSend(a)
}

/** Top-up total for one send: base + B2C only (no daily service fee on top-ups). */
export function topUpTotalForSend(amount) {
  const a = Math.round(Number(amount) || 0)
  if (a <= 0) return 0
  return a + b2cFeeForSend(a)
}

export function feeBreakdownFor(amount) {
  const b2c = b2cFeeForSend(amount)
  return {
    mpesa: b2c,
    b2c,
    jiokoe: 0,
    total: b2c,
  }
}

export function validateDailyTotal(slots, pattern, activeDateList) {
  if (!activeDateList?.length) return
  for (const date of activeDateList) {
    const daySlots = slotsForDate(date, slots, pattern)
    const daily = daySlots.reduce((sum, slot) => sum + Math.round(Number(slot.amount) || 0), 0)
    if (daily > MPESA_DAILY_LIMIT) {
      throw new Error(`Daily total Ksh ${daily.toLocaleString('en-KE')} exceeds M-Pesa limit of Ksh ${MPESA_DAILY_LIMIT.toLocaleString('en-KE')}.`)
    }
  }
}

export function validateScheduleLimits({ activeDays, totalToCollect, slots, pattern, activeDateList }) {
  if (activeDays < 1) throw new Error('Schedule must have at least one active day.')
  if (activeDays > MAX_ACTIVE_DAYS) throw new Error(`Schedule cannot exceed ${MAX_ACTIVE_DAYS} active days.`)
  for (const slot of slots) {
    const amount = Math.round(Number(slot.amount) || 0)
    if (amount > 0 && amount < MIN_SLOT_AMOUNT) {
      throw new Error(`Minimum send is Ksh ${MIN_SLOT_AMOUNT}.`)
    }
    if (amount > B2C_MAX && splitB2cSends(amount).length > 1) {
      // Allowed — fee calc handles splits; B2C scheduler must split at send time.
    }
  }
  validateDailyTotal(slots, pattern, activeDateList)
  const total = Math.round(Number(totalToCollect) || 0)
  if (total > STK_MAX_DEPOSIT) {
    throw new Error(
      `Total Ksh ${total.toLocaleString('en-KE')} exceeds the Ksh ${STK_MAX_DEPOSIT.toLocaleString('en-KE')} single M-Pesa payment limit. Shorten the schedule or reduce amounts.`,
    )
  }
}

/** Warn when amount sits just above a fee band boundary (e.g. 2,501 vs 2,500). */
export function feeBandBoundaryWarning(amount) {
  const a = Math.round(Number(amount) || 0)
  if (a <= 0) return null
  const boundaries = [100, 500, 1000, 1500, 2500, 3500, 5000, 7500, 10000, 15000, 20000]
  for (const b of boundaries) {
    if (a === b + 1) {
      const lowerFee = lookupB2cFee(b)
      const higherFee = lookupB2cFee(a)
      if (higherFee > lowerFee) {
        return `Ksh ${a.toLocaleString('en-KE')} costs ${formatFeeDelta(higherFee - lowerFee)} more in M-Pesa fees than Ksh ${b.toLocaleString('en-KE')}.`
      }
    }
  }
  return null
}

function formatFeeDelta(delta) {
  return `Ksh ${delta.toLocaleString('en-KE')}`
}

/**
 * Full deposit calculation for a schedule (production algorithm).
 * @param {{ pattern: string, slots: Array<{amount:number, label?:string}>, activeDateList: Date[] }} schedule
 */
export function calculateScheduleDeposit({ pattern, slots, activeDateList }) {
  const active_days = activeDateList.length
  const valid = slots.filter((s) => Number(s.amount) > 0)

  let total_base = 0
  let total_b2c = 0
  let totalSends = 0
  const slotTotals = new Map()

  for (const date of activeDateList) {
    for (const slot of slotsForDate(date, valid, pattern)) {
      const amount = Math.round(Number(slot.amount) || 0)
      const b2cPerSend = b2cFeeForSend(amount)
      total_base += amount
      total_b2c += b2cPerSend
      totalSends += 1

      const key = `${slot.label ?? ''}|${amount}|${slot.send_time ?? ''}|${slot.day_key ?? ''}`
      const existing = slotTotals.get(key) || {
        label: slot.label || 'Send',
        amount,
        b2cFeePerSend: b2cPerSend,
        sendCount: 0,
        slotTotalBase: 0,
        slotTotalB2c: 0,
      }
      existing.sendCount += 1
      existing.slotTotalBase += amount
      existing.slotTotalB2c += b2cPerSend
      slotTotals.set(key, existing)
    }
  }

  const jiokoe_fee = JIOKOE_DAILY_FEE * active_days
  const total_to_collect = total_base + total_b2c + jiokoe_fee
  const slot_breakdown = [...slotTotals.values()]

  validateScheduleLimits({
    activeDays: active_days,
    totalToCollect: total_to_collect,
    slots: valid,
    pattern,
    activeDateList,
  })

  return {
    active_days,
    activeDays: active_days,
    total_base,
    baseAmount: total_base,
    total_b2c,
    mpesaFees: total_b2c,
    jiokoe_fee,
    serviceFees: jiokoe_fee,
    total_to_collect,
    total: total_to_collect,
    totalFees: total_b2c + jiokoe_fee,
    totalSends,
    sendsPerDay: active_days ? Math.round((totalSends / active_days) * 10) / 10 : 0,
    slot_breakdown,
    deposit_fee_absorbed: lookupDepositFee(total_to_collect),
  }
}

/** Uniform-slot shortcut when every day uses the same slots. */
export function depositBreakdown(slots, activeDays) {
  const activeSlots = slots.filter((s) => Number(s.amount) > 0)
  const dates = Array.from({ length: Math.max(0, activeDays) }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  })
  return calculateScheduleDeposit({ pattern: 'EVERY_DAY', slots: activeSlots, activeDateList: dates })
}

/** Deposit breakdown across an explicit list of active dates (honors per-day slots). */
export function depositBreakdownForDates(activeDateList, slots, pattern) {
  return calculateScheduleDeposit({ pattern, slots, activeDateList })
}

export function datesUntilLockTarget({
  startDate,
  pattern,
  activeDays = [],
  slots = [],
  targetTotal,
  maxSpanDays = MAX_ACTIVE_DAYS,
}) {
  const target = Math.round(Number(targetTotal) || 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  if (target <= 0) {
    return { endDate: start, dates: computeActiveDates({ pattern, activeDays, startDate: start, endDate: start }) }
  }

  const valid = slots.filter((s) => Number(s.amount) > 0)
  if (valid.length === 0) {
    return { endDate: start, dates: computeActiveDates({ pattern, activeDays, startDate: start, endDate: start }) }
  }

  let end = start
  let dates = []
  for (let span = 1; span <= maxSpanDays; span++) {
    end = addDays(start, span - 1)
    dates = computeActiveDates({ pattern, activeDays, startDate: start, endDate: end })
    const { total } = depositBreakdownForDates(dates, slots, pattern)
    if (total >= target) return { endDate: end, dates }
  }
  return { endDate: end, dates }
}
