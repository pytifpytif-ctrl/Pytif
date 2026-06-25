import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { Logo, Spinner, StatusBadge, EmptyState } from '../components/ui.jsx'
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

  return (
    <div className="animate-fade-in">
      <header className="flex items-center justify-between py-4">
        <Logo size={44} />
        <button
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
          className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-ink-soft shadow-card"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          Log out
        </button>
      </header>

      {/* Locked balance hero */}
      <section className="mt-2 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-float">
        <p className="text-sm font-medium text-brand-100">Total locked balance</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{formatKes(data.totalLocked)}</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-brand-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
          </svg>
          Committed across {active.length} active schedule{active.length === 1 ? '' : 's'} · no withdrawals
        </div>
      </section>

      <Link to="/app/new" className="btn-primary mt-5 w-full">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        New schedule
      </Link>

      {/* Today's sends */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Today&apos;s sends
        </h2>
        {data.upcomingToday.length === 0 ? (
          <div className="card p-5 text-sm text-ink-muted">No sends scheduled for today.</div>
        ) : (
          <ol className="relative space-y-3 border-l-2 border-slate-200 pl-5">
            {data.upcomingToday.map((t) => {
              const due = new Date(t.scheduled_for).getTime()
              const isPast = t.status !== 'PENDING'
              const isNext = t.status === 'PENDING' && due >= now
              return (
                <li key={t.id} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                      t.status === 'SUCCESS'
                        ? 'bg-accent-500'
                        : t.status === 'FAILED'
                          ? 'bg-rose-500'
                          : isNext
                            ? 'animate-pulse bg-brand-500'
                            : 'bg-slate-300'
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

      {/* Active schedules */}
      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Active schedules
        </h2>
        {active.length === 0 ? (
          <EmptyState
            title="Nothing locked yet"
            subtitle="Create your first commitment schedule and let Pytif pay your future self."
            action={
              <Link to="/app/new" className="btn-primary">
                Build a schedule
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {active.map((s) => (
              <ScheduleCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>

      {others.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
            Completed & paused
          </h2>
          <div className="space-y-3">
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
  return (
    <Link
      to={`/app/schedule/${s.id}`}
      className={`card block p-4 transition active:scale-[0.99] ${muted ? 'opacity-90' : ''}`}
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
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
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
