import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, EmptyState, StatusBadge } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, formatDateTime } from '../lib/format.js'

const VIEW_TABS = [
  { id: 'sends', label: 'Sends', icon: 'arrowUpRight' },
  { id: 'schedules', label: 'Schedules', icon: 'wallet' },
]

const SEND_STATUS_FILTERS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED']

const SCHEDULE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'PAUSED', label: 'Paused' },
]

const STATUS_META = {
  SUCCESS: { icon: 'check', label: 'Sent', chip: 'bg-accent-500/12 text-accent-600 dark:text-accent-300', text: 'text-accent-600 dark:text-accent-300' },
  FAILED: { icon: 'bolt', label: 'Failed', chip: 'bg-rose-500/12 text-rose-500', text: 'text-rose-500' },
  PENDING: { icon: 'clock', label: 'Pending', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
}

const SCHEDULE_STATUS_LABEL = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
}

export default function History() {
  const { mask } = useBalance()
  const [txns, setTxns] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('sends')
  const [sendStatus, setSendStatus] = useState('ALL')
  const [scheduleFilter, setScheduleFilter] = useState('ALL')
  const [scheduleId, setScheduleId] = useState('ALL')
  const [range, setRange] = useState({ from: '', to: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const topChromeRef = useRef(null)
  const [topChromeHeight, setTopChromeHeight] = useState(0)

  const load = useCallback(async () => {
    const [t, dash] = await Promise.all([api.listTransactions(), api.getDashboard()])
    setTxns(t)
    setSchedules(dash.schedules)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useScheduler(load)

  useLayoutEffect(() => {
    const el = topChromeRef.current
    if (!el) return undefined

    const update = () => setTopChromeHeight(el.getBoundingClientRect().height)
    update()

    const mq = window.matchMedia('(max-width: 1023px)')
    const onMq = () => update()
    mq.addEventListener('change', onMq)

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      mq.removeEventListener('change', onMq)
      ro.disconnect()
    }
  }, [loading, view, sendStatus, scheduleFilter, showFilters, query])

  const tokens = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query])

  const filteredTxns = useMemo(() => {
    return txns.filter((t) => {
      if (sendStatus !== 'ALL' && t.status !== sendStatus) return false
      if (scheduleId !== 'ALL' && t.schedule_id !== scheduleId) return false
      const day = t.scheduled_for.slice(0, 10)
      if (range.from && day < range.from) return false
      if (range.to && day > range.to) return false
      if (tokens.length) {
        const time = formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))
        const haystack = [
          t.schedule_name,
          t.label,
          t.status,
          STATUS_META[t.status]?.label,
          t.mpesa_reference,
          String(t.amount),
          formatKes(t.amount),
          t.scheduled_for,
          formatDateShort(day),
          formatDateLong(t.scheduled_for),
          time,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!tokens.every((tok) => haystack.includes(tok))) return false
      }
      return true
    })
  }, [txns, sendStatus, scheduleId, range, tokens])

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (scheduleFilter !== 'ALL' && s.status !== scheduleFilter) return false
      if (tokens.length) {
        const subtitle =
          s.nextSend
            ? formatDateTime(s.nextSend)
            : s.status === 'ACTIVE'
              ? 'no upcoming sends'
              : s.status === 'COMPLETED'
                ? 'all sends complete'
                : 'awaiting deposit'
        const haystack = [
          s.name,
          s.status,
          SCHEDULE_STATUS_LABEL[s.status],
          String(s.locked_balance),
          formatKes(s.locked_balance),
          subtitle,
          `${s.remainingDays}/${s.total_days}`,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!tokens.every((tok) => haystack.includes(tok))) return false
      }
      return true
    })
  }, [schedules, scheduleFilter, tokens])

  const groupedTxns = useMemo(() => {
    const map = {}
    for (const t of filteredTxns) {
      const day = t.scheduled_for.slice(0, 10)
      ;(map[day] = map[day] || []).push(t)
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filteredTxns])

  const sentTotal = filteredTxns.filter((t) => t.status === 'SUCCESS').reduce((sum, t) => sum + t.amount, 0)
  const lockedTotal = filteredSchedules.reduce((sum, s) => sum + (s.locked_balance || 0), 0)
  const advancedCount = (scheduleId !== 'ALL' ? 1 : 0) + (range.from ? 1 : 0) + (range.to ? 1 : 0)
  const anySendFilter = advancedCount > 0 || sendStatus !== 'ALL' || query.trim().length > 0
  const anyScheduleFilter = scheduleFilter !== 'ALL' || query.trim().length > 0

  const clearAll = () => {
    setRange({ from: '', to: '' })
    setScheduleId('ALL')
    setSendStatus('ALL')
    setScheduleFilter('ALL')
    setQuery('')
  }

  const subtitle =
    view === 'sends'
      ? `${mask(formatKes(sentTotal))} sent · ${filteredTxns.length} records`
      : `${filteredSchedules.length} schedules · ${mask(formatKes(lockedTotal))} locked`

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-2xl flex-1 flex-col overflow-hidden">
      <div
        ref={topChromeRef}
        className="page-top-chrome page-top-chrome-dark z-40 shrink-0 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:px-5 max-lg:pb-2.5 max-lg:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-2 lg:backdrop-blur-none"
      >
        <ScreenHeader embedded inverse compact dense title="History" subtitle={subtitle} />

        <div className="mb-3 mt-2 inline-flex rounded-full border border-line bg-surface-soft p-1 lg:mb-4">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition lg:px-4 lg:py-2 ${
                view === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="field-wrap mb-3">
          <span className="field-ic">
            <Icon name="search" size={18} />
          </span>
          <input
            className="field"
            type="search"
            placeholder={view === 'sends' ? 'Search sends…' : 'Search schedules…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="press absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink-muted transition-colors hover:text-ink"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {view === 'sends' ? (
          <>
            <div className="mb-0 flex items-center gap-2">
              <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pb-0.5">
                {SEND_STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSendStatus(s)}
                    className={`chip press whitespace-nowrap px-3 py-1.5 text-xs lg:px-3.5 lg:py-2 lg:text-sm ${
                      sendStatus === s ? 'bg-orange-500 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filters"
                className={`press relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors ${
                  showFilters || advancedCount > 0
                    ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                    : 'border-line bg-surface text-ink-soft shadow-card'
                }`}
              >
                <Icon name="filter" size={17} />
                {advancedCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    {advancedCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="card mt-3 animate-scale-in space-y-3 p-4">
                <div>
                  <label className="label">Schedule</label>
                  <select className="field py-2.5" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                    <option value="ALL">All schedules</option>
                    {schedules.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">From</label>
                    <input type="date" className="field py-2.5" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">To</label>
                    <input type="date" className="field py-2.5" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
            {SCHEDULE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setScheduleFilter(f.id)}
                className={`chip press whitespace-nowrap px-3 py-1.5 text-xs lg:px-3.5 lg:py-2 lg:text-sm ${
                  scheduleFilter === f.id ? 'bg-orange-500 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 lg:hidden" style={{ height: topChromeHeight || undefined }} aria-hidden />

      <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 lg:pb-0 lg:pt-4">
      {view === 'sends' ? (
        <>
          {anySendFilter && (
            <button onClick={clearAll} className="press mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
              <Icon name="close" size={15} />
              Clear filters
            </button>
          )}

          {filteredTxns.length === 0 ? (
            anySendFilter ? (
              <EmptyState icon="search" title="No matches" subtitle="Try a different search term or clear your filters." />
            ) : (
              <EmptyState icon="receipt" title="No sends yet" subtitle="Your payouts will show up here as they fire." />
            )
          ) : (
            <div className="space-y-5">
              {groupedTxns.map(([day, list]) => (
                <div key={day}>
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{formatDateShort(day)}</p>
                  <div className="card divide-y divide-line">
                    {list.map((t) => (
                      <SendRow key={t.id} t={t} mask={mask} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {anyScheduleFilter && (
            <button onClick={clearAll} className="press mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400">
              <Icon name="close" size={15} />
              Clear filters
            </button>
          )}

          {filteredSchedules.length === 0 ? (
            anyScheduleFilter ? (
              <EmptyState icon="search" title="No matches" subtitle="Try a different filter or search term." />
            ) : (
              <EmptyState icon="wallet" title="No schedules yet" subtitle="Create one from the home screen to get started." />
            )
          ) : (
            <div className="grid gap-3">
              {filteredSchedules.map((s) => (
                <ScheduleCard key={s.id} s={s} mask={mask} />
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}

function SendRow({ t, mask }) {
  const meta = STATUS_META[t.status] || STATUS_META.PENDING
  const time = formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))
  return (
    <div className="flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-soft">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${meta.chip}`}>
        <Icon name={meta.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{t.schedule_name}</p>
        <p className="truncate text-xs text-ink-muted">
          {formatDateShort(t.scheduled_for.slice(0, 10))} · {time}
          {t.label ? ` · ${t.label}` : ''}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">{mask(formatKes(t.amount))}</p>
        <p className={`text-xs font-medium ${meta.text}`}>{meta.label}</p>
      </div>
    </div>
  )
}

function ScheduleCard({ s, mask }) {
  const completedDays = Math.max(0, (s.total_days || 0) - (s.remainingDays || 0))
  const pct = s.total_days ? Math.round((completedDays / s.total_days) * 100) : 0
  const muted = s.status !== 'ACTIVE'

  return (
    <Link to={`/app/schedule/${s.id}`} className={`card hover-lift block p-3.5 ${muted ? 'opacity-90' : ''}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            s.status === 'ACTIVE'
              ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
              : s.status === 'COMPLETED'
                ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
                : 'bg-surface-soft text-ink-muted'
          }`}
        >
          <Icon name="wallet" size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
            <p className="shrink-0 text-sm font-bold text-ink">{mask(formatKes(s.locked_balance))}</p>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-xs text-ink-muted">
              {s.nextSend
                ? `Next · ${formatDateTime(s.nextSend)}`
                : s.status === 'ACTIVE'
                  ? 'No upcoming sends'
                  : s.status === 'COMPLETED'
                    ? 'All sends complete'
                    : 'Awaiting deposit'}
            </p>
            <StatusBadge status={s.status} />
          </div>
        </div>
      </div>

      {s.status === 'ACTIVE' && s.total_days > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-[10px] font-medium text-ink-muted">
            {s.remainingDays}/{s.total_days}d
          </span>
        </div>
      )}
    </Link>
  )
}
