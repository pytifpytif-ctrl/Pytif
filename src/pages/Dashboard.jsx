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

  const defaultNames = ['Jiokoe user', 'Pytif user', 'Wastel user']
  const firstName = (user?.name && !defaultNames.includes(user.name) ? user.name.split(' ')[0] : '') || 'there'

  const todayTotal = data.upcomingToday.length
  const todayDone = data.upcomingToday.filter((t) => t.status === 'SUCCESS').length
  const recyclable = others.find((s) => s.status === 'COMPLETED')

  const bars = active.slice(0, 7).map((s) => ({ label: s.name.slice(0, 3), value: s.locked_balance }))
  const isEmpty = data.schedules.length === 0

  return (
    <div className="animate-fade-in max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between pb-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:py-4 lg:pt-4">
        <Link to="/app/profile" className="press flex items-center gap-2.5 lg:gap-3">
          <Avatar src={user?.avatar_url} name={user?.name} size={36} className="lg:hidden" />
          <Avatar src={user?.avatar_url} name={user?.name} size={40} className="hidden lg:block" />
          <div>
            <p className="text-[11px] text-ink-muted lg:text-xs">Welcome back</p>
            <p className="text-sm font-bold leading-tight text-ink lg:text-base">{firstName}</p>
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
          to="/app/profile"
          className="press mb-3 flex shrink-0 items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 lg:mb-5 lg:p-4"
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

      <div className="scroll-area max-lg:min-h-0 max-lg:flex-1 max-lg:overflow-y-auto max-lg:pb-1">
        <div className="grid gap-3 max-lg:flex max-lg:flex-col lg:grid-cols-3 lg:gap-5">
        {/* Locked balance hero */}
        <section className="bg-brand-rich relative shrink-0 overflow-hidden rounded-3xl p-3.5 text-white shadow-glow lg:col-span-2 lg:p-5">
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-orange-100 lg:text-xs">Total locked balance</p>
                <button
                  onClick={toggle}
                  className="press grid h-5 w-5 place-items-center rounded-full bg-white/15 text-orange-50 transition hover:bg-white/25 lg:h-6 lg:w-6"
                  aria-label={hidden ? 'Show balance' : 'Hide balance'}
                  aria-pressed={hidden}
                >
                  <Icon name={hidden ? 'eyeOff' : 'eye'} size={12} className="lg:hidden" />
                  <Icon name={hidden ? 'eyeOff' : 'eye'} size={13} className="hidden lg:block" />
                </button>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:py-1 lg:text-xs">
                <Icon name="lockClosed" size={12} className="lg:hidden" />
                <Icon name="lockClosed" size={13} className="hidden lg:block" />
                {active.length} active
              </span>
            </div>

            {/* Balance + gauge */}
            <div className="mt-1 flex items-center justify-between gap-2 lg:gap-3">
              <p className="text-xl font-bold leading-none tracking-tight sm:text-2xl lg:text-3xl">{mask(formatKes(data.totalLocked))}</p>
              <Gauge
                value={todayDone}
                max={todayTotal || 1}
                size={64}
                stroke={7}
                center={
                  todayTotal > 0 ? (
                    <div className="text-white">
                      <p className="text-lg font-bold leading-none lg:text-xl">
                        {todayDone}
                        <span className="text-xs font-semibold text-orange-100 lg:text-sm">/{todayTotal}</span>
                      </p>
                      <p className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-orange-100 lg:text-[9px]">today</p>
                    </div>
                  ) : (
                    <div className="text-white">
                      <Icon name="check" size={18} className="mx-auto lg:hidden" />
                      <Icon name="check" size={20} className="mx-auto hidden lg:block" />
                      <p className="mt-0.5 text-[8px] font-medium uppercase tracking-wide text-orange-100 lg:text-[9px]">clear</p>
                    </div>
                  )
                }
              />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 lg:mt-2 lg:gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold text-white lg:px-2.5 lg:py-1 lg:text-[11px]">
                No withdrawals
              </span>
              <Link
                to="/app/new"
                className="press inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 lg:gap-1.5 lg:px-3 lg:py-2 lg:text-xs"
              >
                <Icon name="rocket" size={14} strokeWidth={2.2} className="lg:hidden" />
                <Icon name="rocket" size={15} strokeWidth={2.2} className="hidden lg:block" />
                New schedule
              </Link>
            </div>
          </div>
        </section>

        {/* Upcoming sends */}
        <section className="flex shrink-0 flex-col lg:col-span-1">
          <div className="mb-2 flex shrink-0 items-center justify-between lg:mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted lg:text-sm">Upcoming sends</h2>
            <Link to="/app/history" className="text-xs font-semibold text-orange-600 dark:text-orange-400">
              View all
            </Link>
          </div>
          {(data.upcoming?.length ?? 0) === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-2 p-4 text-center lg:min-h-[120px] lg:flex-1">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300 lg:h-10 lg:w-10">
                <Icon name="check" size={18} className="lg:hidden" />
                <Icon name="check" size={20} className="hidden lg:block" />
              </span>
              <p className="text-sm text-ink-muted">No upcoming sends.</p>
            </div>
          ) : (
            <div className="card overflow-hidden px-2 py-1">
              <ul className="scroll-area stagger divide-y divide-line overflow-y-auto max-h-[calc(3*3.5rem)] pr-0.5">
                {data.upcoming.map((t, i) => (
                  <SendRow key={t.id} t={t} highlight={i === 0} compact />
                ))}
              </ul>
            </div>
          )}
        </section>
        </div>

        {/* Locked by schedule — visible on mobile + desktop */}
        {active.length > 0 && (
          <section className="card mt-3 shrink-0 p-3.5 lg:mt-5 lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted lg:text-sm">Locked by schedule</h2>
                <p className="mt-0.5 text-[11px] text-ink-muted lg:text-xs">Distribution of your committed balance</p>
              </div>
              <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-300 lg:px-3 lg:text-xs">
                {mask(formatKes(data.totalLocked))}
              </span>
            </div>
            <MiniBars data={bars} height={90} />
          </section>
        )}

        {/* Recycle nudge — desktop only */}
        {recyclable && (
          <Link
            to={`/app/recycle/${recyclable.id}`}
            className="press mt-5 hidden shrink-0 items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card lg:flex"
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

        {isEmpty && (
          <div className="hidden lg:block">
            <GetStarted />
          </div>
        )}
      </div>
    </div>
  )
}

