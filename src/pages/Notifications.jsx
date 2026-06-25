import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, StatusBadge, EmptyState } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { formatKes, formatDateShort, formatDateLong, formatTime12 } from '../lib/format.js'

const READ_KEY = 'pytif-notifs-read'

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
  const [deposits, setDeposits] = useState([])
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [readIds, setReadIds] = useState(loadReadIds)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([api.listDeposits(), api.listTransactions()])
    setDeposits(d)
    setTxns(t)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useScheduler(load)

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
    const inEvents = deposits.map((d) => ({
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
    const outEvents = txns.map((t) => ({
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

  const totalIn = deposits.filter((d) => d.status === 'CONFIRMED').reduce((s, d) => s + d.amount, 0)
  const totalOut = txns.filter((t) => t.status === 'SUCCESS').reduce((s, t) => s + t.amount, 0)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <ScreenHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        back="/app"
        right={
          unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="press rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-card transition-colors hover:text-ink"
            >
              Mark all read
            </button>
          ) : null
        }
      />

      {/* In / out summary */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
            <Icon name="arrowDownLeft" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">Total in</p>
            <p className="truncate text-base font-bold text-ink">{mask(formatKes(totalIn))}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-300">
            <Icon name="arrowUpRight" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">Total paid out</p>
            <p className="truncate text-base font-bold text-ink">{mask(formatKes(totalOut))}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip press px-4 py-2 ${
              filter === f.id ? 'bg-orange-500 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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

      {selected && <DetailModal e={selected} mask={mask} onClose={() => setSelected(null)} />}
    </div>
  )
}

function EventRow({ e, mask, unread, onClick }) {
  const isIn = e.kind === 'IN'
  const time = formatTime12(new Date(e.when).toTimeString().slice(0, 5))
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-soft ${
        unread ? 'bg-orange-500/[0.04]' : ''
      }`}
    >
      <span
        className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full ${
          isIn
            ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
            : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
        }`}
      >
        <Icon name={isIn ? 'arrowDownLeft' : 'arrowUpRight'} size={19} />
        {unread && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-orange-500" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm text-ink ${unread ? 'font-bold' : 'font-semibold'}`}>{e.title}</p>
        <p className="truncate text-xs text-ink-muted">
          {time} · {e.detail}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-ink">{mask(formatKes(e.amount))}</p>
        <StatusBadge status={e.status} />
      </div>
    </button>
  )
}

function DetailModal({ e, mask, onClose }) {
  const isIn = e.kind === 'IN'

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div className="card w-full max-w-sm animate-scale-in p-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-start justify-between">
          <span
            className={`grid h-12 w-12 place-items-center rounded-2xl ${
              isIn
                ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
                : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
            }`}
          >
            <Icon name={isIn ? 'arrowDownLeft' : 'arrowUpRight'} size={24} />
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="press grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <h2 className="mt-4 text-lg font-extrabold text-ink">{e.title}</h2>
        <p className="text-2xl font-extrabold tracking-tight text-ink">{mask(formatKes(e.amount))}</p>

        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
          <Detail label="Direction" value={isIn ? 'Money in' : 'Payout to your M-Pesa'} />
          <Detail label="Status" value={<StatusBadge status={e.status} />} />
          <Detail label="Schedule" value={e.schedule} />
          <Detail label="Date" value={`${formatDateLong(e.when)} · ${formatTime12(new Date(e.when).toTimeString().slice(0, 5))}`} />
          <Detail label="Reference" value={e.reference || '—'} />
        </dl>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right font-semibold text-ink">{value}</dd>
    </div>
  )
}
