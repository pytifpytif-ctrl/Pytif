import { useState } from 'react'
import { startOfTodayKey, getLocalDayOfWeek, APP_TZ_OFFSET } from '../lib/format.js'
import { toDateKey } from '../lib/schedule.js'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function dateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function firstWeekdayMon0(year, monthIndex) {
  const key = dateKey(year, monthIndex, 1)
  return (getLocalDayOfWeek(`${key}T12:00:00${APP_TZ_OFFSET}`) + 6) % 7
}

/**
 * @param {string[]} selected - YYYY-MM-DD keys
 * @param {(keys:string[]) => void} onChange
 * @param {boolean} multi - allow multiple (custom dates) vs single (end date)
 * @param {Date} minDate
 */
export default function MonthCalendar({ selected = [], onChange, multi = true, minDate }) {
  const todayKey = startOfTodayKey()
  const [ty, tm] = todayKey.split('-').map(Number)
  const [view, setView] = useState(() => ({ year: ty, month: tm - 1 }))

  const year = view.year
  const month = view.month
  const firstDow = firstWeekdayMon0(year, month)
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const minKey = minDate ? toDateKey(minDate) : todayKey

  const cells = []
  for (let i = 0; i < firstDow; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)

  const toggle = (day) => {
    const key = dateKey(year, month, day)
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
          onClick={() => setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }))}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:bg-surface-soft"
        >
          ‹
        </button>
        <p className="font-semibold text-ink">
          {MONTHS[month]} {year}
        </p>
        <button
          type="button"
          onClick={() => setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }))}
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
        {cells.map((day, i) => {
          if (!day) return <span key={i} />
          const key = dateKey(year, month, day)
          const isSelected = selected.includes(key)
          const disabled = key < minKey
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(day)}
              className={`aspect-square rounded-xl text-sm font-medium transition ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-float'
                  : disabled
                    ? 'text-ink-muted/40'
                    : 'text-ink hover:bg-brand-500/10'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
