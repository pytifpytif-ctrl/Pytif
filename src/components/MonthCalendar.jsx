import { useState } from 'react'
import { toDateKey } from '../lib/schedule.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * @param {string[]} selected - YYYY-MM-DD keys
 * @param {(keys:string[]) => void} onChange
 * @param {boolean} multi - allow multiple (custom dates) vs single (end date)
 * @param {Date} minDate
 */
export default function MonthCalendar({ selected = [], onChange, multi = true, minDate }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const min = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : today

  const cells = []
  for (let i = 0; i < firstDow; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d))

  const toggle = (date) => {
    const key = toDateKey(date)
    if (multi) {
      if (selected.includes(key)) onChange(selected.filter((k) => k !== key))
      else onChange([...selected, key].sort())
    } else {
      onChange([key])
    }
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:bg-surface-soft"
        >
          ‹
        </button>
        <p className="font-semibold text-ink">
          {MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:bg-surface-soft"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-ink-muted">
        {DOW.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const key = toDateKey(date)
          const isSelected = selected.includes(key)
          const disabled = date < min
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(date)}
              className={`aspect-square rounded-xl text-sm font-medium transition ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-float'
                  : disabled
                    ? 'text-ink-muted/40'
                    : 'text-ink hover:bg-brand-500/10'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
