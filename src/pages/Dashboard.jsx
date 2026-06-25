import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { Avatar, Spinner, StatusBadge, ThemeToggle } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { Gauge, MiniBars } from '../components/charts.jsx'
import { formatKes, formatTime12, formatPhone } from '../lib/format.js'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const d = await api.getDashboard()
    setData(d)
    setLoading(false)
  }, [])

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

  const active = data.schedules.filter((s) => s.status === 'ACTIVE')
  const others = data.schedules.filter((s) => s.status !== 'ACTIVE')
  const now = Date.now()

  const firstName = (user?.name && user.name !== 'Pytif user' ? user.name.split(' ')[0] : '') || 'there'

  const todayTotal = data.upcomingToday.length
  const todayDone = data.upcomingToday.filter((t) => t.status === 'SUCCESS').length
  const recyclable = others.find((s) => s.status === 'COMPLETED')

  const bars = active.slice(0, 7).map((s) => ({ label: s.name.slice(0, 3), value: s.locked_balance }))
  const isEmpty = data.schedules.length === 0

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between py-4">
        <Link to="/app/settings" className="press flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.name} size={40} />
          <div>
            <p className="text-xs text-ink-muted">Welcome back</p>
            <p className="text-base font-bold leading-tight text-ink">{firstName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card lg:hidden"
            aria-label="Log out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </header>

      {!user?.mpesa_number && (
        <Link
          to="/app/settings"
          className="press mb-5 flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white">
            <Icon name="phone" size={18} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-ink">Add your M-Pesa number</p>
            <p className="text-xs text-ink-muted">Verify your payout number in Settings to start locking money.</p>
          </div>
          <Icon name="arrowRight" size={20} className="shrink-0 text-orange-500" />
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Locked balance hero */}
        <section className="relative overflow-hidden rounded-3xl bg-orange-500 p-5 text-white lg:col-span-2 lg:p-8">
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Total locked balance</p>
              <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{formatKes(data.totalLocked)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                  <Icon name="lockClosed" size={13} />
                  {active.length} active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold text-white">
                  No withdrawals
                </span>
              </div>
            </div>

            <Gauge
              value={todayDone}
              max={todayTotal || 1}
              size={96}
              stroke={9}
              center={
                todayTotal > 0 ? (
                  <div className="text-white">
                    <p className="text-xl font-bold leading-none">
                      {todayDone}
                      <span className="text-sm font-semibold text-orange-100">/{todayTotal}</span>
                    </p>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-orange-100">today</p>
                  </div>
                ) : (
                  <div className="text-white">
                    <Icon name="check" size={22} className="mx-auto" />
                    <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-orange-100">clear</p>
                  </div>
                )
              }
            />
          </div>
        </section>

        {/* Today's sends */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Today&apos;s sends</h2>
          {data.upcomingToday.length === 0 ? (
            <div className="card flex h-[calc(100%-2rem)] min-h-[120px] flex-col items-center justify-center gap-2 p-5 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300">
                <Icon name="check" size={20} />
              </span>
              <p className="text-sm text-ink-muted">No sends scheduled for today.</p>
            </div>
          ) : (
            <ol className="stagger relative space-y-3 border-l-2 border-line pl-5">
              {data.upcomingToday.map((t) => {
                const due = new Date(t.scheduled_for).getTime()
                const isNext = t.status === 'PENDING' && due >= now
                return (
                  <li key={t.id} className="relative">
                    <span
                      className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-app ${
                        t.status === 'SUCCESS'
                          ? 'bg-accent-500'
                          : t.status === 'FAILED'
                            ? 'bg-rose-500'
                            : isNext
                              ? 'animate-pulse bg-orange-500'
                              : 'bg-line'
                      }`}
                    />
                    <div className="card flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))}
                          {t.label ? ` · ${t.label}` : ''}
                        </p>
                        <p className="text-xs text-ink-muted">{t.schedule_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink">{formatKes(t.amount)}</p>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      {/* Recycle nudge — only when a completed schedule can be re-run */}
      {recyclable && (
        <Link
          to={`/app/recycle/${recyclable.id}`}
          className="press mt-5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
            <Icon name="recycle" size={18} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-ink">Recycle a completed schedule</p>
            <p className="text-xs text-ink-muted">Re-run “{recyclable.name}” with the same setup.</p>
          </div>
          <Icon name="arrowRight" size={20} className="shrink-0 text-ink-muted" />
        </Link>
      )}

      {/* Locked-by-schedule chart */}
      {active.length > 0 && (
        <section className="card mt-5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Locked by schedule</h2>
              <p className="mt-0.5 text-xs text-ink-muted">Distribution of your committed balance</p>
            </div>
            <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-300">
              {formatKes(data.totalLocked)}
            </span>
          </div>
          <MiniBars data={bars} height={120} />
        </section>
      )}

      {/* Get-started / active schedules */}
      {isEmpty ? (
        <GetStarted />
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Active schedules</h2>
            {active.length === 0 ? (
              <GetStarted compact />
            ) : (
              <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {active.map((s) => (
                  <ScheduleCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </section>

          {others.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Completed &amp; paused</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {others.map((s) => (
                  <ScheduleCard key={s.id} s={s} muted />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="mt-8 text-center text-xs text-ink-muted">
        Sending to {formatPhone(user?.mpesa_number)} · Phase 1
      </p>
    </div>
  )
}

const STEPS = [
  { icon: 'calendar', title: 'Choose a pattern', desc: 'Every day, set weekdays, or exact dates.' },
  { icon: 'clock', title: 'Set times & amounts', desc: 'Decide when and how much returns to you.' },
  { icon: 'lockClosed', title: 'Lock & relax', desc: 'Pytif pays your future self on schedule.' },
]

function GetStarted({ compact }) {
  return (
    <section className={`card p-6 lg:p-8 ${compact ? '' : 'mt-8'}`}>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300">
          <Icon name="bolt" size={13} /> Get started
        </span>
        <h2 className="mt-3 text-xl font-extrabold tracking-tight text-ink lg:text-2xl">
          Lock your first commitment
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-ink-muted">
          Set money aside and let it return to your own M-Pesa on a schedule you control. Three quick steps:
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-line bg-surface-soft/60 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white">
                  <Icon name={s.icon} size={18} />
                </span>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface text-xs font-bold text-ink-muted">
                  {i + 1}
                </span>
              </div>
              <p className="mt-3 font-bold text-ink">{s.title}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        <Link
          to="/app/new"
          className="press mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 sm:w-auto"
        >
          <Icon name="plus" size={18} strokeWidth={2.4} />
          Build a schedule
        </Link>
      </div>
    </section>
  )
}

function ScheduleCard({ s, muted }) {
  const completedDays = Math.max(0, (s.total_days || 0) - (s.remainingDays || 0))
  const pct = s.total_days ? Math.round((completedDays / s.total_days) * 100) : 0
  return (
    <Link to={`/app/schedule/${s.id}`} className={`card hover-lift block h-full p-4 ${muted ? 'opacity-90' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              s.status === 'ACTIVE'
                ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
                : s.status === 'COMPLETED'
                  ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
                  : 'bg-surface-soft text-ink-muted'
            }`}
          >
            <Icon name="wallet" size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{s.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {s.nextSendToday
                ? `Next · ${formatTime12(new Date(s.nextSendToday).toTimeString().slice(0, 5))}`
                : s.status === 'ACTIVE'
                  ? 'No more sends today'
                  : s.status === 'COMPLETED'
                    ? 'All sends complete'
                    : 'Awaiting deposit'}
            </p>
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {s.status === 'ACTIVE' && s.total_days > 0 && (
        <div className="mt-3.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3 text-sm">
        <div>
          <p className="text-xs text-ink-muted">Locked balance</p>
          <p className="font-bold text-ink">{formatKes(s.locked_balance)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Days left</p>
          <p className="font-bold text-ink">
            {s.remainingDays} / {s.total_days}
          </p>
        </div>
      </div>
    </Link>
  )
}
