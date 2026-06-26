import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { feeFor } from '../lib/fees.js'
import { computeActiveDates, fromDateKey, startOfToday, toDateKey } from '../lib/schedule.js'
import { Alert, ScreenHeader, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import TimeWheel from '../components/TimeWheel.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import { formatKes, formatDateShort, formatPhone, formatTime12 } from '../lib/format.js'

const MIN_LEAD_MS = 60 * 60 * 1000

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
  const now = Date.now()
  return dates.filter((d) => {
    const key = toDateKey(d)
    if (key < toDateKey(startOfToday())) return false
    return true
  }).filter((d) => {
    // keep dates where at least end-of-day is in future (user picks time later)
    return d.getTime() + 24 * 60 * 60 * 1000 > now
  })
}

export default function AddFunds() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('build') // build | stk | done

  const [dateKey, setDateKey] = useState('')
  const [sendTime, setSendTime] = useState('06:00')
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [sends, setSends] = useState([])
  const [showTime, setShowTime] = useState(false)

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
      const valid = futureScheduleDates(data.schedule)
      if (valid.length) setDateKey(toDateKey(valid[0]))
      setLoading(false)
    })()
  }, [id])

  const validDates = useMemo(
    () => (schedule ? futureScheduleDates(schedule) : []),
    [schedule],
  )

  const total = useMemo(
    () => sends.reduce((sum, s) => sum + Number(s.amount) + feeFor(Number(s.amount)), 0),
    [sends],
  )

  const addSend = () => {
    setError('')
    const amt = Number(amount)
    if (!dateKey) return setError('Pick a date.')
    const validKeys = new Set(validDates.map(toDateKey))
    if (!validKeys.has(dateKey)) return setError('Pick a date that fits this schedule.')
    if (!amt || amt <= 0) return setError('Enter an amount.')
    const scheduled = new Date(`${dateKey}T${sendTime}:00+03:00`).getTime()
    if (scheduled <= Date.now() + MIN_LEAD_MS) {
      return setError('Pick a date and time at least 1 hour from now.')
    }
    setSends((prev) => [
      ...prev,
      {
        key: Math.random().toString(36).slice(2),
        date: dateKey,
        send_time: sendTime,
        amount: amt,
        label: label.trim() || 'Top-up',
      },
    ])
    setAmount('')
    setLabel('')
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
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <Spinner className="h-10 w-10 text-brand-600" />
        <h1 className="mt-6 text-xl font-extrabold text-ink">Check your phone</h1>
        <p className="mt-2 max-w-xs text-ink-muted">
          Approve the M-Pesa prompt for {formatKes(total)} to add funds to {schedule.name}.
        </p>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-500 text-white">
          <Icon name="check" size={32} />
        </span>
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

  return (
    <div className="animate-fade-in mx-auto min-h-screen w-full max-w-lg px-5 pb-16 pt-2">
      <ScreenHeader
        title="Add funds"
        subtitle={`${schedule.name} · ${formatPhone(schedule.destination_mpesa)}`}
        back="/app"
      />

      <Alert kind="info">
        Add money only — you cannot withdraw or reduce locked funds here.
      </Alert>

      {error && (
        <div className="mt-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <section className="card mt-4 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Pick date & time</p>
        {validDates.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">No future dates left on this schedule.</p>
        ) : (
          <>
            <div className="mt-3">
              <MonthCalendar
                multi={false}
                minDate={startOfToday()}
                selected={dateKey ? [dateKey] : []}
                onChange={(keys) => setDateKey(keys[0] || '')}
              />
            </div>
            <button
              type="button"
              className="press mt-3 flex w-full items-center justify-between rounded-xl border border-line bg-surface-soft px-4 py-3 text-left"
              onClick={() => setShowTime(true)}
            >
              <span className="text-sm text-ink-muted">Time</span>
              <span className="text-sm font-bold text-ink">{formatTime12(sendTime)}</span>
            </button>
            {showTime && (
              <TimeWheel
                open={showTime}
                value={sendTime}
                onClose={() => setShowTime(false)}
                onConfirm={setSendTime}
              />
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-ink-muted">Amount (KES)</span>
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  placeholder="200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-ink-muted">Label (optional)</span>
                <input
                  className="field mt-1"
                  placeholder="Extra fare"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </label>
            </div>
            <button type="button" className="btn-ghost mt-3 w-full" onClick={addSend}>
              + Add this send
            </button>
          </>
        )}
      </section>

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
  )
}
