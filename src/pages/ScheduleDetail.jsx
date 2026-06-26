import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useHidePageScrollbar } from '../hooks/useHidePageScrollbar.js'
import { ScreenHeader, Spinner, StatusBadge, Alert } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, maskPhone } from '../lib/format.js'
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
  useHidePageScrollbar()

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
    <div className="no-scrollbar animate-fade-in mx-auto flex min-h-screen w-full max-w-4xl flex-col overflow-y-auto px-5 pb-16 lg:px-8 lg:pb-12">
      <div className="page-top-chrome page-top-chrome-dark sticky top-0 z-30 -mx-5 shrink-0 px-5 pb-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        <ScreenHeader
          embedded
          inverse
          title={schedule.name}
          subtitle={`To ${maskPhone(schedule.destination_mpesa)}`}
          back="/app"
          right={<StatusBadge status={schedule.status} />}
        />
      </div>

      <div className="min-h-0 flex-1 pt-4 lg:pt-6">
      {/* Balance + progress */}
      <section className="money-card">
        <div className="p-6 lg:p-8">
        <p className="relative text-xs font-medium uppercase tracking-wide text-orange-100">Locked balance remaining</p>
        <p className="money-card-amount mt-1.5 text-3xl font-extrabold">{formatKes(schedule.locked_balance)}</p>
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
        </div>
      </section>

      {schedule.status === 'ACTIVE' && (
        <Link
          to={`/app/schedule/${schedule.id}/add-funds`}
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
        >
          <Icon name="plus" size={18} />
          Add funds
        </Link>
      )}

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
          <div className="card divide-y divide-line overflow-hidden">
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
          <div className="card divide-y divide-line overflow-hidden">
            {transactions
              .slice()
              .reverse()
              .map((t) => (
                <SendRow key={t.id} t={t} />
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
    </div>
  )
}

function TemplateSlotRow({ slot, dayLabel }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/12 text-orange-600 dark:text-orange-300">
          <Icon name="clock" size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{formatTime12(slot.send_time)}</p>
          <p className="text-xs text-ink-muted">{slot.label?.trim() || dayLabel || 'Send'}</p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-bold text-ink">{formatKes(slot.amount)}</p>
    </div>
  )
}

function SlotTable({ slots, dayLabel }) {
  return (
    <>
      {slots.map((s) => (
        <TemplateSlotRow key={s.id} slot={s} dayLabel={dayLabel} />
      ))}
    </>
  )
}

function DailyTemplate({ slots, pattern }) {
  const perDay = slots.some((s) => s.day_key != null && s.day_key !== '')
  if (!perDay) {
    return (
      <div className="card divide-y divide-line overflow-hidden">
        <SlotTable slots={slots} />
      </div>
    )
  }

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
    <div className="card divide-y divide-line overflow-hidden">
      {orderedKeys.map((key) => {
        const dayLabel = labelFor(key)
        const daySlots = [...groups[key]].sort((a, b) => (a.send_time < b.send_time ? -1 : 1))
        return (
          <div key={key}>
            <p className="bg-surface-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {dayLabel}
            </p>
            <SlotTable slots={daySlots} dayLabel={dayLabel} />
          </div>
        )
      })}
    </div>
  )
}

function SendRow({ t }) {
  const timeStr = new Date(t.scheduled_for).toTimeString().slice(0, 5)
  const iconTone =
    t.status === 'SUCCESS'
      ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
      : t.status === 'FAILED'
        ? 'bg-rose-500/12 text-rose-600 dark:text-rose-300'
        : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${iconTone}`}>
          <Icon name={t.status === 'SUCCESS' ? 'check' : t.status === 'FAILED' ? 'bolt' : 'clock'} size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {formatDateShort(t.scheduled_for)} · {formatTime12(timeStr)}
          </p>
          <p className="text-xs text-ink-muted">{t.label || 'Send'}</p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">{formatKes(t.amount)}</p>
        <StatusBadge status={t.status} />
      </div>
    </div>
  )
}
