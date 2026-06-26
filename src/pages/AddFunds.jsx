import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { feeFor } from '../lib/fees.js'
import {
  computeActiveDates,
  earliestAllowedTimeForDate,
  fromDateKey,
  MIN_SEND_LEAD_MS,
  scheduledForIso,
  slotsForDate,
  startOfToday,
  toDateKey,
} from '../lib/schedule.js'
import { Alert, ScreenHeader, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import StkWaitingScreen from '../components/StkWaitingScreen.jsx'
import { SuccessScreen } from '../components/SuccessCallout.jsx'
import TimeWheel from '../components/TimeWheel.jsx'
import SendSlotPicker from '../components/SendSlotPicker.jsx'
import { formatKes, formatDateShort, maskPhone, formatTime12 } from '../lib/format.js'
import { useHidePageScrollbar } from '../hooks/useHidePageScrollbar.js'

const MIN_LEAD_MS = MIN_SEND_LEAD_MS

function futureScheduleDates(schedule) {
  const start = schedule.start_date ? fromDateKey(schedule.start_date) : startOfToday()
  const end = schedule.end_date ? fromDateKey(schedule.end_date) : null
  const dates = computeActiveDates({
    pattern: schedule.pattern,
    activeDays: schedule.active_days || [],
    activeDates: schedule.active_dates || [],
    startDate: start,
    endDate: end,
  })
  const todayKey = toDateKey(startOfToday())
  const now = Date.now()
  return dates.filter((d) => {
    if (toDateKey(d) < todayKey) return false
    return d.getTime() + 24 * 60 * 60 * 1000 > now
  })
}

/** Upcoming send slots from this schedule's template — not a blank calendar. */
function upcomingSendOptions(schedule, slots, limit = 12) {
  const activeSlots = slots.filter((s) => Number(s.amount) > 0 && s.is_active !== false)
  const options = []

  for (const date of futureScheduleDates(schedule)) {
    const daySlots = slotsForDate(date, activeSlots, schedule.pattern)
    for (const slot of daySlots) {
      const sendTime = String(slot.send_time || '06:00').slice(0, 5)
      const scheduled = new Date(scheduledForIso(toDateKey(date), sendTime)).getTime()
      if (scheduled <= Date.now() + MIN_LEAD_MS) continue
      options.push({
        key: `${toDateKey(date)}-${sendTime}-${slot.id || slot.label}`,
        date: toDateKey(date),
        send_time: sendTime,
        amount: Number(slot.amount),
        label: slot.label?.trim() || 'Top-up',
      })
      if (options.length >= limit) return options
    }
  }

  return options
}

export default function AddFunds() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const backTo =
    location.state?.from === 'history'
      ? '/app/history?view=schedules'
      : location.state?.from === 'dashboard'
        ? '/app'
        : `/app/schedule/${id}`
  const [schedule, setSchedule] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('build')

  useHidePageScrollbar()

  const [selectedKey, setSelectedKey] = useState('')
  const [amount, setAmount] = useState('')
  const [sendTime, setSendTime] = useState('06:00')
  const [showTime, setShowTime] = useState(false)
  const [showSendPicker, setShowSendPicker] = useState(false)
  const [sends, setSends] = useState([])

  useEffect(() => {
    ;(async () => {
      const data = await api.getSchedule(id)
      if (!data?.schedule) {
        setError('Schedule not found.')
        setLoading(false)
        return
      }
      if (data.schedule.status !== 'ACTIVE') {
        setError('Only active schedules can receive top-ups.')
        setLoading(false)
        return
      }
      setSchedule(data.schedule)
      setSlots(data.slots || [])
      const options = upcomingSendOptions(data.schedule, data.slots || [])
      if (options.length) {
        setSelectedKey(options[0].key)
        setAmount(String(options[0].amount))
        setSendTime(options[0].send_time)
      }
      setLoading(false)
    })()
  }, [id])

  const sendOptions = useMemo(
    () => (schedule ? upcomingSendOptions(schedule, slots) : []),
    [schedule, slots],
  )

  const selectedOption = useMemo(
    () => sendOptions.find((o) => o.key === selectedKey) || sendOptions[0] || null,
    [sendOptions, selectedKey],
  )

  const wheelMinTime = useMemo(
    () => (selectedOption ? earliestAllowedTimeForDate(selectedOption.date) : null),
    [selectedOption],
  )

  const total = useMemo(
    () => sends.reduce((sum, s) => sum + Number(s.amount) + feeFor(Number(s.amount)), 0),
    [sends],
  )

  const selectOption = (option) => {
    setSelectedKey(option.key)
    setAmount(String(option.amount))
    setSendTime(option.send_time)
    setError('')
  }

  const addSend = () => {
    setError('')
    if (!selectedOption) return setError('No upcoming sends left on this schedule.')
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter an amount.')
    const date = selectedOption.date
    const scheduled = new Date(scheduledForIso(date, sendTime)).getTime()
    if (scheduled <= Date.now() + MIN_LEAD_MS) {
      return setError('That send is too soon. Pick a later time.')
    }
    setSends((prev) => [
      ...prev,
      {
        key: Math.random().toString(36).slice(2),
        date,
        send_time: sendTime,
        amount: amt,
        label: selectedOption.label,
      },
    ])
    setAmount(String(selectedOption.amount))
  }

  const removeSend = (key) => setSends((prev) => prev.filter((s) => s.key !== key))

  const submit = async () => {
    setError('')
    if (sends.length === 0) return setError('Add at least one send.')
    setBusy(true)
    try {
      const created = await api.addFunds({
        scheduleId: id,
        sends: sends.map(({ date, send_time, amount: a, label: l }) => ({
          date,
          send_time,
          amount: a,
          label: l,
        })),
      })
      if (created?.stkError) {
        throw new Error(
          typeof created.stkError === 'string' ? created.stkError : 'Could not start M-Pesa prompt.',
        )
      }
      setPhase('stk')
      await api.confirmDeposit(created.depositId)
      setPhase('done')
    } catch (err) {
      setError(err.message)
      setPhase('build')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error && !schedule) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <Alert kind="error">{error}</Alert>
        <Link to="/app" className="btn-primary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    )
  }

  if (phase === 'stk') {
    return (
      <StkWaitingScreen
        variant="simple"
        total={total}
        phone={schedule.destination_mpesa}
        description={
          <>
            Approve the M-Pesa prompt for <span className="font-bold text-ink">{formatKes(total)}</span> on{' '}
            {maskPhone(schedule.destination_mpesa)}.
          </>
        }
      />
    )
  }

  if (phase === 'done') {
    return (
      <SuccessScreen
        title="Funds added"
        actions={
          <>
            <button className="btn-primary h-9 w-full py-0 text-sm" onClick={() => navigate(backTo)}>
              {location.state?.from === 'history' ? 'Back to history' : 'View schedule'}
            </button>
            <button className="btn-ghost h-9 w-full py-0 text-sm" onClick={() => navigate('/app')}>
              Back to home
            </button>
          </>
        }
      >
        <>
          <strong>{formatKes(total)}</strong> locked to {schedule.name}. New sends are on your schedule.
        </>
      </SuccessScreen>
    )
  }

  const timeChanged = selectedOption && sendTime !== selectedOption.send_time

  return (
    <div className="animate-fade-in mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col overflow-hidden">
      <div className="page-top-chrome page-top-chrome-dark shrink-0 px-5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:static lg:border-0 lg:bg-transparent lg:px-5 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        <ScreenHeader
          embedded
          inverse
          compact
          dense
          title="Add funds"
          subtitle={`${schedule.name} · ${maskPhone(schedule.destination_mpesa)}`}
          back={backTo}
        />
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-5">
        <p className="rounded-lg border border-orange-500/25 bg-orange-500/10 px-2.5 py-1.5 text-[11px] leading-snug text-ink-muted">
          Pick a send, set amount and time, tap <span className="font-semibold text-ink">Add send</span>, then lock funds.
        </p>

        {error && (
          <div className="mt-2">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {sendOptions.length === 0 ? (
          <section className="card mt-2.5 p-3 text-xs text-ink-muted">
            No upcoming send slots left on this schedule. Extend the schedule or create a new one.
          </section>
        ) : (
          selectedOption && (
            <section className="card mt-2.5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Add a send</p>

              <div className="mt-2">
                <span className="text-[11px] font-semibold text-ink-muted">Upcoming send</span>
                <button
                  type="button"
                  className="press mt-0.5 flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-soft px-2.5 py-2"
                  onClick={() => setShowSendPicker(true)}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon name="clock" size={14} className="shrink-0 text-orange-600 dark:text-orange-300" />
                    <span className="min-w-0 truncate text-left text-xs font-semibold text-ink">
                      {formatDateShort(selectedOption.date)} · {formatTime12(selectedOption.send_time)}
                      {selectedOption.label ? ` · ${selectedOption.label}` : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] font-bold tabular-nums text-ink-muted">{formatKes(selectedOption.amount)}</span>
                    <Icon name="chevronDown" size={14} className="text-ink-muted" />
                  </span>
                </button>
              </div>

              <label className="mt-2 block">
                <span className="text-[11px] font-semibold text-ink-muted">Amount (KES)</span>
                <div className="relative mt-0.5">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted">
                    Ksh
                  </span>
                  <input
                    className="field py-2 pl-10 text-sm font-bold"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                {Number(amount) > 0 && (
                  <p className="mt-0.5 text-[10px] text-ink-muted">Fee: {formatKes(feeFor(Number(amount)))}</p>
                )}
              </label>

              <div className="mt-2">
                <span className="text-[11px] font-semibold text-ink-muted">
                  Send time · {formatDateShort(selectedOption.date)}
                </span>
                <button
                  type="button"
                  className="press mt-0.5 flex w-full items-center justify-between rounded-lg border border-line bg-surface-soft px-2.5 py-2"
                  onClick={() => setShowTime(true)}
                >
                  <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Icon name="clock" size={14} />
                    Time
                  </span>
                  <span className="text-xs font-bold text-ink">{formatTime12(sendTime)}</span>
                </button>
                {timeChanged && (
                  <button
                    type="button"
                    className="mt-1 text-[10px] font-semibold text-orange-600 dark:text-orange-400"
                    onClick={() => setSendTime(selectedOption.send_time)}
                  >
                    Reset to {formatTime12(selectedOption.send_time)}
                  </button>
                )}
              </div>

              <button type="button" className="btn-primary mt-2.5 w-full py-2 text-sm" onClick={addSend}>
                <Icon name="plus" size={14} />
                Add send
              </button>
            </section>
          )
        )}

        {sends.length > 0 && (
          <section className="card mt-2.5 divide-y divide-line overflow-hidden">
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">Sends to lock</p>
            </div>
            {sends.map((s) => (
              <div key={s.key} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{s.label}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {formatDateShort(s.date)} · {formatTime12(s.send_time)}
                  </p>
                </div>
                <p className="shrink-0 text-xs font-bold tabular-nums text-ink">{formatKes(s.amount)}</p>
                <button
                  type="button"
                  className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-soft"
                  aria-label="Remove send"
                  onClick={() => removeSend(s.key)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between bg-surface-soft px-3 py-2">
              <span className="text-[11px] font-semibold text-ink">Total (incl. fees)</span>
              <span className="text-sm font-extrabold text-brand-600 dark:text-brand-300">
                {formatKes(total)}
              </span>
            </div>
          </section>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5">
        <button
          type="button"
          className="btn-primary w-full py-2.5 text-sm"
          disabled={busy || sends.length === 0}
          onClick={submit}
        >
          {busy ? <Spinner className="h-5 w-5" /> : `Lock funds · ${formatKes(total || 0)}`}
        </button>
      </div>

      <SendSlotPicker
        open={showSendPicker}
        options={sendOptions}
        value={selectedKey}
        onClose={() => setShowSendPicker(false)}
        onSelect={selectOption}
      />

      <TimeWheel
        open={showTime}
        value={sendTime}
        minTime={wheelMinTime}
        onClose={() => setShowTime(false)}
        onConfirm={setSendTime}
      />
    </div>
  )
}
