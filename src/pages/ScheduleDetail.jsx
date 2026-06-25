import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { ScreenHeader, Spinner, StatusBadge, Alert } from '../components/ui.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, formatPhone } from '../lib/format.js'
import { PATTERNS, WEEKDAY_LABELS, fromDateKey } from '../lib/schedule.js'

export default function ScheduleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  const load = useCallback(async () => {
    const d = await api.getSchedule(id)
    setData(d)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useScheduler(load)

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const { schedule, slots, transactions } = data
  const todayKey = new Date().toISOString().slice(0, 10)
  const todaySends = transactions.filter((t) => t.scheduled_for.slice(0, 10) === todayKey)
  const totalSent = transactions
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0)
  const progressPct = schedule.total_days
    ? Math.round((schedule.days_completed / schedule.total_days) * 100)
    : 0

  return (
    <div className="animate-fade-in mx-auto min-h-screen w-full max-w-4xl px-5 pb-16 pt-2 lg:px-8 lg:pt-8">
      <ScreenHeader
        title={schedule.name}
        subtitle={`To ${formatPhone(schedule.destination_mpesa)}`}
        back="/app"
        right={<StatusBadge status={schedule.status} />}
      />

      {/* Balance + progress */}
      <section className="overflow-hidden rounded-3xl bg-orange-500 p-6 text-white lg:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Locked balance remaining</p>
        <p className="mt-1.5 text-3xl font-extrabold">{formatKes(schedule.locked_balance)}</p>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-orange-100">
            <span>
              {schedule.days_completed} / {schedule.total_days} days
            </span>
            <span>
              {formatKes(totalSent)} sent of {formatKes(schedule.total_deposited)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </section>

      {schedule.status === 'COMPLETED' && (
        <button className="btn-primary mt-5 w-full" onClick={() => navigate(`/app/recycle/${schedule.id}`)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.7L4 16M4 20v-4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Recycle this schedule
        </button>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
      <div className="space-y-8">
      {/* Today's sends */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Today&apos;s sends</h2>
        {todaySends.length === 0 ? (
          <div className="card p-5 text-sm text-ink-muted">No sends scheduled for today.</div>
        ) : (
          <div className="space-y-2">
            {todaySends.map((t) => (
              <SendRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* Slots overview */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Daily template</h2>
        <DailyTemplate slots={slots} pattern={schedule.pattern} />
      </section>
      </div>

      <div className="space-y-8">
      {/* Full history */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Send history</h2>
        {transactions.length === 0 ? (
          <div className="card p-5 text-sm text-ink-muted">No sends yet.</div>
        ) : (
          <div className="card divide-y divide-line">
            {transactions
              .slice()
              .reverse()
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {formatDateShort(t.scheduled_for)} · {formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))}
                    </p>
                    <p className="text-xs text-ink-muted">{t.label || schedule.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">{formatKes(t.amount)}</p>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Cancel / support */}
      {schedule.status === 'ACTIVE' && (
        <section>
          {cancelDone ? (
            <Alert kind="success">
              Your cancellation request was sent to support for manual review. Funds stay locked until reviewed.
            </Alert>
          ) : !showCancel ? (
            <button className="w-full text-center text-sm font-medium text-ink-muted" onClick={() => setShowCancel(true)}>
              Need to cancel?
            </button>
          ) : (
            <div className="card p-5">
              <p className="text-sm text-ink-soft">
                There is no free withdrawal — this friction is the product. For a genuine emergency, request a
                manual review by support.
              </p>
              <div className="mt-4 flex gap-3">
                <button className="btn-ghost flex-1" onClick={() => setShowCancel(false)}>
                  Keep it locked
                </button>
                <button
                  className="btn-danger flex-1"
                  onClick={async () => {
                    await api.requestCancellation(schedule.id)
                    setCancelDone(true)
                    setShowCancel(false)
                  }}
                >
                  Request review
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">Created {formatDateLong(schedule.created_at)}</p>
    </div>
  )
}

function SlotTable({ slots }) {
  return (
    <div className="card divide-y divide-line">
      {slots.map((s) => (
        <div key={s.id} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-brand-700">{formatTime12(s.send_time)}</span>
            <span className="text-sm text-ink-muted">{s.label || '—'}</span>
          </div>
          <span className="font-semibold text-ink">{formatKes(s.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function DailyTemplate({ slots, pattern }) {
  const perDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!perDay) return <SlotTable slots={slots} />

  const groups = {}
  for (const s of slots) (groups[String(s.day_key)] = groups[String(s.day_key)] || []).push(s)
  const orderedKeys = Object.keys(groups).sort((a, b) =>
    pattern === PATTERNS.CUSTOM_DATES ? (a < b ? -1 : 1) : Number(a) - Number(b),
  )
  const labelFor = (key) =>
    pattern === PATTERNS.CUSTOM_DATES
      ? formatDateShort(fromDateKey(key))
      : WEEKDAY_LABELS.find((w) => String(w.iso) === key)?.long || key

  return (
    <div className="space-y-4">
      {orderedKeys.map((key) => (
        <div key={key}>
          <p className="mb-1.5 text-xs font-semibold text-ink-soft">{labelFor(key)}</p>
          <SlotTable slots={[...groups[key]].sort((a, b) => (a.send_time < b.send_time ? -1 : 1))} />
        </div>
      ))}
    </div>
  )
}

function SendRow({ t }) {
  const time = formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))
  return (
    <div className="card flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${
            t.status === 'SUCCESS'
              ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
              : t.status === 'FAILED'
                ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
                : 'bg-sky-500/12 text-sky-600 dark:text-sky-300'
          }`}
        >
          {t.status === 'SUCCESS' ? '✓' : t.status === 'FAILED' ? '!' : '◷'}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{time}</p>
          <p className="text-xs text-ink-muted">{t.label || 'Send'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-ink">{formatKes(t.amount)}</p>
        <StatusBadge status={t.status} />
      </div>
    </div>
  )
}
