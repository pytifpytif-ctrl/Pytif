import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './icons.jsx'
import PinPad from './PinPad.jsx'
import ForgotPasscodeLink from './ForgotPasscodeLink.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  hasPasscode,
  isValidPin,
  removePasscode,
  setPasscode,
  verifyPasscode,
} from '../lib/appPasscode.js'

export default function AppPasscodeSetup({ userId }) {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(() => hasPasscode(userId))
  const [mode, setMode] = useState(null) // set | change | remove
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!userId) return null

  const reset = () => {
    setMode(null)
    setStep(0)
    setPending('')
    setError('')
    setBusy(false)
  }

  const openMode = (nextMode) => {
    setMode(nextMode)
    setStep(0)
    setPending('')
    setError('')
  }

  const finishSet = async (pin) => {
    setBusy(true)
    setError('')
    try {
      await setPasscode(userId, pin)
      setEnabled(true)
      reset()
    } catch (err) {
      setError(err.message || 'Could not save passcode.')
    } finally {
      setBusy(false)
    }
  }

  const finishRemove = async (pin) => {
    setBusy(true)
    setError('')
    try {
      const ok = await verifyPasscode(userId, pin)
      if (!ok) {
        setError('Wrong passcode.')
        return
      }
      removePasscode(userId)
      setEnabled(false)
      reset()
    } finally {
      setBusy(false)
    }
  }

  const handlePin = async (pin) => {
    if (!isValidPin(pin)) return

    if (mode === 'remove') {
      await finishRemove(pin)
      return
    }

    if (mode === 'set') {
      if (step === 0) {
        setPending(pin)
        setStep(1)
        setError('')
        return
      }
      if (pin !== pending) {
        setError('Passcodes do not match. Start again.')
        setStep(0)
        setPending('')
        return
      }
      await finishSet(pin)
      return
    }

    if (mode === 'change') {
      if (step === 0) {
        setBusy(true)
        const ok = await verifyPasscode(userId, pin)
        setBusy(false)
        if (!ok) {
          setError('Wrong passcode.')
          return
        }
        setStep(1)
        setError('')
        return
      }
      if (step === 1) {
        setPending(pin)
        setStep(2)
        setError('')
        return
      }
      if (pin !== pending) {
        setError('Passcodes do not match. Re-enter your new passcode.')
        setStep(1)
        setPending('')
        return
      }
      await finishSet(pin)
    }
  }

  const labels = {
    set: ['Create your passcode', 'Confirm your passcode'],
    change: ['Enter current passcode', 'Create new passcode', 'Confirm new passcode'],
    remove: ['Enter passcode to turn off'],
  }

  const hints = {
    set: ['Choose 4 digits only you know.', 'Enter the same 4 digits again to save it.'],
    change: ['Verify your current passcode.', 'Pick a new 4-digit passcode.', 'Enter the new passcode one more time.'],
    remove: ['Your app lock will be turned off.'],
  }

  const label = mode ? labels[mode][step] || labels[mode][labels[mode].length - 1] : ''
  const hint = mode ? hints[mode][step] || '' : ''
  const totalSteps = mode ? labels[mode].length : 0

  return (
    <>
      <section className="card p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/12 text-orange-600 dark:text-orange-300">
            <Icon name="shield" size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink">App passcode</h2>
            <p className="text-[11px] leading-snug text-ink-muted">Optional lock when opening the app.</p>
          </div>
        </div>

        {enabled ? (
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-soft px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300">
                  <Icon name="lockClosed" size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">Enabled</p>
                  <p className="text-[10px] text-accent-600 dark:text-accent-300">Asked on app open</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => openMode('change')}
                  className="press rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft hover:text-ink"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => openMode('remove')}
                  className="press rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  Off
                </button>
              </div>
            </div>
            <ForgotPasscodeLink email={user?.email} variant="row" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openMode('set')}
            className="press mt-2.5 w-full rounded-xl border border-dashed border-orange-500/40 bg-orange-500/5 px-3 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-500/10 dark:text-orange-300"
          >
            Set a 4-digit passcode
          </button>
        )}
      </section>

      {mode && (
        <PasscodeModal
          label={label}
          hint={hint}
          step={step}
          totalSteps={totalSteps}
          onClose={reset}
        >
          <PinPad
            compact
            hideLabel
            resetKey={`${mode}-${step}`}
            onComplete={handlePin}
            error={error}
            disabled={busy}
          />
        </PasscodeModal>
      )}
    </>
  )
}

function PasscodeModal({ label, hint, step, totalSteps, onClose, children }) {
  useEffect(() => {
    const onKey = (ev) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-modal-title"
    >
      <div
        className="card mx-auto w-full max-w-[17rem] animate-scale-in p-4 shadow-float"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/12 text-orange-600 dark:text-orange-300">
              <Icon name="lockClosed" size={16} />
            </span>
            <div className="min-w-0">
              <h2 id="passcode-modal-title" className="text-sm font-bold text-ink">
                App passcode
              </h2>
              {totalSteps > 1 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                  Step {step + 1} of {totalSteps}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft"
          >
            Cancel
          </button>
        </div>

        {totalSteps > 1 && (
          <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === step ? 'w-7 bg-orange-500' : i < step ? 'w-3 bg-orange-500/40' : 'w-3 bg-line'
                }`}
              />
            ))}
          </div>
        )}

        <div className="mb-4 text-center">
          <p className="text-sm font-semibold text-ink">{label}</p>
          {hint && <p className="mt-1 text-xs leading-snug text-ink-muted">{hint}</p>}
        </div>

        <div className="flex justify-center">{children}</div>

        <p className="mt-4 text-center text-[11px] text-ink-muted">
          {totalSteps > 1 && step < totalSteps - 1
            ? 'Auto-continues after 4 digits.'
            : 'Auto-saves after 4 digits.'}
        </p>
      </div>
    </div>,
    document.body,
  )
}
