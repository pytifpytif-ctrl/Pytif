import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, EmptyState } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { MiniBars } from '../components/charts.jsx'
import { formatKes } from '../lib/format.js'

/** Sum `amount` per calendar day, ascending, keeping the most recent `limit` days. */
function groupByDay(items, dateField, limit = 12) {
  const map = {}
  for (const it of items) {
    const day = String(it[dateField]).slice(0, 10)
    map[day] = (map[day] || 0) + (Number(it.amount) || 0)
  }
  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-limit)
    .map(([day, total]) => ({ day, total }))
}

function dayLabel(day) {
  const d = new Date(day)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function Analytics() {
  const { mask } = useBalance()
  const [deposits, setDeposits] = useState([])
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

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

  const sendSeries = useMemo(() => groupByDay(txns, 'scheduled_for'), [txns])
  const inSeries = useMemo(() => groupByDay(deposits, 'created_at'), [deposits])

  const sendBars = sendSeries.map((s) => ({ label: dayLabel(s.day), value: s.total }))
  const inBars = inSeries.map((s) => ({ label: dayLabel(s.day), value: s.total }))

  const sendTotal = txns.reduce((s, t) => s + (Number(t.amount) || 0), 0)
  const inTotal = deposits.reduce((s, d) => s + (Number(d.amount) || 0), 0)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const empty = txns.length === 0 && deposits.length === 0

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <ScreenHeader title="Analytics" subtitle="Money flowing through your wallet" back="/app" />

      {empty ? (
        <EmptyState icon="analytics" title="No data yet" subtitle="Lock your first schedule to start seeing trends." />
      ) : (
        <div className="space-y-5">
          <ChartCard
            icon="arrowUpRight"
            tone="orange"
            title="To be sent to me"
            subtitle="Total payout amount per day"
            total={mask(formatKes(sendTotal))}
            bars={sendBars}
          />
          <ChartCard
            icon="arrowDownLeft"
            tone="accent"
            title="Money in"
            subtitle="Total locked into your wallet per day"
            total={mask(formatKes(inTotal))}
            bars={inBars}
          />
        </div>
      )}
    </div>
  )
}

function ChartCard({ icon, tone, title, subtitle, total, bars }) {
  const toneCls =
    tone === 'accent'
      ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
      : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneCls}`}>
            <Icon name={icon} size={18} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">{title}</h2>
            <p className="text-xs text-ink-muted">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-bold text-ink">{total}</span>
      </div>
      {bars.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No data in range.</p>
      ) : (
        <MiniBars data={bars} height={150} />
      )}
    </section>
  )
}
