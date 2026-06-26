import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Alert, Spinner } from '../components/ui.jsx'
import PinPad from '../components/PinPad.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../lib/api.js'
import { isValidPin, markUnlocked, setPasscode } from '../lib/appPasscode.js'

export default function ResetPasscode() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [pending, setPending] = useState('')
  const [pinError, setPinError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) {
        setError('Missing reset link. Request a new one from the app.')
        setChecking(false)
        return
      }
      try {
        await api.verifyPasscodeResetToken({ token })
        if (!cancelled) {
          setValid(true)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Invalid reset link.')
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const handlePin = async (pin) => {
    if (!isValidPin(pin)) return

    if (step === 0) {
      setPending(pin)
      setStep(1)
      setPinError('')
      return
    }

    if (pin !== pending) {
      setPinError('Passcodes do not match. Start again.')
      setStep(0)
      setPending('')
      return
    }

    setBusy(true)
    setPinError('')
    try {
      await setPasscode(user.id, pin)
      await api.completePasscodeReset({ token })
      markUnlocked(user.id)
      setDone(true)
      setTimeout(() => navigate('/app', { replace: true }), 1200)
    } catch (err) {
      setPinError(err.message || 'Could not save passcode.')
    } finally {
      setBusy(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-600">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!valid) {
    return (
      <AuthShell
        title="Reset passcode"
        subtitle="This link is not valid anymore."
        footer={
          <Link to="/app/profile" className="font-semibold text-brand-600">
            ← Back to profile
          </Link>
        }
      >
        <Alert kind="error">{error || 'Invalid or expired link.'}</Alert>
        <p className="mt-4 text-sm text-ink-muted">
          Open Profile → Security and tap <strong>Forgot passcode?</strong> to get a new email.
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Passcode updated" subtitle="You're all set.">
        <Alert kind="success">New passcode saved. Taking you in…</Alert>
      </AuthShell>
    )
  }

  const labels = ['Create new passcode', 'Confirm new passcode']
  const hints = ['Choose 4 digits only you know.', 'Enter the same 4 digits again to save it.']

  return (
    <AuthShell
      title="New app passcode"
      subtitle={`Step ${step + 1} of 2`}
      footer={
        <Link to="/app/profile" className="font-semibold text-brand-600">
          ← Cancel
        </Link>
      }
    >
      <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === step ? 'w-7 bg-orange-500' : i < step ? 'w-3 bg-orange-500/40' : 'w-3 bg-line'
            }`}
          />
        ))}
      </div>
      <div className="mb-6 text-center">
        <p className="text-sm font-semibold text-ink">{labels[step]}</p>
        <p className="mt-1 text-xs text-ink-muted">{hints[step]}</p>
      </div>
      <div className="flex justify-center">
        <PinPad compact hideLabel resetKey={step} onComplete={handlePin} error={pinError} disabled={busy} />
      </div>
      <p className="mt-4 text-center text-[11px] text-ink-muted">Auto-saves after 4 digits on step 2.</p>
    </AuthShell>
  )
}
