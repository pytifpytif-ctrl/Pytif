import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from './icons.jsx'
import { Alert, Spinner } from './ui.jsx'

function normalizeInput(num) {
  let digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254')) digits = '0' + digits.slice(3)
  if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits
  return digits.slice(0, 10)
}

function formatPhoneDisplay(digits) {
  const d = normalizeInput(digits)
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
}

function isValidPhone(digits) {
  return /^0\d{9}$/.test(normalizeInput(digits))
}

/**
 * M-Pesa payout number — enter once, confirm once (passcode-style steps).
 */
export default function MpesaSetup({ onDone, onCancel }) {
  const { confirmMpesaNumber } = useAuth()
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const advanceTimer = useRef(null)

  const labels = ['Enter your M-Pesa number', 'Confirm your M-Pesa number']
  const hints = [
    'Safaricom number where payouts are sent.',
    'Enter the same number again to save it.',
  ]

  const close = useCallback(() => {
    setStep(0)
    setPending('')
    setValue('')
    setError('')
    setBusy(false)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    onCancel?.()
  }, [onCancel])

  const save = async (phone) => {
    setBusy(true)
    setError('')
    try {
      await confirmMpesaNumber({ mpesaNumber: phone, confirmMpesaNumber: phone })
      setStep(0)
      setPending('')
      setValue('')
      setError('')
      setBusy(false)
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      onDone?.()
    } catch (err) {
      setError(err.message)
      setStep(0)
      setPending('')
      setValue('')
    } finally {
      setBusy(false)
    }
  }

  const tryAdvance = (digits, fromStep) => {
    if (!isValidPhone(digits)) return
    if (fromStep === 0) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => {
        setPending(normalizeInput(digits))
        setValue('')
        setStep(1)
        setError('')
      }, 280)
      return
    }
    if (fromStep === 1) {
      const confirm = normalizeInput(digits)
      if (confirm !== pending) {
        setError('Numbers do not match. Start again.')
        setStep(0)
        setPending('')
        setValue('')
        return
      }
      save(confirm)
    }
  }

  const onInput = (raw) => {
    const digits = normalizeInput(raw)
    setValue(digits)
    setError('')
    tryAdvance(digits, step)
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [])

  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [close])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mpesa-modal-title"
    >
      <div
        className="card mx-auto w-full max-w-[19rem] animate-scale-in p-4 shadow-float"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-500/12 text-accent-600 dark:text-accent-300">
              <Icon name="phone" size={16} />
            </span>
            <div className="min-w-0">
              <h2 id="mpesa-modal-title" className="text-sm font-bold text-ink">
                Payout number
              </h2>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                Step {step + 1} of 2
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="press shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft"
          >
            Cancel
          </button>
        </div>

        <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? 'w-7 bg-accent-500' : i < step ? 'w-3 bg-accent-500/40' : 'w-3 bg-line'
              }`}
            />
          ))}
        </div>

        <div className="mb-4 text-center">
          <p className="text-sm font-semibold text-ink">{labels[step]}</p>
          <p className="mt-1 text-xs leading-snug text-ink-muted">{hints[step]}</p>
        </div>

        {error && (
          <div className="mb-3">
            <Alert kind="error">{error}</Alert>
          </div>
        )}

        <label className="block">
          <span className="sr-only">{labels[step]}</span>
          <div
            className={`relative rounded-2xl border bg-surface-soft transition-colors ${
              error ? 'border-rose-400' : 'border-line focus-within:border-accent-500/50 focus-within:ring-2 focus-within:ring-accent-500/20'
            }`}
          >
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">
              <Icon name="phone" size={18} />
            </span>
            <input
              ref={inputRef}
              className="w-full bg-transparent py-4 pl-12 pr-4 text-center text-xl font-bold tabular-nums tracking-wide text-ink outline-none placeholder:text-ink-muted/40"
              inputMode="numeric"
              autoComplete={step === 0 ? 'tel' : 'off'}
              placeholder="0712 345 678"
              value={formatPhoneDisplay(value)}
              onChange={(e) => onInput(e.target.value)}
              disabled={busy}
            />
          </div>
        </label>

        <div className="mt-3 flex justify-center gap-1" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i < value.length ? 'bg-accent-500' : 'bg-line'
              }`}
            />
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-muted">
          {busy ? (
            <span className="inline-flex items-center gap-1.5">
              <Spinner className="h-3.5 w-3.5" /> Saving…
            </span>
          ) : step === 0 ? (
            'Auto-continues when the number is complete.'
          ) : (
            'Auto-saves when both entries match.'
          )}
        </p>
      </div>
    </div>,
    document.body,
  )
}
