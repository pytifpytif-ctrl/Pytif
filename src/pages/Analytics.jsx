import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useScheduler } from '../hooks/useScheduler.js'
import { useBalance } from '../context/BalanceContext.jsx'
import { ScreenHeader, Spinner, EmptyState } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { DayChart } from '../components/charts.jsx'
import { formatKes, formatKesPlain } from '../lib/format.js'

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
  const topChromeRef = useRef(null)
  const [topChromeHeight, setTopChromeHeight] = useState(0)

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
  }, [loading])

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
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-2xl flex-1 flex-col overflow-hidden">
      <div
        ref={topChromeRef}
        className="page-top-chrome page-top-chrome-dark z-40 shrink-0 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:px-5 max-lg:pb-3 max-lg:pt-[env(safe-area-inset-top,0px)] lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0 lg:backdrop-blur-none"
      >
        <ScreenHeader embedded inverse title="Analytics" subtitle="Money flowing through your wallet" back="/app" />
      </div>

      <div className="shrink-0 lg:hidden" style={{ height: topChromeHeight || undefined }} aria-hidden />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-3 max-lg:gap-2 max-lg:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:overflow-y-auto lg:scroll-area lg:pb-0 lg:pt-5">
        {empty ? (
          <EmptyState icon="analytics" title="No data yet" subtitle="Lock your first schedule to start seeing trends." />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2 max-lg:overflow-hidden lg:space-y-5">
            <ChartCard
              icon="arrowUpRight"
              tone="orange"
              title="To be sent to me"
              subtitle="Total payout amount per day"
              total={mask(formatKes(sendTotal))}
              data={sendBars}
              mask={mask}
            />
            <ChartCard
              icon="arrowDownLeft"
              tone="accent"
              title="Money in"
              subtitle="Total locked into your wallet per day"
              total={mask(formatKes(inTotal))}
              data={inBars}
              mask={mask}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ChartCard({ icon, tone, title, subtitle, total, data, mask }) {
  const toneCls =
    tone === 'accent'
      ? 'bg-accent-500/12 text-accent-600 dark:text-accent-300'
      : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
  const fmtAxis = (v) => (v === 0 ? '0' : mask(`Ksh ${formatKesPlain(v)}`))

  return (
    <section className="card flex min-h-0 flex-col p-3 max-lg:flex-1 lg:p-5">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 lg:mb-4 lg:gap-3">
        <div className="flex min-w-0 items-center gap-2 lg:gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl lg:h-10 lg:w-10 ${toneCls}`}>
            <Icon name={icon} size={16} className="lg:hidden" />
            <Icon name={icon} size={18} className="hidden lg:block" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-bold text-ink lg:text-sm">{title}</h2>
            <p className="truncate text-[11px] text-ink-muted lg:text-xs">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold text-ink lg:text-sm">{total}</span>
      </div>
      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-sm text-ink-muted">No data in range.</p>
      ) : (
        <div className="min-h-0 flex-1">
          <div className="h-full lg:hidden">
            <DayChart data={data} height={140} tone={tone} formatValue={fmtAxis} fill />
          </div>
          <div className="hidden lg:block">
            <DayChart data={data} height={200} tone={tone} formatValue={fmtAxis} />
          </div>
        </div>
      )}
    </section>
  )
}
