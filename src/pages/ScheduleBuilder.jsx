import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { Spinner, Alert, StatusBadge } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import TimeWheel from '../components/TimeWheel.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import {
  PATTERNS,
  WEEKDAY_LABELS,
  DURATION_PRESETS,
  computeActiveDates,
  generateTransactions,
  addDays,
  startOfToday,
  toDateKey,
  fromDateKey,
} from '../lib/schedule.js'

// Sends must be at least this far in the future (no past / too-soon sends).
const MIN_LEAD_MS = 60 * 60 * 1000
import { depositBreakdownForDates, feeFor } from '../lib/fees.js'
import { formatKes, formatTime12, formatDateShort, formatPhone } from '../lib/format.js'

const newSlot = (overrides = {}) => ({
  key: Math.random().toString(36).slice(2),
  send_time: '06:00',
  amount: '',
  label: '',
  ...overrides,
})

/** Find a slot by key across the flat (every-day) list and the per-day map. */
function findSlotByKey(key, slots, daySlots) {
  const flat = slots.find((s) => s.key === key)
  if (flat) return flat
  for (const list of Object.values(daySlots || {})) {
    const hit = list.find((s) => s.key === key)
    if (hit) return hit
  }
  return null
}

export default function ScheduleBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isRecycle = Boolean(id)

  const [loadingDraft, setLoadingDraft] = useState(isRecycle)
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState(PATTERNS.EVERY_DAY)
  const [activeDays, setActiveDays] = useState([1, 2, 3, 4, 5])
  const [activeDates, setActiveDates] = useState([])
  const [slots, setSlots] = useState([newSlot({ label: 'Morning fare', amount: 100 })])
  const [daySlots, setDaySlots] = useState({})
  const [duration, setDuration] = useState({ type: 'preset', days: 30, endDateKey: null })
  const [destination] = useState(user?.mpesa_number || '')

  const [stepIndex, setStepIndex] = useState(0)
  const [timeEditor, setTimeEditor] = useState(null)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState('build') // build | stk | success
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!isRecycle) return
    ;(async () => {
      const draft = await api.getRecycleDraft(id)
      setName(draft.name + ' (recycled)')
      setPattern(draft.pattern)
      setActiveDays(draft.activeDays?.length ? draft.activeDays : [1, 2, 3, 4, 5])
      setActiveDates(draft.activeDates || [])
      const draftSlots = (draft.slots || []).map((s) =>
        newSlot({ send_time: s.send_time, amount: s.amount, label: s.label, day_key: s.day_key ?? null }),
      )
      if (draftSlots.some((s) => s.day_key != null)) {
        const map = {}
        for (const s of draftSlots) (map[String(s.day_key)] = map[String(s.day_key)] || []).push(s)
        setDaySlots(map)
      } else {
        setSlots(draftSlots)
      }
      setLoadingDraft(false)
    })()
  }, [id, isRecycle])

  // Dynamic step list based on pattern.
  const steps = useMemo(() => {
    if (pattern === PATTERNS.CUSTOM_DATES) return ['pattern', 'dates', 'slots', 'destination', 'summary']
    if (pattern === PATTERNS.SPECIFIC_DAYS) return ['pattern', 'days', 'slots', 'duration', 'destination', 'summary']
    return ['pattern', 'slots', 'duration', 'destination', 'summary']
  }, [pattern])

  const step = steps[Math.min(stepIndex, steps.length - 1)]

  // Resolve dates + breakdown.
  const resolved = useMemo(() => {
    const start = startOfToday()
    let end = start
    if (pattern === PATTERNS.CUSTOM_DATES) {
      const dates = computeActiveDates({ pattern, activeDates })
      return { startDate: dates[0] || null, endDate: dates[dates.length - 1] || null, dates }
    }
    if (duration.type === 'endDate' && duration.endDateKey) {
      end = fromDateKey(duration.endDateKey)
    } else {
      end = addDays(start, Math.max(1, duration.days) - 1)
    }
    const dates = computeActiveDates({ pattern, activeDays, startDate: start, endDate: end })
    return { startDate: start, endDate: end, dates }
  }, [pattern, activeDays, activeDates, duration])

  const isPerDay = pattern !== PATTERNS.EVERY_DAY

  // The ordered list of editable "days" for per-day patterns.
  const dayKeys = useMemo(() => {
    if (pattern === PATTERNS.SPECIFIC_DAYS) {
      return [...activeDays]
        .sort((a, b) => a - b)
        .map((iso) => ({ key: String(iso), label: WEEKDAY_LABELS.find((w) => w.iso === iso)?.long || '' }))
    }
    if (pattern === PATTERNS.CUSTOM_DATES) {
      return [...activeDates].sort().map((k) => ({ key: k, label: formatDateShort(fromDateKey(k)) }))
    }
    return []
  }, [pattern, activeDays, activeDates])

  // Keep per-day slots in sync with the selected days (add new, drop removed).
  useEffect(() => {
    if (!isPerDay) return
    setDaySlots((prev) => {
      const next = {}
      for (const { key } of dayKeys) {
        next[key] = prev[key]?.length ? prev[key] : [newSlot({ amount: 100 })]
      }
      return next
    })
  }, [isPerDay, dayKeys])

  // Flatten to the slot list used for pricing + submission.
  const flatSlots = useMemo(() => {
    if (!isPerDay) return slots.map((s) => ({ ...s, day_key: null }))
    const out = []
    for (const { key } of dayKeys) for (const s of daySlots[key] || []) out.push({ ...s, day_key: key })
    return out
  }, [isPerDay, slots, daySlots, dayKeys])

  const breakdown = depositBreakdownForDates(resolved.dates, flatSlots, pattern)
  const dailyTotal = slots.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  // Earliest actual send (date + time). Used to block past / too-soon sends.
  const earliestSend = useMemo(() => {
    const txns = generateTransactions(resolved.dates, flatSlots, pattern)
    return txns[0] ? new Date(txns[0].scheduled_for) : null
  }, [resolved.dates, flatSlots, pattern])

  const leadError =
    earliestSend && earliestSend.getTime() < Date.now() + MIN_LEAD_MS
      ? `Your earliest send is ${formatTime12(
          earliestSend.toTimeString().slice(0, 5),
        )} on ${formatDateShort(earliestSend)}, which is in the past or too soon. Sends must be at least 1 hour from now — pick a later time${
          pattern === PATTERNS.EVERY_DAY ? '.' : ' or date.'
        }`
      : ''

  const next = () => {
    setError('')
    const err = validateStep(step)
    if (err) return setError(err)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }
  const back = () => {
    setError('')
    if (stepIndex === 0) return navigate(-1)
    setStepIndex((i) => i - 1)
  }

  function validateStep(s) {
    if (s === 'pattern' && !name.trim()) return 'Give your schedule a name.'
    if (s === 'days' && activeDays.length === 0) return 'Pick at least one day.'
    if (s === 'dates' && activeDates.length === 0) return 'Select at least one date.'
    if (s === 'slots') {
      if (isPerDay) {
        for (const { key, label } of dayKeys) {
          const valid = (daySlots[key] || []).filter((x) => Number(x.amount) > 0)
          if (valid.length === 0) return `Add at least one send for ${label}.`
        }
      } else {
        const valid = slots.filter((x) => Number(x.amount) > 0)
        if (valid.length === 0) return 'Add at least one send with an amount.'
      }
      if (leadError) return leadError
    }
    if (s === 'summary' && resolved.dates.length === 0) return 'This schedule has no active days. Adjust your dates.'
    if (s === 'summary' && leadError) return leadError
    return ''
  }

  const lockMoney = async () => {
    setError('')
    if (leadError) {
      setError(leadError)
      return
    }
    setPhase('stk')
    try {
      const payload = {
        name,
        pattern,
        activeDays,
        activeDates,
        startDate: resolved.startDate ? resolved.startDate.toISOString() : null,
        endDate: resolved.endDate ? resolved.endDate.toISOString() : null,
        destination,
        recycledFrom: isRecycle ? id : null,
        slots: flatSlots
          .filter((s) => Number(s.amount) > 0)
          .map((s) => ({
            send_time: s.send_time,
            amount: Number(s.amount),
            label: s.label,
            day_key: s.day_key ?? null,
            is_active: true,
          })),
      }
      const created = await api.createSchedule(payload)
      const confirmed = await api.confirmDeposit(created.depositId)
      const firstPending = (await api.getSchedule(created.scheduleId)).transactions.find(
        (t) => t.status === 'PENDING',
      )
      setResult({
        scheduleId: created.scheduleId,
        mpesaReference: confirmed.mpesaReference,
        firstSend: firstPending?.scheduled_for || resolved.dates[0]?.toISOString(),
        total: breakdown.total,
      })
      setPhase('success')
    } catch (err) {
      setError(err.message)
      setPhase('build')
      setStepIndex(steps.indexOf('summary'))
    }
  }

  if (loadingDraft) {
    return (
      <div className="flex h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!destination) return <NeedsNumber navigate={navigate} />

  if (phase === 'stk') return <StkWaiting total={breakdown.total} number={destination} />
  if (phase === 'success') return <SuccessScreen result={result} navigate={navigate} />

  const progress = ((stepIndex + 1) / steps.length) * 100

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col lg:max-w-2xl">
      {/* Top bar + progress */}
      <div className="sticky top-0 z-20 bg-app/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={back}
            className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink shadow-card"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="text-xs font-semibold text-ink-muted">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div className="flex-1 px-5 pb-32 pt-4">
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {step === 'pattern' && (
          <StepPattern name={name} setName={setName} pattern={pattern} setPattern={setPattern} isRecycle={isRecycle} />
        )}
        {step === 'days' && <StepDays activeDays={activeDays} setActiveDays={setActiveDays} />}
        {step === 'dates' && <StepDates activeDates={activeDates} setActiveDates={setActiveDates} />}
        {step === 'slots' && !isPerDay && (
          <StepSlots slots={slots} setSlots={setSlots} openTime={(key) => setTimeEditor(key)} />
        )}
        {step === 'slots' && isPerDay && (
          <StepDaySlots
            dayKeys={dayKeys}
            daySlots={daySlots}
            setDaySlots={setDaySlots}
            openTime={(key) => setTimeEditor(key)}
          />
        )}
        {step === 'duration' && (
          <StepDuration duration={duration} setDuration={setDuration} activeDays={resolved.dates.length} pattern={pattern} />
        )}
        {step === 'destination' && <StepDestination destination={destination} />}
        {step === 'summary' && (
          <StepSummary
            name={name}
            pattern={pattern}
            breakdown={breakdown}
            dailyTotal={dailyTotal}
            resolved={resolved}
            destination={destination}
            activeDays={activeDays}
            isPerDay={isPerDay}
          />
        )}
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-surface/95 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur lg:max-w-2xl">
        {step === 'slots' && (
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-ink-muted">{isPerDay ? 'Est. total to lock' : 'Daily total'}</span>
            <span className="text-lg font-extrabold text-ink">
              {formatKes(isPerDay ? breakdown.total : dailyTotal)}
            </span>
          </div>
        )}
        {step === 'summary' ? (
          <button className="btn-primary w-full" onClick={lockMoney}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
            </svg>
            Lock my money · {formatKes(breakdown.total)}
          </button>
        ) : (
          <button className="btn-primary w-full" onClick={next}>
            Continue
          </button>
        )}
      </div>

      <TimeWheel
        open={timeEditor !== null}
        value={findSlotByKey(timeEditor, slots, daySlots)?.send_time || '06:00'}
        onClose={() => setTimeEditor(null)}
        onConfirm={(time) => {
          setSlots((prev) => prev.map((s) => (s.key === timeEditor ? { ...s, send_time: time } : s)))
          setDaySlots((prev) => {
            let changed = false
            const next = {}
            for (const k of Object.keys(prev)) {
              next[k] = prev[k].map((s) => {
                if (s.key === timeEditor) {
                  changed = true
                  return { ...s, send_time: time }
                }
                return s
              })
            }
            return changed ? next : prev
          })
        }}
      />
    </div>
  )
}

