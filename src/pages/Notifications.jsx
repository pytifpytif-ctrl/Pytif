import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api.js'
import { useCachedQuery } from '../hooks/useCachedQuery.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, StatusBadge, EmptyState } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatDateShort, formatDateLong, formatTime12 } from '../lib/format.js'

const READ_KEY = 'jiokoe-notifs-read'

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'IN', label: 'Money in' },
  { id: 'OUT', label: 'Payouts' },
]

function loadReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function Notifications() {
  const { mask } = useBalance()
  const fetchDeposits = useCallback(() => api.listDeposits(), [])
  const fetchTxns = useCallback(() => api.listTransactions(), [])
  const { data: deposits, loading: depLoading, reload: reloadDeposits } = useCachedQuery(
    'deposits',
    fetchDeposits,
  )
  const { data: txns, loading: txnLoading, reload: reloadTxns } = useCachedQuery(
    'transactions',
    fetchTxns,
  )
  const loading = depLoading && deposits == null && txnLoading && txns == null
  const [filter, setFilter] = useState('ALL')
  const [readIds, setReadIds] = useState(loadReadIds)
  const [selected, setSelected] = useState(null)
  const topChromeRef = useRef(null)
  const [topChromeHeight, setTopChromeHeight] = useState(0)

  const refresh = useCallback(() => {
    void reloadDeposits({ silent: true })
    void reloadTxns({ silent: true })
  }, [reloadDeposits, reloadTxns])

  useScheduler(refresh)

  const persistRead = (set) => localStorage.setItem(READ_KEY, JSON.stringify([...set]))

  const markRead = useCallback((id) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      persistRead(next)
      return next
    })
  }, [])

  const allEvents = useMemo(() => {
    const inEvents = (deposits ?? []).map((d) => ({
      id: `dep-${d.id}`,
      kind: 'IN',
      when: d.created_at,
      amount: d.amount,
      status: d.status,
      title: 'Wallet funded',
      detail: `Locked into ${d.schedule_name}`,
      schedule: d.schedule_name,
      reference: d.mpesa_reference,
    }))
    const outEvents = (txns ?? []).map((t) => ({
      id: `txn-${t.id}`,
      kind: 'OUT',
      when: t.scheduled_for,
      amount: t.amount,
      status: t.status,
      title: t.label || 'Payout to your M-Pesa',
      detail: t.schedule_name,
      schedule: t.schedule_name,
      reference: t.mpesa_reference,
    }))
    return [...inEvents, ...outEvents].sort((a, b) => new Date(b.when) - new Date(a.when))
  }, [deposits, txns])

  const events = useMemo(
    () => allEvents.filter((e) => filter === 'ALL' || e.kind === filter),
    [allEvents, filter],
  )

  const grouped = useMemo(() => {
    const map = {}
    for (const e of events) {
      const day = String(e.when).slice(0, 10)
      ;(map[day] = map[day] || []).push(e)
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [events])

  const unreadCount = allEvents.filter((e) => !readIds.has(e.id)).length

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
  }, [loading, filter, unreadCount])

  const markAllRead = () => {
    setReadIds(() => {
      const next = new Set(allEvents.map((e) => e.id))
      persistRead(next)
      return next
    })
  }

  const openEvent = (e) => {
    setSelected(e)
    markRead(e.id)
  }

  const totalIn = (deposits ?? []).filter((d) => d.status === 'CONFIRMED').reduce((s, d) => s + d.amount, 0)
  const totalOut = (txns ?? []).filter((t) => t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-2xl flex-1 flex-col overflow-hidden">
      {/* Fixed top chrome on mobile: header + summary + filters */}
      <div
        ref={topChromeRef}
        className="page-top-chrome page-top-chrome-dark z-40 shrink-0 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:px-5 max-lg:pb-2.5 max-lg:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-2 lg:backdrop-blur-none"
      >
        <ScreenHeader
          embedded
          inverse
          compact
          dense
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          back="/app"
          hideBackOnDesktop
          right={
            unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="press whitespace-nowrap rounded-full border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold leading-none text-neutral-200 shadow-card transition-colors hover:text-white lg:border-line lg:bg-surface lg:px-2.5 lg:py-1 lg:text-[11px] lg:text-ink-soft lg:hover:text-ink"
              >
                <span className="lg:hidden">Mark read</span>
                <span className="hidden lg:inline">Mark all read</span>
              </button>
            ) : null
          }
        />

        <div className="mt-2 grid grid-cols-2 gap-1.5 lg:mt-4 lg:gap-2">
          <div className="card flex min-w-0 items-center gap-2 p-2 lg:gap-2.5 lg:p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-500/12 text-accent-600 dark:text-accent-300 lg:h-8 lg:w-8 lg:rounded-xl">
              <Icon name="arrowDownLeft" size={14} className="lg:hidden" />
              <Icon name="arrowDownLeft" size={15} className="hidden lg:block" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-ink-muted lg:text-[11px]">Total in</p>
              <p className="truncate text-xs font-bold text-ink lg:text-sm">{mask(formatKes(totalIn))}</p>
            </div>
          </div>
          <div className="card flex min-w-0 items-center gap-2 p-2 lg:gap-2.5 lg:p-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-500/12 text-orange-600 dark:text-orange-300 lg:h-8 lg:w-8 lg:rounded-xl">
              <Icon name="arrowUpRight" size={14} className="lg:hidden" />
              <Icon name="arrowUpRight" size={15} className="hidden lg:block" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-ink-muted lg:text-[11px]">Total paid out</p>
              <p className="truncate text-xs font-bold text-ink lg:text-sm">{mask(formatKes(totalOut))}</p>
            </div>
          </div>
        </div>

        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5 lg:mt-3 lg:gap-2 lg:overflow-visible">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`press shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:py-1.5 lg:text-xs ${
                filter === f.id ? 'bg-orange-500 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spacer matching fixed chrome height on mobile */}
      <div className="shrink-0 lg:hidden" style={{ height: topChromeHeight || undefined }} aria-hidden />

      <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 lg:pb-0 lg:pt-4">
        {events.length === 0 ? (
          <EmptyState icon="bell" title="Nothing here yet" subtitle="Deposits and payouts will appear here in detail." />
        ) : (
          <div className="space-y-5">
            {grouped.map(([day, list]) => (
              <div key={day}>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{formatDateShort(day)}</p>
                <div className="card divide-y divide-line">
                  {list.map((e) => (
                    <EventRow key={e.id} e={e} mask={mask} unread={!readIds.has(e.id)} onClick={() => openEvent(e)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <DetailModal e={selected} mask={mask} onClose={() => setSelected(null)} />}
    </div>
  )
}

const EVENT_STATUS = {
  CONFIRMED: { label: 'Confirmed', cls: 'text-accent-600 dark:text-accent-300' },
  SUCCESS: { label: 'Sent', cls: 'text-accent-600 dark:text-accent-300' },
  PENDING: { label: 'Pending', cls: 'text-amber-600 dark:text-amber-400' },
  PENDING_B2C_CONFIRM: { label: 'Sending…', cls: 'text-amber-600 dark:text-amber-400' },
  FAILED: { label: 'Failed', cls: 'text-rose-500' },
}

function EventRow({ e, mask, unread, onClick }) {
  const isIn = e.kind === 'IN'
  const time = formatTime12(new Date(e.when).toTimeString().slice(0, 5))
  const st = EVENT_STATUS[e.status] || EVENT_STATUS.PENDING
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex w-full min-w-0 items-center gap-2.5 p-3 text-left transition-colors hover:bg-surface-soft lg:gap-3 lg:p-4 ${
        unread ? 'bg-orange-500/[0.04]' : ''
      }`}
    >
      <span
        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          isIn
            ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
            : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
        }`}
      >
        <Icon name={isIn ? 'arrowDownLeft' : 'arrowUpRight'} size={17} />
        {unread && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-surface bg-orange-500" />}
      </span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className={`truncate text-sm text-ink ${unread ? 'font-bold' : 'font-semibold'}`}>{e.title}</p>
        <p className="truncate text-xs text-ink-muted">
          {time} · {e.detail}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{mask(formatKes(e.amount))}</p>
        <p className={`whitespace-nowrap text-[11px] font-medium ${st.cls}`}>{st.label}</p>
      </div>
    </button>
  )
}

function DetailModal({ e, mask, onClose }) {
  const isIn = e.kind === 'IN'

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-detail-title"
    >
      <div
        className="card mx-auto w-full max-w-sm animate-scale-in p-4 shadow-float"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
              isIn
                ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
                : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
            }`}
          >
            <Icon name={isIn ? 'arrowDownLeft' : 'arrowUpRight'} size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="notif-detail-title" className="text-sm font-bold leading-tight text-ink">
              {e.title}
            </h2>
            <p className="mt-0.5 text-lg font-extrabold leading-none tracking-tight text-ink">
              {mask(formatKes(e.amount))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <dl className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
          <Detail label="Direction" value={isIn ? 'Money in' : 'Payout to your M-Pesa'} />
          <Detail label="Status" value={<StatusBadge status={e.status} />} />
          <Detail label="Schedule" value={e.schedule} />
          <Detail label="Date" value={`${formatDateLong(e.when)} · ${formatTime12(new Date(e.when).toTimeString().slice(0, 5))}`} />
          <Detail label="Reference" value={e.reference || '—'} />
        </dl>
      </div>
    </div>,
    document.body,
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-[11px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-xs font-semibold text-ink">{value}</dd>
    </div>
  )
}
