import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { ScreenHeader, Spinner, StatusBadge, EmptyState, ThemeToggle } from '../components/ui.jsx'
import { formatKes, formatTime12, formatDateShort } from '../lib/format.js'

const STATUS_FILTERS = ['ALL', 'SUCCESS', 'PENDING', 'FAILED']

export default function History() {
  const [txns, setTxns] = useState([])
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('ALL')
  const [scheduleId, setScheduleId] = useState('ALL')
  const [range, setRange] = useState({ from: '', to: '' })

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([api.listTransactions(), api.listSchedules()])
    setTxns(t)
    setSchedules(s)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useScheduler(load)

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (status !== 'ALL' && t.status !== status) return false
      if (scheduleId !== 'ALL' && t.schedule_id !== scheduleId) return false
      const day = t.scheduled_for.slice(0, 10)
      if (range.from && day < range.from) return false
      if (range.to && day > range.to) return false
      return true
    })
  }, [txns, status, scheduleId, range])

  const grouped = useMemo(() => {
    const map = {}
    for (const t of filtered) {
      const day = t.scheduled_for.slice(0, 10)
      ;(map[day] = map[day] || []).push(t)
    }
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const sentTotal = filtered
    .filter((t) => t.status === 'SUCCESS')
    .reduce((sum, t) => sum + t.amount, 0)

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
        title="Transaction history"
        subtitle={`${formatKes(sentTotal)} sent · ${filtered.length} records`}
        right={<ThemeToggle />}
      />

      {/* Status filter chips */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`chip press whitespace-nowrap px-4 py-2 ${
              status === s ? 'bg-brand-600 text-white' : 'border border-line bg-surface text-ink-soft shadow-card'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Schedule + date filters */}
      <div className="card mb-5 space-y-3 p-4 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
        <select className="field py-2.5 sm:flex-1" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          <option value="ALL">All schedules</option>
          {schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 sm:flex-1">
          <input
            type="date"
            className="field py-2.5"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
          <span className="text-ink-muted">to</span>
          <input
            type="date"
            className="field py-2.5"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </div>
        {(range.from || range.to || scheduleId !== 'ALL' || status !== 'ALL') && (
          <button
            className="text-sm font-medium text-brand-600"
            onClick={() => {
              setRange({ from: '', to: '' })
              setScheduleId('ALL')
              setStatus('ALL')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🧾" title="No transactions yet" subtitle="Your sends will show up here as they fire." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                {formatDateShort(day)}
              </p>
              <div className="card divide-y divide-line">
                {list.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 transition-colors hover:bg-surface-soft">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {formatTime12(new Date(t.scheduled_for).toTimeString().slice(0, 5))} · {t.schedule_name}
                      </p>
                      <p className="text-xs text-ink-muted">{t.label || 'Send'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink">{formatKes(t.amount)}</p>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
