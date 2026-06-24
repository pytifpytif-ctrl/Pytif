// Wastel fee structure (Phase 1).
// All fees are calculated upfront and bundled into the deposit total.
// Each send goes out as the clean amount — no deductions at send time.
//
// IMPORTANT: Verify current Mpesa B2C rates on developer.safaricom.co.ke
// before launch. These mirror the published rate bands as of the build brief.

export const WASTEL_FEE_PER_SEND = 5

// [maxAmountInclusive, mpesaFee]
const MPESA_B2C_BANDS = [
  [100, 0],
  [500, 11],
  [1000, 15],
  [1500, 27],
  [2500, 29],
  [3500, 52],
  [5000, 69],
  [7500, 87],
  [10000, 115],
]

/** Returns the standard Mpesa B2C fee for a single send of `amount` KES. */
export function mpesaFeeFor(amount) {
  const value = Number(amount) || 0
  if (value <= 0) return 0
  for (const [max, fee] of MPESA_B2C_BANDS) {
    if (value <= max) return fee
  }
  // Above the published table — fall back to the top band fee.
  return MPESA_B2C_BANDS[MPESA_B2C_BANDS.length - 1][1]
}

/** Total fee (Mpesa + Wastel) for a single send. */
export function feeFor(amount) {
  if (!amount || Number(amount) <= 0) return 0
  return mpesaFeeFor(amount) + WASTEL_FEE_PER_SEND
}

/** Breakdown for a single send. */
export function feeBreakdownFor(amount) {
  const mpesa = mpesaFeeFor(amount)
  return {
    mpesa,
    wastel: amount > 0 ? WASTEL_FEE_PER_SEND : 0,
    total: amount > 0 ? mpesa + WASTEL_FEE_PER_SEND : 0,
  }
}

/**
 * Full deposit breakdown for a schedule.
 * @param {Array<{amount:number}>} slots - active send slots
 * @param {number} activeDays - number of days the schedule fires
 */
export function depositBreakdown(slots, activeDays) {
  const activeSlots = slots.filter((s) => Number(s.amount) > 0)
  const sendsPerDay = activeSlots.length
  const totalSends = sendsPerDay * activeDays

  let baseAmount = 0
  let mpesaFees = 0
  let wastelFees = 0

  for (const slot of activeSlots) {
    const amount = Number(slot.amount) || 0
    baseAmount += amount * activeDays
    mpesaFees += mpesaFeeFor(amount) * activeDays
    wastelFees += WASTEL_FEE_PER_SEND * activeDays
  }

  const serviceFees = wastelFees
  const totalFees = mpesaFees + serviceFees
  const total = baseAmount + totalFees

  return {
    sendsPerDay,
    activeDays,
    totalSends,
    dailyTotal: activeSlots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    baseAmount,
    mpesaFees,
    serviceFees,
    totalFees,
    total,
  }
}
