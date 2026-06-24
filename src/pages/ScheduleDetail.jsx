import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { ScreenHeader, Spinner, StatusBadge, Alert } from '../components/ui.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, formatPhone } from '../lib/format.js'

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
    <div className="animate-fade-in">
      <ScreenHeader
        title={schedule.name}
        subtitle={`To ${formatPhone(schedule.destination_mpesa)}`}
        back="/app"
        right={<StatusBadge status={schedule.status} />}
      />

      {/* Balance + progress */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-float">
        <p className="text-sm text-brand-100">Locked balance remaining</p>
        <p className="mt-1 text-3xl font-extrabold">{formatKes(schedule.locked_balance)}</p>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-brand-100">
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

      {/* Today's sends */}
      <section className="mt-8">
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
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Daily template</h2>
        <div className="card divide-y divide-slate-100">
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
      </section>

      {/* Full history */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Send history</h2>
        {transactions.length === 0 ? (
          <div className="card p-5 text-sm text-ink-muted">No sends yet.</div>
        ) : (
          <div className="card divide-y divide-slate-100">
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
        <section className="mt-8">
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

      <p className="mt-8 text-center text-xs text-ink-muted">Created {formatDateLong(schedule.created_at)}</p>
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
              ? 'bg-emerald-50 text-emerald-600'
              : t.status === 'FAILED'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-sky-50 text-sky-600'
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