const SEND_STATUS = {
  SUCCESS: { label: 'Sent', cls: 'text-accent-600 dark:text-accent-300' },
  FAILED: { label: 'Failed', cls: 'text-rose-500' },
  PENDING: { label: 'Pending', cls: 'text-ink-muted' },
  PENDING_B2C_CONFIRM: { label: 'Sending…', cls: 'text-amber-600 dark:text-amber-400' },
}

function SendRow({ t, highlight, compact }) {
  const { mask } = useBalance()
  const st = SEND_STATUS[t.status] || SEND_STATUS.PENDING
  return (
    <li className={`flex items-center gap-2.5 text-left lg:gap-3 ${compact ? 'px-2 py-2.5' : 'px-2.5 py-3'}`}>
      <span
        className={`grid shrink-0 place-items-center rounded-full ${
          compact ? 'h-9 w-9' : 'h-10 w-10'
        } ${
          t.status === 'SUCCESS'
            ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
            : t.status === 'FAILED'
              ? 'bg-rose-500/12 text-rose-500'
              : highlight
                ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
                : 'bg-surface-soft text-ink-muted'
        }`}
      >
        <Icon name={t.status === 'SUCCESS' ? 'check' : 'arrowUpRight'} size={compact ? 16 : 18} />
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
  { icon: 'lockClosed', title: 'Lock & relax', desc: 'Jiokoe pays your future self on schedule.' },
]

function GetStarted() {
  return (
    <section className="card mt-0 flex min-h-0 flex-1 flex-col justify-center p-4 lg:mt-8 lg:block lg:p-8">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300">
          <Icon name="bolt" size={13} /> Get started
        </span>
        <h2 className="mt-2 text-lg font-extrabold tracking-tight text-ink lg:mt-3 lg:text-2xl">
          Lock your first commitment
        </h2>
        <p className="mt-1 max-w-md text-sm text-ink-muted">
          Set money aside and let it return to your own M-Pesa on a schedule you control.
        </p>

        <div className="mt-4 hidden gap-3 sm:grid-cols-3 lg:grid">
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
          className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 sm:w-auto lg:mt-6"
        >
          <Icon name="rocket" size={18} strokeWidth={2.2} />
          Build a schedule
        </Link>
      </div>
    </section>
  )
}
