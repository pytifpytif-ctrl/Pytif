import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { feeFor } from '../lib/fees.js'
import {
  computeActiveDates,
  earliestAllowedTimeForDate,
  fromDateKey,
  MIN_SEND_LEAD_MS,
  slotsForDate,
  startOfToday,
  toDateKey,
} from '../lib/schedule.js'
import { Alert, ScreenHeader, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import StkWaitingScreen from '../components/StkWaitingScreen.jsx'
import AnimatedCheck from '../components/AnimatedCheck.jsx'
import TimeWheel from '../components/TimeWheel.jsx'
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
      const scheduled = new Date(`${toDateKey(date)}T${sendTime}:00+03:00`).getTime()
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
    const scheduled = new Date(`${date}T${sendTime}:00+03:00`).getTime()
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
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center animate-fade-in">
        <AnimatedCheck size={72} />
        <h1 className="mt-6 text-xl font-extrabold text-ink">Funds added</h1>
        <p className="mt-2 max-w-xs text-ink-muted">
          {formatKes(total)} locked to {schedule.name}. New sends are on your schedule.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <button className="btn-primary w-full" onClick={() => navigate(`/app/schedule/${id}`)}>
            View schedule
          </button>
          <button className="btn-ghost w-full" onClick={() => navigate('/app')}>
            Back to home
          </button>
        </div>
      </div>
    )
  }

  const timeChanged = selectedOption && sendTime !== selectedOption.send_time

  return (
    <div className="no-scrollbar animate-fade-in mx-auto flex min-h-screen w-full max-w-lg flex-col overflow-y-auto px-5 pb-16">
      <div className="page-top-chrome page-top-chrome-dark sticky top-0 z-30 -mx-5 shrink-0 px-5 pb-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        <ScreenHeader
          embedded
          inverse
          title="Add funds"
          subtitle={`${schedule.name} · ${maskPhone(schedule.destination_mpesa)}`}
          back={`/app/schedule/${id}`}
        />
      </div>

      <div className="min-h-0 flex-1 pt-4">
        <Alert kind="info">Top-up only — pick an upcoming send, adjust amount or time, then lock funds.</Alert>

        {error && (
          <div className="mt-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        {sendOptions.length === 0 ? (
          <section className="card mt-4 p-5 text-sm text-ink-muted">
            No upcoming send slots left on this schedule. Extend the schedule or create a new one.
          </section>
        ) : (
          <>
            <section className="mt-4">
              <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Pick a send slot</p>
              <div className="space-y-2">
                {sendOptions.map((o) => {
                  const selected = selectedKey === o.key
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => selectOption(o)}
                      className={`press flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                        selected
                          ? 'border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500/20'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          selected ? 'bg-orange-500 text-white' : 'bg-surface-soft text-orange-600 dark:text-orange-300'
                        }`}
                      >
                        <Icon name="calendar" size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{formatDateShort(o.date)}</p>
                        <p className="text-xs text-ink-muted">
                          {formatTime12(o.send_time)}
                          {o.label ? ` · ${o.label}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-ink">{formatKes(o.amount)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {selectedOption && (
              <section className="card mt-4 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Adjust & add</p>

                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-ink-muted">Amount (KES)</span>
                  <div className="relative mt-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-muted">
                      Ksh
                    </span>
                    <input
                      className="field py-2.5 pl-12 text-lg font-bold"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  {Number(amount) > 0 && (
                    <p className="mt-1.5 text-xs text-ink-muted">Fee: {formatKes(feeFor(Number(amount)))}</p>
                  )}
                </label>

                <div className="mt-4">
                  <span className="text-xs font-semibold text-ink-muted">Send time on {formatDateShort(selectedOption.date)}</span>
                  <button
                    type="button"
                    className="press mt-1.5 flex w-full items-center justify-between rounded-xl border border-line bg-surface-soft px-4 py-3"
                    onClick={() => setShowTime(true)}
                  >
                    <span className="flex items-center gap-2 text-sm text-ink-muted">
                      <Icon name="clock" size={16} />
                      Time
                    </span>
                    <span className="text-sm font-bold text-ink">{formatTime12(sendTime)}</span>
                  </button>
                  {timeChanged && (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400"
                      onClick={() => setSendTime(selectedOption.send_time)}
                    >
                      Reset to {formatTime12(selectedOption.send_time)}
                    </button>
                  )}
                </div>

                <button type="button" className="btn-ghost mt-4 w-full border-dashed" onClick={addSend}>
                  <Icon name="plus" size={16} />
                  Add this send
                </button>
              </section>
            )}
          </>
        )}

        {sends.length > 0 && (
          <section className="card mt-4 divide-y divide-line overflow-hidden">
            <div className="px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Sends to lock</p>
            </div>
            {sends.map((s) => (
              <div key={s.key} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{s.label}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDateShort(s.date)} · {formatTime12(s.send_time)}
                  </p>
                </div>
                <p className="text-sm font-bold text-ink">{formatKes(s.amount)}</p>
                <button
                  type="button"
                  className="press grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-surface-soft"
                  aria-label="Remove send"
                  onClick={() => removeSend(s.key)}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between bg-surface-soft px-4 py-3">
              <span className="text-sm font-semibold text-ink">Total to pay (incl. fees)</span>
              <span className="text-lg font-extrabold text-brand-600 dark:text-brand-300">{formatKes(total)}</span>
            </div>
          </section>
        )}

        <button
          type="button"
          className="btn-primary mt-6 w-full"
          disabled={busy || sends.length === 0}
          onClick={submit}
        >
          {busy ? <Spinner className="h-5 w-5" /> : `Lock funds · ${formatKes(total || 0)}`}
        </button>
      </div>

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
