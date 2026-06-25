import { useEffect, useState } from 'react'
import { formatTime12 } from '../lib/format.js'

function to24(h12, period) {
  if (period === 'AM') return h12 === 12 ? 0 : h12
  return h12 === 12 ? 12 : h12 + 12
}

function from24(time) {
  const [h, m] = String(time || '06:00').split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  const minute = Math.round((m || 0) / 5) * 5
  return { h12, minute: minute === 60 ? 0 : minute, period }
}

function Stepper({ label, display, onUp, onDown }) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      <button
        type="button"
        onClick={onUp}
        className="grid h-10 w-20 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-soft active:scale-95"
        aria-label={`Increase ${label}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="my-1 grid h-16 w-20 place-items-center rounded-2xl bg-brand-500/10 text-3xl font-extrabold tabular-nums text-brand-600 dark:text-brand-300">
        {display}
      </div>
      <button
        type="button"
        onClick={onDown}
        className="grid h-10 w-20 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-soft active:scale-95"
        aria-label={`Decrease ${label}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

export default function TimeWheel({ open, value, onClose, onConfirm }) {
  const [state, setState] = useState(() => from24(value))

  useEffect(() => {
    if (open) setState(from24(value))
  }, [open, value])

  if (!open) return null

  const time24 = `${String(to24(state.h12, state.period)).padStart(2, '0')}:${String(state.minute).padStart(2, '0')}`

  const bumpHour = (dir) =>
    setState((s) => ({ ...s, h12: ((s.h12 - 1 + dir + 12) % 12) + 1 }))
  const bumpMinute = (dir) =>
    setState((s) => ({ ...s, minute: (s.minute + dir * 5 + 60) % 60 }))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md animate-slide-up rounded-t-3xl border border-line bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-surface-soft sm:hidden" />
        <div className="mb-5 text-center">
          <p className="text-sm text-ink-muted">Pick a time</p>
          <p className="text-3xl font-extrabold text-ink">{formatTime12(time24)}</p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Stepper label="Hour" display={state.h12} onUp={() => bumpHour(1)} onDown={() => bumpHour(-1)} />
          <span className="pt-6 text-3xl font-extrabold text-ink-muted">:</span>
          <Stepper
            label="Min"
            display={String(state.minute).padStart(2, '0')}
            onUp={() => bumpMinute(1)}
            onDown={() => bumpMinute(-1)}
          />
          <div className="flex flex-col gap-2 pt-6">
            {['AM', 'PM'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setState((s) => ({ ...s, period: p }))}
                className={`press h-12 w-16 rounded-xl text-base font-bold transition ${
                  state.period === p ? 'bg-brand-600 text-white shadow-float' : 'bg-surface-soft text-ink-soft'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => {
              onConfirm(time24)
              onClose()
            }}
          >
            Set time
          </button>
        </div>
      </div>
    </div>
  )
}
