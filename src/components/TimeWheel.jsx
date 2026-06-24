import { useEffect, useRef, useState } from 'react'
import { formatTime12 } from '../lib/format.js'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)
const PERIODS = ['AM', 'PM']

function to24(h12, period) {
  if (period === 'AM') return h12 === 12 ? 0 : h12
  return h12 === 12 ? 12 : h12 + 12
}

function from24(time) {
  const [h, m] = String(time || '06:00').split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  // snap minute to nearest 5
  const minute = Math.round(m / 5) * 5
  return { h12, minute: minute === 60 ? 55 : minute, period }
}

/** A tap-and-scroll wheel column. */
function Wheel({ items, value, render, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current?.querySelector('[data-active="true"]')
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [value])

  return (
    <div
      ref={ref}
      className="h-40 flex-1 snap-y snap-mandatory overflow-y-auto scroll-smooth py-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = item === value
        return (
          <button
            key={item}
            type="button"
            data-active={active}
            onClick={() => onChange(item)}
            className={`flex h-10 w-full snap-center items-center justify-center text-lg transition ${
              active ? 'font-bold text-brand-600' : 'font-medium text-slate-400'
            }`}
          >
            {render ? render(item) : item}
          </button>
        )
      })}
    </div>
  )
}

export default function TimeWheel({ open, value, onClose, onConfirm }) {
  const [state, setState] = useState(() => from24(value))

  useEffect(() => {
    if (open) setState(from24(value))
  }, [open, value])

  if (!open) return null

  const time24 = `${String(to24(state.h12, state.period)).padStart(2, '0')}:${String(
    state.minute,
  ).padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md animate-fade-in rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-2 text-center">
          <p className="text-sm text-ink-muted">Pick a time</p>
          <p className="text-2xl font-extrabold text-ink">{formatTime12(time24)}</p>
        </div>

        <div className="relative flex items-stretch gap-1">
          <div className="pointer-events-none absolute inset-x-3 top-1/2 -mt-5 h-10 rounded-xl bg-brand-50" />
          <Wheel
            items={HOURS}
            value={state.h12}
            onChange={(h12) => setState((s) => ({ ...s, h12 }))}
          />
          <Wheel
            items={MINUTES}
            value={state.minute}
            render={(m) => String(m).padStart(2, '0')}
            onChange={(minute) => setState((s) => ({ ...s, minute }))}
          />
          <Wheel
            items={PERIODS}
            value={state.period}
            onChange={(period) => setState((s) => ({ ...s, period }))}
          />
        </div>

        <div className="mt-4 flex gap-3">
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
