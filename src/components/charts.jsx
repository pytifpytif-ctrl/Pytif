import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './icons.jsx'

/** Animated circular progress ring. */
export function Gauge({ value = 0, max = 1, size = 132, stroke = 12, center }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [offset, setOffset] = useState(c)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(c * (1 - pct)))
    return () => cancelAnimationFrame(id)
  }, [c, pct])

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-white/15" strokeWidth={stroke} />
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
            <stop offset="0%" stopColor="#00e0a8" />
            <stop offset="100%" stopColor="#9be8d2" />
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
                className={`w-full max-w-[18px] rounded-md ${active ? 'bg-brand-500' : 'bg-brand-500/25'}`}
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
    brand: 'bg-brand-500/12 text-brand-600 dark:text-brand-300 group-hover:bg-brand-500 group-hover:text-white',
    accent: 'bg-accent-500/12 text-accent-600 dark:text-accent-300 group-hover:bg-accent-500 group-hover:text-white',
    neutral: 'bg-surface-soft text-ink-soft group-hover:bg-ink group-hover:text-app',
  }
  const inner = (
    <span className="group flex flex-col items-center gap-2">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl transition-all duration-200 group-hover:-translate-y-0.5 ${tones[tone]}`}>
        <Icon name={icon} size={20} strokeWidth={2.1} />
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