/* ----------------- Steps ----------------- */

function StepPattern({ name, setName, pattern, setPattern, isRecycle }) {
  const options = [
    { id: PATTERNS.EVERY_DAY, title: 'Every day', desc: 'Same sends, every single day', icon: 'repeat' },
    { id: PATTERNS.SPECIFIC_DAYS, title: 'Specific days of the week', desc: 'Choose which weekdays', icon: 'calendarDays' },
    { id: PATTERNS.CUSTOM_DATES, title: 'Custom dates', desc: 'Pick exact calendar dates', icon: 'calendarCheck' },
  ]
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Name your schedule</h1>
      <p className="mb-4 mt-1 text-ink-muted">A label only you see — like “Daily transport”.</p>
      <input
        className="field mb-7"
        placeholder="e.g. Daily transport & meals"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <h2 className="text-2xl font-extrabold text-ink">Choose your pattern</h2>
      <p className="mb-4 mt-1 text-ink-muted">How often should sends fire?</p>
      <div className="space-y-3">
        {options.map((o) => {
          const active = pattern === o.id
          return (
            <button
              key={o.id}
              onClick={() => setPattern(o.id)}
              className={`press flex w-full items-center gap-4 rounded-3xl border-2 p-4 text-left transition ${
                active ? 'border-orange-500 bg-orange-500/10' : 'border-transparent bg-surface shadow-card'
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition ${
                  active ? 'bg-orange-500 text-white' : 'bg-surface-soft text-ink-soft'
                }`}
              >
                <Icon name={o.icon} size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-ink">{o.title}</span>
                <span className="block text-sm text-ink-muted">{o.desc}</span>
              </span>
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                  active ? 'border-orange-500 bg-orange-500 text-white' : 'border-line'
                }`}
              >
                {active && <Icon name="check" size={14} />}
              </span>
            </button>
          )
        })}
      </div>
      {isRecycle && (
        <p className="mt-5 text-xs text-ink-muted">
          Recycling a completed schedule. Destination stays your own number (Phase 1).
        </p>
      )}
    </div>
  )
}

function StepDays({ activeDays, setActiveDays }) {
  const toggle = (iso) =>
    setActiveDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()))
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Pick your days</h1>
      <p className="mb-6 mt-1 text-ink-muted">Tap any day to toggle it on or off.</p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d) => {
          const on = activeDays.includes(d.iso)
          return (
            <button
              key={d.iso}
              onClick={() => toggle(d.iso)}
              className={`press flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-semibold transition ${
                on ? 'bg-brand-600 text-white shadow-float' : 'border border-line bg-surface text-ink-muted shadow-card'
              }`}
            >
              {d.short}
              <span className={`text-[10px] ${on ? 'text-brand-100' : 'text-ink-muted'}`}>
                {on ? 'ON' : 'OFF'}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex gap-2">
        <button onClick={() => setActiveDays([1, 2, 3, 4, 5])} className="chip press border border-line bg-surface text-ink-soft shadow-card">
          Weekdays
        </button>
        <button onClick={() => setActiveDays([6, 7])} className="chip press border border-line bg-surface text-ink-soft shadow-card">
          Weekends
        </button>
        <button onClick={() => setActiveDays([1, 2, 3, 4, 5, 6, 7])} className="chip press border border-line bg-surface text-ink-soft shadow-card">
          All week
        </button>
      </div>
    </div>
  )
}

function StepDates({ activeDates, setActiveDates }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Pick your dates</h1>
      <p className="mb-5 mt-1 text-ink-muted">
        Tap each date a send should fire. Great for rent on the 1st, a loan on the 15th.
      </p>
      <MonthCalendar selected={activeDates} onChange={setActiveDates} multi />
      <p className="mt-3 text-center text-sm font-medium text-ink-soft">
        {activeDates.length} date{activeDates.length === 1 ? '' : 's'} selected
      </p>
    </div>
  )
}

/** Append a sensible next slot (4h after the last one) to a slot list. */
function appendSlot(list) {
  const last = list[list.length - 1]
  const [h] = (last?.send_time || '06:00').split(':').map(Number)
  const nextHour = Math.min(h + 4, 23)
  return [...list, newSlot({ send_time: `${String(nextHour).padStart(2, '0')}:00` })]
}

/** Reusable editor for one list of sends (time + amount + label rows). */
function SlotList({ slots, update, remove, add, openTime, canRemove }) {
  return (
    <>
      <div className="space-y-3">
        {slots.map((s) => (
          <div key={s.key} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => openTime(s.key)}
                className="press flex items-center gap-2 rounded-2xl bg-brand-500/10 px-3 py-2.5 font-bold text-brand-600 dark:text-brand-300"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {formatTime12(s.send_time)}
              </button>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                  Ksh
                </span>
                <input
                  className="field py-2.5 pl-12 text-right font-bold"
                  inputMode="numeric"
                  placeholder="0"
                  value={s.amount}
                  onChange={(e) => update(s.key, { amount: e.target.value.replace(/[^\d]/g, '') })}
                />
              </div>
              <button
                onClick={() => remove(s.key)}
                disabled={!canRemove}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-rose-500 disabled:opacity-30"
                aria-label="Remove"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <input
              className="mt-2 w-full rounded-xl bg-surface-soft px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted"
              placeholder="Label (optional) — e.g. Morning fare"
              value={s.label}
              onChange={(e) => update(s.key, { label: e.target.value })}
            />
            {Number(s.amount) > 0 && (
              <p className="mt-1.5 pl-1 text-xs text-ink-muted">Fee for this send: {formatKes(feeFor(s.amount))}</p>
            )}
          </div>
        ))}
      </div>

      <button onClick={add} className="btn-ghost mt-3 w-full border-dashed">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        Add a time
      </button>
    </>
  )
}

function StepSlots({ slots, setSlots, openTime }) {
  const update = (key, patch) => setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const remove = (key) => setSlots((prev) => prev.filter((s) => s.key !== key))
  const add = () => setSlots((prev) => appendSlot(prev))

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Build your day</h1>
      <p className="mb-5 mt-1 text-ink-muted">Each row is one send. Add as many as you need.</p>
      <SlotList slots={slots} update={update} remove={remove} add={add} openTime={openTime} canRemove={slots.length > 1} />
    </div>
  )
}

function StepDaySlots({ dayKeys, daySlots, setDaySlots, openTime }) {
  const [open, setOpen] = useState(dayKeys[0]?.key ?? null)
  const [copiedFrom, setCopiedFrom] = useState(null)

  const updateDay = (dayKey, fn) =>
    setDaySlots((prev) => ({ ...prev, [dayKey]: fn(prev[dayKey] || []) }))
  const update = (dayKey) => (key, patch) =>
    updateDay(dayKey, (list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)))
  const remove = (dayKey) => (key) => updateDay(dayKey, (list) => list.filter((s) => s.key !== key))
  const add = (dayKey) => () => updateDay(dayKey, (list) => appendSlot(list))
  const copyToAll = (dayKey) => () => {
    setDaySlots((prev) => {
      const src = (prev[dayKey] || []).map((s) => ({ send_time: s.send_time, amount: s.amount, label: s.label }))
      const next = {}
      for (const { key } of dayKeys) {
        next[key] = key === dayKey ? prev[dayKey] : src.map((s) => newSlot(s))
      }
      return next
    })
    setCopiedFrom(dayKey)
    setTimeout(() => setCopiedFrom((c) => (c === dayKey ? null : c)), 1800)
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Build each day</h1>
      <p className="mb-5 mt-1 text-ink-muted">
        Tap a day to set its own times and amounts. Use “Copy to all days” to reuse one day everywhere.
      </p>

      <div className="space-y-3">
        {dayKeys.map(({ key, label }) => {
          const list = daySlots[key] || []
          const dayTotal = list.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
          const count = list.filter((s) => Number(s.amount) > 0).length
          const isOpen = open === key
          return (
            <div key={key} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : key)}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="font-bold text-ink">{label}</p>
                  <p className="text-xs text-ink-muted">
                    {count} send{count === 1 ? '' : 's'} · {formatKes(dayTotal)}/day
                  </p>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={`shrink-0 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {isOpen && (
                <div className="border-t border-line p-4">
                  <SlotList
                    slots={list}
                    update={update(key)}
                    remove={remove(key)}
                    add={add(key)}
                    openTime={openTime}
                    canRemove={list.length > 1}
                  />
                  {dayKeys.length > 1 && (
                    <button
                      onClick={copyToAll(key)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500/10 py-2.5 text-center text-sm font-semibold text-orange-600 transition active:scale-[0.99] dark:text-orange-400"
                    >
                      <Icon name={copiedFrom === key ? 'check' : 'copy'} size={15} />
                      {copiedFrom === key ? 'Copied to all days' : 'Copy this day to all days'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepDuration({ duration, setDuration, activeDays, pattern }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">How long?</h1>
      <p className="mb-5 mt-1 text-ink-muted">Run this schedule for…</p>

      <div className="grid grid-cols-3 gap-3">
        {DURATION_PRESETS.map((d) => {
          const active = duration.type === 'preset' && duration.days === d
          return (
            <button
              key={d}
              onClick={() => setDuration({ type: 'preset', days: d, endDateKey: null })}
              className={`press rounded-3xl border-2 py-6 text-center font-bold transition ${
                active ? 'border-brand-600 bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'border-transparent bg-surface text-ink shadow-card'
              }`}
            >
              <span className="block text-2xl">{d}</span>
              <span className="text-xs font-medium text-ink-muted">days</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-3">
        <button
          onClick={() => setDuration({ type: 'customDays', days: duration.days || 21, endDateKey: null })}
          className={`w-full rounded-2xl border-2 p-4 text-left transition ${
            duration.type === 'customDays' ? 'border-brand-600 bg-brand-500/10' : 'border-transparent bg-surface shadow-card'
          }`}
        >
          <span className="font-semibold text-ink">Custom number of days</span>
          {duration.type === 'customDays' && (
            <div className="mt-3 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <input
                className="field w-28 text-center font-bold"
                inputMode="numeric"
                value={duration.days}
                onChange={(e) =>
                  setDuration({ type: 'customDays', days: Number(e.target.value.replace(/\D/g, '')) || 0, endDateKey: null })
                }
              />
              <span className="text-ink-muted">calendar days from today</span>
            </div>
          )}
        </button>

        <button
          onClick={() =>
            setDuration({ type: 'endDate', days: duration.days, endDateKey: duration.endDateKey || toDateKey(addDays(startOfToday(), 30)) })
          }
          className={`w-full rounded-2xl border-2 p-4 text-left transition ${
            duration.type === 'endDate' ? 'border-brand-600 bg-brand-500/10' : 'border-transparent bg-surface shadow-card'
          }`}
        >
          <span className="font-semibold text-ink">Pick an end date</span>
        </button>
        {duration.type === 'endDate' && (
          <MonthCalendar
            multi={false}
            minDate={startOfToday()}
            selected={duration.endDateKey ? [duration.endDateKey] : []}
            onChange={(keys) => setDuration({ ...duration, type: 'endDate', endDateKey: keys[0] })}
          />
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-brand-500/10 p-4 text-center">
        <p className="text-sm text-brand-700 dark:text-brand-200">
          That&apos;s{' '}
          <span className="font-extrabold">{activeDays} active day{activeDays === 1 ? '' : 's'}</span>{' '}
          {pattern === PATTERNS.SPECIFIC_DAYS ? 'on your chosen weekdays' : ''}
        </p>
      </div>
    </div>
  )
}

function StepDestination({ destination }) {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Where should it go?</h1>
      <p className="mb-5 mt-1 text-ink-muted">Money returns to your own Mpesa on schedule.</p>

      <div className="card flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-50 text-accent-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-bold text-ink">{formatPhone(destination)}</p>
            <p className="text-xs text-ink-muted">Your registered number</p>
          </div>
        </div>
        <span className="chip bg-surface-soft text-ink-muted">Locked</span>
      </div>

      <div className="mt-4">
        <Alert kind="info">
          Phase 1 sends to your own number only. Sending to other people, paybills and tills arrives in
          Phase 2.
        </Alert>
      </div>
    </div>
  )
}

function StepSummary({ name, pattern, breakdown, dailyTotal, resolved, destination, activeDays, isPerDay }) {
  const patternLabel =
    pattern === PATTERNS.EVERY_DAY
      ? 'Every day'
      : pattern === PATTERNS.SPECIFIC_DAYS
        ? WEEKDAY_LABELS.filter((d) => activeDays.includes(d.iso)).map((d) => d.short).join(', ')
        : 'Custom dates'

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-ink">Your commitment</h1>
      <p className="mb-5 mt-1 text-ink-muted">No surprises. This is exactly what happens.</p>

      <div className="card p-5">
        <p className="text-lg font-bold text-ink">{name}</p>
        <div className="mt-3 space-y-1.5 text-sm text-ink-soft">
          <Row k="Pattern" v={patternLabel} />
          {isPerDay ? (
            <Row k="Sends" v="Varies by day" />
          ) : (
            <Row k="Sends per day" v={`${breakdown.sendsPerDay} · ${formatKes(dailyTotal)}/day`} />
          )}
          <Row k="Active days" v={`${breakdown.activeDays}`} />
          <Row k="Total sends" v={`${breakdown.totalSends}`} />
          {resolved.startDate && (
            <Row k="Runs" v={`${formatDateShort(resolved.startDate)} → ${formatDateShort(resolved.endDate)}`} />
          )}
          <Row k="Destination" v={formatPhone(destination)} />
        </div>
      </div>

      <div className="card mt-4 p-5">
        <Row k="Base amount" v={formatKes(breakdown.baseAmount)} />
        <Row k={`Service fees (Ksh 5 × ${breakdown.totalSends})`} v={formatKes(breakdown.serviceFees)} />
        <Row k="Mpesa fees" v={formatKes(breakdown.mpesaFees)} />
        <div className="my-3 border-t border-dashed border-line" />
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink">Total to lock</span>
          <span className="text-xl font-extrabold text-brand-600 dark:text-brand-300">{formatKes(breakdown.total)}</span>
        </div>
      </div>

      <div className="mt-4">
        <Alert kind="warn">
          This money is locked. It is only released on the schedule above. No withdrawals — if you need
          to cancel, contact support for manual review.
        </Alert>
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{k}</span>
      <span className="text-right font-semibold text-ink">{v}</span>
    </div>
  )
}

/* ----------------- STK + Success ----------------- */

function NeedsNumber({ navigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-orange-500 text-white">
        <Icon name="phone" size={34} />
      </div>
      <h1 className="text-2xl font-extrabold text-ink">Add your M-Pesa number first</h1>
      <p className="mt-2 max-w-xs text-ink-muted">
        Pytif needs a verified payout number before you can lock money. Set it up in Settings — it takes a minute.
      </p>
      <div className="mt-8 w-full max-w-xs space-y-3">
        <button className="btn-primary w-full" onClick={() => navigate('/app/settings')}>
          <Icon name="settings" size={18} />
          Go to Settings
        </button>
        <button className="btn-ghost w-full" onClick={() => navigate('/app')}>
          Back to home
        </button>
      </div>
    </div>
  )
}

function StkWaiting({ total, number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative mb-8">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-400" />
        <span className="relative grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-white shadow-float">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="3" width="12" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      <h1 className="text-xl font-extrabold text-ink">Check your phone</h1>
      <p className="mt-2 max-w-xs text-ink-muted">
        We sent an Mpesa STK push for <span className="font-bold text-ink">{formatKes(total)}</span> to{' '}
        {formatPhone(number)}. Enter your PIN to lock it in.
      </p>
      <div className="mt-6 flex items-center gap-2 text-sm text-brand-600">
        <Spinner /> Waiting for confirmation…
      </div>
    </div>
  )
}

function SuccessScreen({ result, navigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-accent-500 text-white shadow-float">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
          <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-extrabold text-ink">Your schedule is live!</h1>
      <p className="mt-2 max-w-xs text-ink-muted">
        {formatKes(result?.total)} is now locked. First send at{' '}
        <span className="font-bold text-ink">
          {result?.firstSend ? formatTime12(new Date(result.firstSend).toTimeString().slice(0, 5)) : ''}
        </span>{' '}
        on {result?.firstSend ? formatDateShort(result.firstSend) : ''}.
      </p>
      {result?.mpesaReference && (
        <p className="mt-2 text-xs text-ink-muted">Deposit ref: {result.mpesaReference}</p>
      )}
      <div className="mt-8 w-full max-w-xs space-y-3">
        <button className="btn-primary w-full" onClick={() => navigate(`/app/schedule/${result.scheduleId}`)}>
          View schedule
        </button>
        <button className="btn-ghost w-full" onClick={() => navigate('/app')}>
          Back to home
        </button>
      </div>
    </div>
  )
}
