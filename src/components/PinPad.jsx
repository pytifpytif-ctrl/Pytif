import { useEffect, useState } from 'react'
import { Icon } from './icons.jsx'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

export default function PinPad({
  onComplete,
  error = '',
  disabled = false,
  label = 'Enter passcode',
  compact = false,
  resetKey = 0,
  hideLabel = false,
}) {
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  useEffect(() => {
    setPin('')
  }, [resetKey])

  useEffect(() => {
    if (!error) return
    setShake(true)
    setPin('')
    const t = setTimeout(() => setShake(false), 450)
    return () => clearTimeout(t)
  }, [error])

  const push = (digit) => {
    if (disabled || pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) onComplete?.(next)
  }

  const back = () => {
    if (disabled) return
    setPin((p) => p.slice(0, -1))
  }

  return (
    <div className={`mx-auto w-full ${compact ? 'max-w-[14rem]' : 'max-w-xs'}`}>
      {!compact && !hideLabel && (
        <p className="mb-4 text-center text-sm font-medium text-ink-muted">{label}</p>
      )}
      <div className={`flex justify-center gap-2.5 ${compact ? 'mb-4' : 'mb-6'} ${shake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`rounded-full border-2 transition-all duration-150 ${
              compact ? 'h-2.5 w-2.5' : 'h-3 w-3'
            } ${
              i < pin.length
                ? 'scale-110 border-orange-500 bg-orange-500'
                : 'border-line bg-transparent'
            }`}
          />
        ))}
      </div>
      {error && (
        <p className={`text-center text-xs font-semibold text-rose-500 ${compact ? 'mb-3' : 'mb-4'}`}>{error}</p>
      )}
      <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2.5'}`}>
        {KEYS.map((key, idx) => {
          if (key === '') return <span key={`sp-${idx}`} />
          if (key === 'back') {
            return (
              <button
                key="back"
                type="button"
                disabled={disabled || pin.length === 0}
                onClick={back}
                className={`press grid place-items-center rounded-xl bg-surface-soft text-ink-soft transition hover:bg-surface-raised disabled:opacity-30 ${
                  compact ? 'h-11' : 'h-14 rounded-2xl'
                }`}
                aria-label="Delete digit"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 14l-4-4 4-4M5 10h11a4 4 0 0 1 0 8h-1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )
          }
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => push(key)}
              className={`press grid place-items-center border border-line bg-surface font-bold tabular-nums text-ink shadow-card transition hover:border-orange-500/30 hover:bg-surface-soft active:scale-95 disabled:opacity-50 ${
                compact ? 'h-11 rounded-xl text-lg' : 'h-14 rounded-2xl text-xl'
              }`}
            >
              {key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
