import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useCachedQuery } from '../hooks/useCachedQuery.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useHidePageScrollbar } from '../hooks/useHidePageScrollbar.js'
import { ScreenHeader, Spinner, StatusBadge, Alert } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, maskPhone, formatLocalTime, startOfTodayKey, toLocalDayKey } from '../lib/format.js'
import { PATTERNS, WEEKDAY_LABELS, fromDateKey } from '../lib/schedule.js'
import { sortUpcomingSends } from '../lib/moneyEvents.js'

const UPCOMING_PREVIEW = 5

const SEND_STATUS = {
  SUCCESS: { icon: 'check', label: 'Sent', chip: 'bg-accent-500/12 text-accent-600 dark:text-accent-300', text: 'text-accent-600 dark:text-accent-300' },
  FAILED: { icon: 'bolt', label: 'Failed', chip: 'bg-rose-500/12 text-rose-500', text: 'text-rose-500' },
  PENDING: { icon: 'clock', label: 'Pending', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
  PENDING_B2C_CONFIRM: { icon: 'clock', label: 'Sending…', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
}

export default function ScheduleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fetchSchedule = useCallback(() => api.getSchedule(id), [id])
  const { data, loading, reload } = useCachedQuery(`schedule:${id}`, fetchSchedule, { enabled: Boolean(id) })
  const [showCancel, setShowCancel] = useState(false)
  const [cancelDone, setCancelDone] = useState(false)

  useScheduler(() => {
    void reload({ silent: true })
  })
  useHidePageScrollbar()

  const todayKey = startOfTodayKey()

  const { todaySends, upcomingPreview, pendingCount, totalSent, progressPct, schedule, slots } = useMemo(() => {
    if (!data) {
      return {
        todaySends: [],
        upcomingPreview: [],
        pendingCount: 0,
        totalSent: 0,
        progressPct: 0,
        schedule: null,
        slots: [],
      }
    }
    const { schedule: s, slots: sl, transactions } = data
    const pending = sortUpcomingSends(
      transactions.filter((t) => t.status === 'PENDING' || t.status === 'PENDING_B2C_CONFIRM'),
    )
    const sent = transactions.filter((t) => t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0)
    const pct = s.total_days ? Math.round((s.days_completed / s.total_days) * 100) : 0

    return {
      todaySends: transactions.filter((t) => toLocalDayKey(t.scheduled_for) === todayKey),
      upcomingPreview: pending.slice(0, UPCOMING_PREVIEW),
      pendingCount: pending.length,
      totalSent: sent,
      progressPct: pct,
      schedule: s,
      slots: sl,
    }
  }, [data, todayKey])

  if (loading || !data || !schedule) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden">
      <div className="page-top-chrome page-top-chrome-dark shrink-0 px-5 pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:static lg:border-0 lg:bg-transparent lg:px-5 lg:pb-0 lg:pt-0 lg:backdrop-blur-none">
        <ScreenHeader
          embedded
          inverse
          compact
          dense
          title={schedule.name}
          subtitle={`To ${maskPhone(schedule.destination_mpesa)}`}
          back="/app/history?view=schedules"
          right={<StatusBadge status={schedule.status} />}
        />
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
        <section className="money-card shrink-0">
          <div className="p-3.5 lg:p-5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-orange-100 lg:text-[11px]">
              Locked balance remaining
            </p>
            <p className="money-card-amount mt-1 text-2xl font-extrabold leading-none lg:text-3xl">
              {formatKes(schedule.locked_balance)}
            </p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-[10px] text-orange-100 lg:text-[11px]">
                <span>
                  {schedule.days_completed} / {schedule.total_days} days
                </span>
                <span>
                  {formatKes(totalSent)} sent · {formatKes(schedule.total_deposited)} locked
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        </section>

        {schedule.status === 'ACTIVE' && (
          <Link
            to={`/app/schedule/${schedule.id}/add-funds`}
            state={{ from: 'schedule' }}
            className="btn-primary mt-3 flex w-full items-center justify-center gap-2 py-2.5 lg:mt-4"
          >
            <Icon name="plus" size={16} />
            Add funds
          </Link>
        )}

        {schedule.status === 'COMPLETED' && (
          <button
            className="btn-primary mt-3 flex w-full items-center justify-center gap-2 py-2.5 lg:mt-4"
            onClick={() => navigate(`/app/recycle/${schedule.id}`)}
          >
            <Icon name="recycle" size={16} />
            Recycle this schedule
          </button>
        )}

        <section className="mt-4 lg:mt-5">
          <h2 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted lg:text-xs">
            Today&apos;s sends
          </h2>
          {todaySends.length === 0 ? (
            <div className="card p-3 text-xs text-ink-muted lg:p-4 lg:text-sm">No sends scheduled for today.</div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {todaySends.map((t) => (
                <SendRow key={t.id} t={t} />
              ))}
            </div>
          )}
        </section>

        {pendingCount > 0 && (
          <section className="mt-4 lg:mt-5">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <h2 className="text-[11px] font-bold uppercase tracking-wide text-ink-muted lg:text-xs">
                Upcoming sends
              </h2>
              <Link to="/app/history" className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 lg:text-xs">
                View all
              </Link>
            </div>
            <div className="card divide-y divide-line overflow-hidden">
              {upcomingPreview.map((t) => (
                <SendRow key={t.id} t={t} />
              ))}
            </div>
            {pendingCount > UPCOMING_PREVIEW && (
              <p className="mt-1.5 px-1 text-[11px] text-ink-muted">
                +{pendingCount - UPCOMING_PREVIEW} more in History
              </p>
            )}
          </section>
        )}

        <section className="mt-4 lg:mt-5">
          <h2 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted lg:text-xs">
            Daily template
          </h2>
          <DailyTemplate slots={slots} pattern={schedule.pattern} />
        </section>

        {schedule.status === 'ACTIVE' && (
          <section className="mt-4 lg:mt-5">
            {cancelDone ? (
              <Alert kind="success">
                Your cancellation request was sent to support for manual review. Funds stay locked until reviewed.
              </Alert>
            ) : !showCancel ? (
              <button
                type="button"
                className="w-full py-2 text-center text-xs font-medium text-ink-muted"
                onClick={() => setShowCancel(true)}
              >
                Need to cancel?
              </button>
            ) : (
              <div className="card p-3.5 lg:p-4">
                <p className="text-xs leading-relaxed text-ink-soft lg:text-sm">
                  There is no free withdrawal — this friction is the product. For a genuine emergency, request a
                  manual review by support.
                </p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-ghost flex-1 py-2 text-xs lg:text-sm" onClick={() => setShowCancel(false)}>
                    Keep it locked
                  </button>
                  <button
                    type="button"
                    className="btn-danger flex-1 py-2 text-xs lg:text-sm"
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

        <p className="mt-4 pb-2 text-center text-[11px] text-ink-muted">Created {formatDateLong(schedule.created_at)}</p>
      </div>
    </div>
  )
}

function TemplateSlotRow({ slot, dayLabel }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 lg:px-4 lg:py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-500/12 text-orange-600 dark:text-orange-300 lg:h-9 lg:w-9">
          <Icon name="clock" size={14} className="lg:hidden" />
          <Icon name="clock" size={16} className="hidden lg:block" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{formatTime12(slot.send_time)}</p>
          <p className="truncate text-xs text-ink-muted">{slot.label?.trim() || dayLabel || 'Send'}</p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-bold tabular-nums text-ink">{formatKes(slot.amount)}</p>
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
            <p className="bg-surface-soft px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted lg:px-4 lg:py-2 lg:text-[11px]">
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
  const meta = SEND_STATUS[t.status] || SEND_STATUS.PENDING
  const title = t.label || 'Send'

  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5 lg:gap-3 lg:px-4 lg:py-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full lg:h-10 lg:w-10 ${meta.chip}`}>
        <Icon name={meta.icon} size={16} className="lg:hidden" />
        <Icon name={meta.icon} size={17} className="hidden lg:block" />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="truncate text-xs text-ink-muted">
          {formatDateShort(t.scheduled_for)} · {formatLocalTime(t.scheduled_for)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatKes(t.amount)}</p>
        <p className={`whitespace-nowrap text-[11px] font-medium ${meta.text}`}>{meta.label}</p>
      </div>
    </div>
  )
}
