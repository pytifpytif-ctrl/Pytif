import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { Logo, Spinner, StatusBadge, EmptyState, ThemeToggle } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { Gauge, MiniBars, QuickAction } from '../components/charts.jsx'
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

  const firstName = (user?.name && user.name !== 'Pytif user' ? user.name.split(' ')[0] : '') || ''

  const todayTotal = data.upcomingToday.length
  const todayDone = data.upcomingToday.filter((t) => t.status === 'SUCCESS').length
  const recyclable = others.find((s) => s.status === 'COMPLETED')

  const bars = active
    .slice(0, 7)
    .map((s) => ({ label: s.name.slice(0, 3), value: s.locked_balance }))

  return (
    <div className="animate-fade-in">
      <header className="flex items-center justify-between py-4">
        <Logo size={40} className="lg:hidden" />
        <div className="hidden lg:block">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="text-sm text-ink-muted">Here&apos;s your locked money at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="press flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-soft shadow-card lg:hidden"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
            Log out
          </button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Locked balance hero */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-6 text-white shadow-float lg:col-span-2 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-accent-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-100">Total locked balance</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight lg:text-4xl">{formatKes(data.totalLocked)}</p>
              <div className="mt-3 flex items-center gap-2 text-xs text-brand-100">
                <Icon name="lockClosed" size={14} />
                Across {active.length} active schedule{active.length === 1 ? '' : 's'} · no withdrawals
              </div>
            </div>
            <Gauge
              value={todayDone}
              max={todayTotal || 1}
              size={120}
              center={
                <div className="text-white">
                  <p className="text-2xl font-extrabold leading-none">
                    {todayDone}
                    <span className="text-base font-semibold text-brand-100">/{todayTotal}</span>
                  </p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-100">sent today</p>
                </div>
              }
            />
          </div>
        </section>

        {/* Today's sends */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Today&apos;s sends</h2>
          {data.upcomingToday.length === 0 ? (
            <div className="card flex h-[calc(100%-2rem)] items-center p-5 text-sm text-ink-muted">
              No sends scheduled for today.
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
                              ? 'animate-pulse bg-brand-500'
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

      {/* Quick actions */}
      <div className="card mt-5 flex items-center justify-around gap-2 p-4 sm:justify-start sm:gap-10 sm:px-8">
        <QuickAction icon="plus" label="New" to="/app/new" tone="brand" />
        <QuickAction icon="history" label="History" to="/app/history" tone="neutral" />
        {recyclable ? (
          <QuickAction icon="recycle" label="Recycle" to={`/app/recycle/${recyclable.id}`} tone="accent" />
        ) : (
          <QuickAction icon="trend" label="Schedules" to="/app" tone="accent" />
        )}
      </div>

      {/* Locked-by-schedule chart */}
      {active.length > 0 && (
        <section className="card mt-5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Locked by schedule</h2>
            <span className="text-xs text-ink-muted">{formatKes(data.totalLocked)} total</span>
          </div>
          <MiniBars data={bars} height={110} />
        </section>
      )}

      {/* Active schedules */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">Active schedules</h2>
        {active.length === 0 ? (
          <EmptyState
            title="Nothing locked yet"
            subtitle="Create your first commitment schedule and let Pytif pay your future self."
            action={
              <Link to="/app/new" className="btn-primary">
                <Icon name="plus" size={18} />
                Build a schedule
              </Link>
            }
          />
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

      <p className="mt-8 text-center text-xs text-ink-muted">
        Sending to {formatPhone(user?.mpesa_number)} · Phase 1
      </p>
    </div>
  )
}

function ScheduleCard({ s, muted }) {
  const completedDays = Math.max(0, (s.total_days || 0) - (s.remainingDays || 0))
  const pct = s.total_days ? Math.round((completedDays / s.total_days) * 100) : 0
  return (
    <Link
      to={`/app/schedule/${s.id}`}
      className={`card hover-lift block h-full p-4 ${muted ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-ink">{s.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {s.nextSendToday
              ? `Next today · ${formatTime12(new Date(s.nextSendToday).toTimeString().slice(0, 5))}`
              : s.status === 'ACTIVE'
                ? 'No more sends today'
                : s.status === 'COMPLETED'
                  ? 'All sends complete'
                  : 'Awaiting deposit'}
          </p>
        </div>
        <StatusBadge status={s.status} />
      </div>

      {s.status === 'ACTIVE' && s.total_days > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
              style={{ width: `${pct}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
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
