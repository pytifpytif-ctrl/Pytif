/**
 * Production fee engine tests — Safaricom June 2026 bands.
 * Run: node scripts/test-fees.mjs
 */

import {
  lookupB2cFee,
  b2cFeeForSend,
  splitB2cSends,
  calculateScheduleDeposit,
  depositBreakdownForDates,
  JIOKOE_DAILY_FEE,
} from '../src/lib/fees.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) {
    passed += 1
    return
  }
  failed += 1
  console.error('FAIL:', msg)
}

function assertEq(actual, expected, msg) {
  assert(actual === expected, `${msg}: expected ${expected}, got ${actual}`)
}

// --- lookupB2cFee band boundaries ---
const bands = [
  [1, 0],
  [100, 0],
  [101, 7],
  [500, 7],
  [501, 13],
  [1000, 13],
  [1001, 23],
  [1500, 23],
  [1501, 33],
  [2500, 33],
  [2501, 53],
  [3500, 53],
  [3501, 57],
  [5000, 57],
  [5001, 78],
  [7500, 78],
  [7501, 90],
  [10000, 90],
  [10001, 100],
  [15000, 100],
  [15001, 105],
  [20000, 105],
  [20001, 108],
  [250000, 108],
]

for (const [amount, fee] of bands) {
  assertEq(lookupB2cFee(amount), fee, `lookupB2cFee(${amount})`)
}

// Critical 2500/2501 jump
assertEq(lookupB2cFee(2500), 33, '2500 boundary lower')
assertEq(lookupB2cFee(2501), 53, '2501 boundary upper')
assertEq(lookupB2cFee(2501) - lookupB2cFee(2500), 20, '2501 fee jump is Ksh 20')

// --- splitB2cSends ---
assertEq(JSON.stringify(splitB2cSends(50000)), JSON.stringify([50000]), 'under limit no split')
assertEq(JSON.stringify(splitB2cSends(150000)), JSON.stringify([150000]), 'at limit no split')
assertEq(JSON.stringify(splitB2cSends(200000)), JSON.stringify([150000, 50000]), '200k splits')
assertEq(JSON.stringify(splitB2cSends(300000)), JSON.stringify([150000, 150000]), '300k splits')

// Split fee: 150k + 50k = 108 + 108 = 216
assertEq(b2cFeeForSend(200000), 216, 'split B2C fees sum per chunk')

// --- worked example from spec section 5.3 ---
const exampleDates = Array.from({ length: 20 }, (_, i) => {
  const d = new Date('2026-06-02T00:00:00+03:00')
  d.setDate(d.getDate() + i)
  return d
})
const exampleSlots = [
  { amount: 100, label: 'Morning matatu', send_time: '06:00' },
  { amount: 280, label: 'Lunch', send_time: '12:00' },
  { amount: 100, label: 'Evening fare', send_time: '17:30' },
]

const example = depositBreakdownForDates(exampleDates, exampleSlots, 'EVERY_DAY')
assertEq(example.baseAmount, 9600, 'example base amount')
assertEq(example.mpesaFees, 140, 'example B2C fees (280×7×20)')
assertEq(example.serviceFees, 20 * JIOKOE_DAILY_FEE, 'example service fee')
assertEq(example.total, 9940, 'example total to collect')

// --- daily limit rejection ---
let threwDaily = false
try {
  calculateScheduleDeposit({
    pattern: 'EVERY_DAY',
    slots: [{ amount: 500001, label: 'Huge' }],
    activeDateList: [new Date('2026-06-02')],
  })
} catch (e) {
  threwDaily = e.message.includes('500')
}
assert(threwDaily, 'rejects daily total over 500k')

// --- STK max rejection ---
let threwStk = false
try {
  const days = Array.from({ length: 25 }, (_, i) => {
    const d = new Date('2026-01-01T00:00:00+03:00')
    d.setDate(d.getDate() + i)
    return d
  })
  depositBreakdownForDates(days, [{ amount: 10000, label: 'Daily' }], 'EVERY_DAY')
} catch (e) {
  threwStk = e.message.includes('250')
}
assert(threwStk, 'rejects deposit over 250k STK limit')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
