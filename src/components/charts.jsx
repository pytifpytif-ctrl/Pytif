import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons.jsx'

/** Animated circular progress ring. */
export function Gauge({ value = 0, max = 1, size = 132, stroke = 11, center }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [offset, setOffset] = useState(c)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c * (1 - pct)))
    return () => cancelAnimationFrame(id)
  }, [c, pct])

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-black/15" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  )
}

/** Animated vertical bar chart. data: [{ label, value }]. */
export function MiniBars({ data = [], height = 120, accentIndex }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="flex items-end justify-between gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const h = grown ? `${(d.value / max) * 100}%` : '2%'
        const active = i === accentIndex
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`w-full max-w-[18px] rounded-md ${active ? 'bg-orange-500' : 'bg-orange-500/20'}`}
                style={{ height: h, transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className={`text-[10px] font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Sun–Sat weekly activity: one stacked bar per day (green = money in, orange = money out).
 * Current day uses full colour; other days are muted.
 */
export function WeeklyActivityBars({
  data = [],
  height = 100,
  formatAmount = (v) => String(v),
}) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [data])

  const maxTotal = Math.max(1, ...data.map((d) => d.moneyIn + d.moneyOut))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-ink-muted lg:text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden />
          Money in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-orange-500" aria-hidden />
          Money out
        </span>
      </div>
      <div className="flex items-end justify-between gap-1 lg:gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const total = d.moneyIn + d.moneyOut
          const barHeightPct = grown ? (total / maxTotal) * 100 : 2
          const outShare = total > 0 ? (d.moneyOut / total) * 100 : 0
          const inShare = total > 0 ? (d.moneyIn / total) * 100 : 0
          const empty = total === 0
          const tip = empty
            ? `${d.label}: no activity`
            : `${d.label}: in ${formatAmount(d.moneyIn)}, out ${formatAmount(d.moneyOut)}`

          return (
            <div key={d.dayKey} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex w-full flex-1 items-end justify-center" title={tip}>
                {empty ? (
                  <div
                    className={`w-full max-w-[22px] rounded-md ${d.isToday ? 'bg-zinc-300/50 dark:bg-zinc-600/50' : 'bg-zinc-200/60 dark:bg-zinc-700/40'}`}
                    style={{
                      height: '6%',
                      transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms`,
                    }}
                  />
                ) : (
                  <div
                    className="flex w-full max-w-[22px] flex-col justify-end overflow-hidden rounded-md"
                    style={{
                      height: `${Math.max(barHeightPct, 4)}%`,
                      transition: `height 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 50}ms`,
                    }}
                  >
                    {d.moneyIn > 0 && (
                      <div
                        className={`w-full ${d.isToday ? 'bg-emerald-500' : 'bg-emerald-500/25'}`}
                        style={{ height: `${inShare}%`, minHeight: inShare > 0 ? 2 : 0 }}
                      />
                    )}
                    {d.moneyOut > 0 && (
                      <div
                        className={`w-full ${d.isToday ? 'bg-orange-500' : 'bg-orange-500/25'}`}
                        style={{ height: `${outShare}%`, minHeight: outShare > 0 ? 2 : 0 }}
                      />
                    )}
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-medium lg:text-[11px] ${
                  d.isToday ? 'font-bold text-ink' : 'text-ink-muted'
                }`}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Line + area chart with axes. data: [{ label, value }], tone: 'orange' | 'accent'. */
export function DayChart({
  data = [],
  height = 200,
  tone = 'orange',
  formatValue = (v) => String(v),
  formatTip = null,
  fill = false,
  verticalXLabels = false,
  maxXLabels = null,
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [data])

  const colors =
    tone === 'accent'
      ? { stroke: '#00c896', fill: 'rgba(0,200,150,0.18)', dot: '#00a87e' }
      : { stroke: '#f97316', fill: 'rgba(249,115,22,0.18)', dot: '#ea580c' }

  const tip = formatTip || formatValue
  const maxVal = Math.max(1, ...data.map((d) => d.value))
  const yMax = niceCeil(maxVal)
  const ticks = [0, yMax / 2, yMax].map((v) => Math.round(v))
  const yLabels = ticks.map(formatValue)
  const maxYLabelLen = Math.max(...yLabels.map((s) => String(s).length), 1)

  const xLabelIndices = pickXLabelIndices(data.length, maxXLabels)

  const w = 320
  const h = height
  const pad = {
    t: 12,
    r: 12,
    b: verticalXLabels ? 48 : 26,
    l: Math.max(36, maxYLabelLen * 7 + 8),
  }
  const plotW = w - pad.l - pad.r
  const plotH = h - pad.t - pad.b

  const n = data.length
  const xAt = (i) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const yAt = (v) => pad.t + plotH - (v / yMax) * plotH

  const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.value), ...d }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${pad.t + plotH} L ${points[0].x} ${pad.t + plotH} Z`
      : ''

  const axisText = {
    fontSize: verticalXLabels ? 10 : 11,
    fontWeight: 500,
    fontFamily: 'inherit',
  }

  const xLabelY = h - 10

  return (
    <div className={fill ? 'h-full min-h-[72px] w-full' : 'w-full'} style={fill ? undefined : { height: h + 4 }}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {ticks.map((tick) => {
          const y = yAt(tick)
          return (
            <g key={tick}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="currentColor" className="text-line" strokeWidth="1" />
              <text
                x={pad.l - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-ink-muted"
                style={axisText}
              >
                {formatValue(tick)}
              </text>
            </g>
          )
        })}

        {areaPath && (
          <path
            d={areaPath}
            fill={colors.fill}
            style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease' }}
          />
        )}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: ready ? 'none' : '1000',
              strokeDashoffset: ready ? 0 : 1000,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        )}

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={ready ? 4 : 0}
              fill={colors.dot}
              stroke="rgb(var(--surface))"
              strokeWidth="2"
              style={{ transition: `r 0.4s ease ${i * 80}ms` }}
            />
            <title>{`${p.label}: ${tip(p.value)}`}</title>
          </g>
        ))}

        {xLabelIndices.map((i) => {
          const p = points[i]
          if (verticalXLabels) {
            return (
              <text
                key={`x-${i}`}
                x={p.x}
                y={xLabelY}
                textAnchor="end"
                transform={`rotate(-90, ${p.x}, ${xLabelY})`}
                className="fill-ink-muted"
                style={axisText}
              >
                {p.label}
              </text>
            )
          }
          return (
            <text
              key={`x-${i}`}
              x={p.x}
              y={h - 6}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-ink-muted"
              style={axisText}
            >
              {p.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function niceCeil(n) {
  if (n <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(n)))
  const norm = n / mag
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return nice * mag
}

/** Pick evenly spaced x-axis label indices so labels do not crowd on narrow screens. */
function pickXLabelIndices(count, maxLabels) {
  if (count <= 0) return []
  if (!maxLabels || count <= maxLabels) return Array.from({ length: count }, (_, i) => i)

  const step = Math.ceil(count / maxLabels)
  const indices = []
  for (let i = 0; i < count; i += step) indices.push(i)
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1)
  return indices
}

/** Segmented allocation bar. segments: [{ label, value, color }]. */
export function SegmentBar({ segments = [] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-soft">
      {segments.map((s, i) => (
        <div
          key={i}
          className={s.color}
          style={{ width: `${(s.value / total) * 100}%`, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }}
          title={`${s.label}`}
        />
      ))}
    </div>
  )
}

/** Circular quick-action button with a label underneath. */
export function QuickAction({ icon, label, to, onClick, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-600',
    accent: 'bg-accent-500',
    amber: 'bg-amber-500',
    flame: 'bg-orange-500',
  }
  const inner = (
    <span className="group flex flex-col items-center gap-2.5">
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 ${tones[tone] || tones.brand}`}
      >
        <Icon name={icon} size={22} strokeWidth={2.2} />
      </span>
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
    </span>
  )
  return to ? (
    <Link to={to} className="press">
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className="press">
      {inner}
    </button>
  )
}
