import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons.jsx'
import { formatKes, formatDateShort, formatTime12 } from '../lib/format.js'

export default function SendSlotPicker({ open, options, value, onClose, onSelect }) {
  useEffect(() => {
    if (!open) return
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const grouped = []
  const seen = new Map()
  for (const o of options) {
    if (!seen.has(o.date)) {
      seen.set(o.date, grouped.length)
      grouped.push({ date: o.date, items: [] })
    }
    grouped[seen.get(o.date)].items.push(o)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-slot-picker-title"
    >
      <div
        className="card mx-auto flex w-full max-w-sm animate-scale-in flex-col overflow-hidden p-3 shadow-float sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-300">
            <Icon name="clock" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="send-slot-picker-title" className="text-sm font-bold leading-tight text-ink">
              Pick upcoming send
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-muted">From your schedule template</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -mr-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="no-scrollbar mt-3 max-h-[min(50vh,280px)] min-h-0 overflow-y-auto border-t border-line pt-2">
          {grouped.map(({ date, items }) => (
            <div key={date} className="mb-2 last:mb-0">
              <p className="px-1 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                {formatDateShort(date)}
              </p>
              <div className="space-y-1">
                {items.map((o) => {
                  const selected = o.key === value
                  return (
                    <button
                      key={o.key}
                      type="button"
                      className={`press flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${
                        selected
                          ? 'border-orange-500/40 bg-orange-500/10'
                          : 'border-line bg-surface-soft hover:border-orange-500/25 hover:bg-orange-500/5'
                      }`}
                      onClick={() => {
                        onSelect(o)
                        onClose()
                      }}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          selected
                            ? 'bg-orange-500 text-white'
                            : 'bg-orange-500/12 text-orange-600 dark:text-orange-300'
                        }`}
                      >
                        <Icon name={selected ? 'check' : 'clock'} size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink">{o.label || 'Send'}</p>
                        <p className="truncate text-[11px] text-ink-muted">{formatTime12(o.send_time)}</p>
                      </div>
                      <p className="shrink-0 text-xs font-bold tabular-nums text-ink">{formatKes(o.amount)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
