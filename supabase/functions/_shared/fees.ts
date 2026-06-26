// Jiokoe production fee engine — Safaricom tariffs (June 2026).
// Mirrors src/lib/fees.js for Deno edge functions.

export const JIOKOE_DAILY_FEE = 10
export const B2C_MAX = 150_000
export const MPESA_DAILY_LIMIT = 500_000
export const STK_MAX_DEPOSIT = 250_000
export const MAX_ACTIVE_DAYS = 365
export const MIN_SLOT_AMOUNT = 1

export function lookupB2cFee(amount: number): number {
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

export function lookupDepositFee(amount: number): number {
  return lookupB2cFee(amount)
}

export function splitB2cSends(amount: number): number[] {
  const total = Math.round(Number(amount) || 0)
  if (total <= 0) return []
  if (total <= B2C_MAX) return [total]
  const sends: number[] = []
  let remaining = total
  while (remaining > 0) {
    const chunk = Math.min(remaining, B2C_MAX)
    sends.push(chunk)
    remaining -= chunk
  }
  return sends
}

export function b2cFeeForSend(amount: number): number {
  return splitB2cSends(amount).reduce((sum, chunk) => sum + lookupB2cFee(chunk), 0)
}

export function topUpTotalForSend(amount: number): number {
  const a = Math.round(Number(amount) || 0)
  if (a <= 0) return 0
  return a + b2cFeeForSend(a)
}

export type SlotLike = { amount: number; label?: string; send_time?: string; day_key?: string | null }

export function slotsForDate(date: Date, slots: SlotLike[], pattern: string): SlotLike[] {
  const hasPerDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!hasPerDay) return slots
  const isoDow = (() => {
    const js = date.getUTCDay()
    return js === 0 ? 7 : js
  })()
  const key = pattern === 'CUSTOM_DATES' ? date.toISOString().slice(0, 10) : String(isoDow)
  return slots.filter((s) => String(s.day_key) === key)
}

export function validateDailyTotal(slots: SlotLike[], pattern: string, activeDateList: Date[]): void {
  if (!activeDateList.length) return
  for (const date of activeDateList) {
    const daySlots = slotsForDate(date, slots, pattern)
    const daily = daySlots.reduce((sum, slot) => sum + Math.round(Number(slot.amount) || 0), 0)
    if (daily > MPESA_DAILY_LIMIT) {
      throw new Error(
        `Daily total Ksh ${daily.toLocaleString('en-KE')} exceeds M-Pesa limit of Ksh ${MPESA_DAILY_LIMIT.toLocaleString('en-KE')}.`,
      )
    }
  }
}

export function validateScheduleLimits(opts: {
  activeDays: number
  totalToCollect: number
  slots: SlotLike[]
  pattern: string
  activeDateList: Date[]
}): void {
  const { activeDays, totalToCollect, slots, pattern, activeDateList } = opts
  if (activeDays < 1) throw new Error('Schedule must have at least one active day.')
  if (activeDays > MAX_ACTIVE_DAYS) throw new Error(`Schedule cannot exceed ${MAX_ACTIVE_DAYS} active days.`)
  for (const slot of slots) {
    const amount = Math.round(Number(slot.amount) || 0)
    if (amount > 0 && amount < MIN_SLOT_AMOUNT) {
      throw new Error(`Minimum send is Ksh ${MIN_SLOT_AMOUNT}.`)
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

export type DepositCalculation = {
  activeDays: number
  totalSends: number
  baseAmount: number
  mpesaFees: number
  serviceFees: number
  totalFees: number
  total: number
  slotBreakdown: Array<{
    label: string
    amount: number
    b2cFeePerSend: number
    sendCount: number
    slotTotalBase: number
    slotTotalB2c: number
  }>
  depositFeeAbsorbed: number
}

export function calculateScheduleDeposit(
  pattern: string,
  slots: SlotLike[],
  activeDateList: Date[],
): DepositCalculation {
  const valid = slots.filter((s) => Number(s.amount) > 0)
  const activeDays = activeDateList.length

  let baseAmount = 0
  let mpesaFees = 0
  let totalSends = 0
  const slotTotals = new Map<string, DepositCalculation['slotBreakdown'][0]>()

  for (const date of activeDateList) {
    for (const slot of slotsForDate(date, valid, pattern)) {
      const amount = Math.round(Number(slot.amount) || 0)
      const b2cPerSend = b2cFeeForSend(amount)
      baseAmount += amount
      mpesaFees += b2cPerSend
      totalSends += 1

      const mapKey = `${slot.label ?? ''}|${amount}|${slot.send_time ?? ''}|${slot.day_key ?? ''}`
      const existing = slotTotals.get(mapKey) || {
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
      slotTotals.set(mapKey, existing)
    }
  }

  const serviceFees = JIOKOE_DAILY_FEE * activeDays
  const total = baseAmount + mpesaFees + serviceFees

  validateScheduleLimits({
    activeDays,
    totalToCollect: total,
    slots: valid,
    pattern,
    activeDateList,
  })

  return {
    activeDays,
    totalSends,
    baseAmount,
    mpesaFees,
    serviceFees,
    totalFees: mpesaFees + serviceFees,
    total,
    slotBreakdown: [...slotTotals.values()],
    depositFeeAbsorbed: lookupDepositFee(total),
  }
}
