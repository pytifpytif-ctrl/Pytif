import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useCachedQuery } from '../hooks/useCachedQuery.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, EmptyState } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatTime12, formatDateShort, formatDateLong, formatLocalTime, toLocalDayKey } from '../lib/format.js'
import {
  groupSendsByDay,
  isHistorySend,
  sortHistorySends,
  sortSchedulesLatest,
} from '../lib/moneyEvents.js'

const VIEW_TABS = [
  { id: 'sends', label: 'Upcoming', icon: 'clock' },
  { id: 'schedules', label: 'Schedules', icon: 'wallet' },
]

const SEND_STATUS_FILTERS = ['ALL', 'PENDING', 'FAILED']

const SCHEDULE_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'PAUSED', label: 'Paused' },
]

const STATUS_META = {
  FAILED: { icon: 'bolt', label: 'Failed', chip: 'bg-rose-500/12 text-rose-500', text: 'text-rose-500' },
  PENDING: { icon: 'clock', label: 'Pending', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
  PENDING_B2C_CONFIRM: { icon: 'clock', label: 'Sending…', chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300', text: 'text-amber-600 dark:text-amber-400' },
}

const SCHEDULE_STATUS_LABEL = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
}

function formatNextSend(iso) {
  if (!iso) return null
  return `${formatDateShort(iso)} · ${formatLocalTime(iso)}`
}

export default function History() {
  const { mask } = useBalance()
  const [searchParams] = useSearchParams()
  const fetchTxns = useCallback(() => api.listTransactions(), [])
  const fetchDash = useCallback(() => api.getDashboard(), [])
  const { data: txns, loading: txLoading, reload: reloadTxns } = useCachedQuery('transactions', fetchTxns)
  const { data: dash, loading: dashLoading, reload: reloadDash } = useCachedQuery('dashboard', fetchDash)
  const schedules = dash?.schedules ?? []
  const loading = txLoading && txns == null && dashLoading && dash == null
  const [view, setView] = useState(() => (searchParams.get('view') === 'schedules' ? 'schedules' : 'sends'))
  const [sendStatus, setSendStatus] = useState('ALL')
  const [scheduleFilter, setScheduleFilter] = useState('ALL')
  const [scheduleId, setScheduleId] = useState('ALL')
  const [range, setRange] = useState({ from: '', to: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [query, setQuery] = useState('')
  const topChromeRef = useRef(null)
  const [topChromeHeight, setTopChromeHeight] = useState(0)

  const refresh = useCallback(() => {
    void reloadTxns({ silent: true })
    void reloadDash({ silent: true })
  }, [reloadTxns, reloadDash])

  useScheduler(refresh)

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
    return sortHistorySends(
      (txns ?? []).filter((t) => {
        if (!isHistorySend(t)) return false
        if (sendStatus === 'PENDING' && t.status !== 'PENDING' && t.status !== 'PENDING_B2C_CONFIRM') return false
        if (sendStatus === 'FAILED' && t.status !== 'FAILED') return false
        if (scheduleId !== 'ALL' && t.schedule_id !== scheduleId) return false
        const day = toLocalDayKey(t.scheduled_for)
        if (range.from && day < range.from) return false
        if (range.to && day > range.to) return false
        if (tokens.length) {
          const time = formatLocalTime(t.scheduled_for)
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
      }),
    )
  }, [txns, sendStatus, scheduleId, range, tokens])

  const filteredSchedules = useMemo(() => {
    return sortSchedulesLatest(
      schedules.filter((s) => {
        if (scheduleFilter !== 'ALL' && s.status !== scheduleFilter) return false
        if (tokens.length) {
          const subtitle =
            s.nextSend
              ? formatNextSend(s.nextSend)
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
      }),
    )
  }, [schedules, scheduleFilter, tokens])

  const groupedTxns = useMemo(() => groupSendsByDay(filteredTxns), [filteredTxns])
  const lockedTotal = filteredSchedules.reduce((sum, s) => sum + (s.locked_balance || 0), 0)
  const pendingCount = filteredTxns.filter((t) => t.status === 'PENDING' || t.status === 'PENDING_B2C_CONFIRM').length
  const failedCount = filteredTxns.filter((t) => t.status === 'FAILED').length
  const pendingTotal = filteredTxns
    .filter((t) => t.status === 'PENDING' || t.status === 'PENDING_B2C_CONFIRM')
    .reduce((sum, t) => sum + t.amount, 0)
  const advancedCount = (scheduleId !== 'ALL' ? 1 : 0) + (range.from ? 1 : 0) + (range.to ? 1 : 0)
  const showClearSendFilters = advancedCount > 0 || query.trim().length > 0
  const showClearScheduleFilters = query.trim().length > 0
  const anySendFilter = showClearSendFilters || sendStatus !== 'ALL'
  const anyScheduleFilter = showClearScheduleFilters || scheduleFilter !== 'ALL'

  const clearAll = () => {
    setRange({ from: '', to: '' })
    setScheduleId('ALL')
    setSendStatus('ALL')
    setScheduleFilter('ALL')
    setQuery('')
  }

  const subtitle =
    view === 'sends'
      ? `${pendingCount} upcoming · ${mask(formatKes(pendingTotal))}${failedCount ? ` · ${failedCount} failed` : ''}`
      : `${filteredSchedules.length} schedules · ${mask(formatKes(lockedTotal))}`

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

        <div className="mb-2 mt-1.5 inline-flex rounded-full border border-line bg-surface-soft p-0.5 lg:mb-4 lg:mt-2 lg:p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition lg:gap-1.5 lg:px-4 lg:py-2 lg:text-sm ${
                view === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Icon name={tab.icon} size={14} className="lg:hidden" />
              <Icon name={tab.icon} size={15} className="hidden lg:block" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="field-wrap mb-2 lg:mb-3">
          <span className="field-ic">
            <Icon name="search" size={16} className="lg:hidden" />
            <Icon name="search" size={18} className="hidden lg:block" />
          </span>
          <input
            className="field max-lg:py-2 max-lg:text-[13px]"
            type="search"
            placeholder={view === 'sends' ? 'Search upcoming sends…' : 'Search schedules…'}
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
            <div className="mb-0 flex items-center gap-1.5 lg:gap-2">
              <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto pb-0.5 lg:gap-2">
                {SEND_STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSendStatus(s)}
                    className={`press shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:py-1.5 lg:text-xs ${
                      sendStatus === s ? 'bg-orange-500 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s === 'PENDING' ? 'Upcoming' : 'Failed'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-label="Filters"
                className={`press relative grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors lg:h-9 lg:w-9 ${
                  showFilters || advancedCount > 0
                    ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-300'
                    : 'border-line bg-surface text-ink-soft shadow-card'
                }`}
              >
                <Icon name="filter" size={16} className="lg:hidden" />
                <Icon name="filter" size={17} className="hidden lg:block" />
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
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 lg:gap-2">
            {SCHEDULE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setScheduleFilter(f.id)}
                className={`press shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:py-1.5 lg:text-xs ${
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

      <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-2 lg:pb-0 lg:pt-4">
      {view === 'sends' ? (
        <>
          {showClearSendFilters && (
            <button onClick={clearAll} className="press mb-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 lg:mb-4 lg:text-sm">
              <Icon name="close" size={14} />
              Clear filters
            </button>
          )}

          {filteredTxns.length === 0 ? (
            anySendFilter ? (
              <EmptyState icon="search" title="No matches" subtitle="Try a different search term or clear your filters." />
            ) : (
              <EmptyState icon="receipt" title="Nothing queued" subtitle="Upcoming and failed sends show here. Completed payouts are in Notifications." />
            )
          ) : (
            <div className="space-y-4 lg:space-y-5">
              {groupedTxns.map(([day, list]) => (
                <div key={day}>
                  <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-ink-muted lg:mb-2 lg:text-xs">
                    {formatDateShort(day)}
                  </p>
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
          {showClearScheduleFilters && (
            <button onClick={clearAll} className="press mb-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 lg:mb-4 lg:text-sm">
              <Icon name="close" size={14} />
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
            <div className="card divide-y divide-line">
              {filteredSchedules.map((s) => (
                <ScheduleRow key={s.id} s={s} mask={mask} />
              ))}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}

const SCHEDULE_STATUS_CLS = {
  ACTIVE: 'text-accent-600 dark:text-accent-300',
  COMPLETED: 'text-ink-muted',
  PAUSED: 'text-amber-600 dark:text-amber-400',
  CANCELLED: 'text-rose-500',
}

function SendRow({ t, mask }) {
  const meta = STATUS_META[t.status] || STATUS_META.PENDING
  const time = formatLocalTime(t.scheduled_for)
  const title = t.label || t.schedule_name
  const detail = t.label ? `${t.schedule_name} · ${time}` : time

  return (
    <div className="flex min-w-0 items-center gap-2.5 p-3 transition-colors hover:bg-surface-soft lg:gap-3 lg:p-3.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full lg:h-10 lg:w-10 ${meta.chip}`}>
        <Icon name={meta.icon} size={16} className="lg:hidden" />
        <Icon name={meta.icon} size={17} className="hidden lg:block" />
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold text-ink">{title}</p>
        <p className="truncate text-xs text-ink-muted">{detail}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{mask(formatKes(t.amount))}</p>
        <p className={`whitespace-nowrap text-[11px] font-medium ${meta.text}`}>{meta.label}</p>
      </div>
    </div>
  )
}

function ScheduleRow({ s, mask }) {
  const nextLine =
    s.nextSend
      ? `Next · ${formatNextSend(s.nextSend)}`
      : s.status === 'ACTIVE'
        ? 'No upcoming sends'
        : s.status === 'COMPLETED'
          ? 'All sends complete'
          : 'Awaiting deposit'
  const statusLabel = SCHEDULE_STATUS_LABEL[s.status] || s.status
  const statusCls = SCHEDULE_STATUS_CLS[s.status] || 'text-ink-muted'

  return (
    <div className="flex min-w-0 items-center gap-2 p-3 lg:gap-2.5 lg:p-3.5">
      <Link to={`/app/schedule/${s.id}`} className="press flex min-w-0 flex-1 items-center gap-2.5 lg:gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full lg:h-10 lg:w-10 ${
            s.status === 'ACTIVE'
              ? 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
              : s.status === 'COMPLETED'
                ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
                : 'bg-surface-soft text-ink-muted'
          }`}
        >
          <Icon name="wallet" size={16} className="lg:hidden" />
          <Icon name="wallet" size={17} className="hidden lg:block" />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
          <p className="truncate text-xs text-ink-muted">{nextLine}</p>
        </div>
      </Link>
      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{mask(formatKes(s.locked_balance))}</p>
        <p className={`whitespace-nowrap text-[11px] font-medium ${statusCls}`}>{statusLabel}</p>
      </div>
      {s.status === 'ACTIVE' && (
        <Link
          to={`/app/schedule/${s.id}/add-funds`}
          state={{ from: 'history' }}
          className="press shrink-0 rounded-lg bg-orange-500 px-2 py-1.5 text-[10px] font-bold leading-none text-white hover:bg-orange-600 lg:px-2.5 lg:text-[11px]"
          aria-label={`Add funds to ${s.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="lg:hidden">+</span>
          <span className="hidden lg:inline">Add</span>
        </Link>
      )}
    </div>
  )
}
