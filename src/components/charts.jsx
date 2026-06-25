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
    violet: 'bg-violet-500',
    sky: 'bg-sky-500',
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
