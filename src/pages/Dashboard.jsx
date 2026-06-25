import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useBalance } from '../context/BalanceContext.jsx'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { Avatar, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { Gauge, MiniBars } from '../components/charts.jsx'
import { formatKes, formatDateTime } from '../lib/format.js'

export default function Dashboard() {
  const { user } = useAuth()
  const { hidden, toggle, mask } = useBalance()
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
        <Link to="/app/profile" className="press flex items-center gap-3">
          <Avatar src={user?.avatar_url} name={user?.name} size={40} />
          <div>
            <p className="text-xs text-ink-muted">Welcome back</p>
            <p className="text-base font-bold leading-tight text-ink">{firstName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/app/notifications"
            className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card transition-colors hover:text-ink"
            aria-label="Notifications"
          >
            <Icon name="bell" size={17} />
          </Link>
          <Link
            to="/app/analytics"
            className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft shadow-card transition-colors hover:text-ink"
            aria-label="Analytics"
          >
            <Icon name="analytics" size={17} />
          </Link>
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
        <section className="bg-brand-rich relative overflow-hidden rounded-3xl p-5 text-white shadow-glow lg:col-span-2 lg:p-8">
          {/* Decorative depth */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-24 right-1/4 h-48 w-48 rounded-full bg-amber-300/30 blur-3xl" />
            <div className="absolute -left-16 top-1/3 h-40 w-40 rounded-full bg-orange-300/20 blur-2xl" />
            <div className="absolute -right-8 bottom-4 h-32 w-32 rounded-full border border-white/15" />
            <div className="absolute -right-2 bottom-10 h-20 w-20 rounded-full border border-white/10" />
          </div>
          <div className="relative">
            {/* Top row: label + active count */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-100">Total locked balance</p>
                <button
                  onClick={toggle}
                  className="press grid h-6 w-6 place-items-center rounded-full bg-white/15 text-orange-50 transition hover:bg-white/25"
                  aria-label={hidden ? 'Show balance' : 'Hide balance'}
                  aria-pressed={hidden}
                >
                  <Icon name={hidden ? 'eyeOff' : 'eye'} size={13} />
                </button>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                <Icon name="lockClosed" size={13} />
                {active.length} active
              </span>
            </div>

            {/* Balance + gauge */}
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{mask(formatKes(data.totalLocked))}</p>
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

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold text-white">
                No withdrawals
              </span>
              <Link
                to="/app/new"
                className="press inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50"
              >
                <Icon name="rocket" size={17} strokeWidth={2.2} />
                New schedule
              </Link>
            </div>
          </div>
        </section>

        {/* Upcoming sends */}
        <section className="lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">Upcoming sends</h2>
            <Link to="/app/history" className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              View all
            </Link>
          </div>
          {(data.upcoming?.length ?? 0) === 0 ? (
            <div className="card flex min-h-[120px] flex-col items-center justify-center gap-2 p-5 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300">
                <Icon name="check" size={20} />
              </span>
              <p className="text-sm text-ink-muted">No upcoming sends.</p>
            </div>
          ) : (
            <div className="card px-2 py-1">
              <div className={data.upcoming.length > 5 ? 'scroll-area max-h-[20rem] overflow-y-auto pr-1' : ''}>
                <ul className="stagger divide-y divide-line">
                  {data.upcoming.map((t, i) => (
                    <SendRow key={t.id} t={t} highlight={i === 0} />
                  ))}
                </ul>
              </div>
            </div>
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
              {mask(formatKes(data.totalLocked))}
            </span>
          </div>
          <MiniBars data={bars} height={120} />
        </section>
      )}

      {isEmpty && <GetStarted />}
    </div>
  )
}

const SEND_STATUS = {
  SUCCESS: { label: 'Sent', cls: 'text-accent-600 dark:text-accent-300' },
  FAILED: { label: 'Failed', cls: 'text-rose-500' },
  PENDING: { label: 'Pending', cls: 'text-ink-muted' },
  PENDING_B2C_CONFIRM: { label: 'Sending…', cls: 'text-amber-600 dark:text-amber-400' },
}

function SendRow({ t, highlight }) {
  const { mask } = useBalance()
  const st = SEND_STATUS[t.status] || SEND_STATUS.PENDING
  return (
    <li className="flex items-center gap-3 px-2.5 py-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          t.status === 'SUCCESS'
            ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
            : t.status === 'FAILED'
              ? 'bg-rose-500/12 text-rose-500'
              : highlight
                ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
                : 'bg-surface-soft text-ink-muted'
        }`}
      >
        <Icon name={t.status === 'SUCCESS' ? 'check' : 'arrowUpRight'} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{t.label || t.schedule_name}</p>
        <p className="truncate text-xs text-ink-muted">
          {formatDateTime(t.scheduled_for)}
          {t.label ? ` · ${t.schedule_name}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">{mask(formatKes(t.amount))}</p>
        <p className={`text-xs font-medium ${st.cls}`}>{st.label}</p>
      </div>
    </li>
  )
}

const STEPS = [
  { icon: 'calendar', title: 'Choose a pattern', desc: 'Every day, set weekdays, or exact dates.' },
  { icon: 'clock', title: 'Set times & amounts', desc: 'Decide when and how much returns to you.' },
  { icon: 'lockClosed', title: 'Lock & relax', desc: 'Pytif pays your future self on schedule.' },
]

function GetStarted() {
  return (
    <section className="card mt-8 p-6 lg:p-8">
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
          <Icon name="rocket" size={18} strokeWidth={2.2} />
          Build a schedule
        </Link>
      </div>
    </section>
  )
}
