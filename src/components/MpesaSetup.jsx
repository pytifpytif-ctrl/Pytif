import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Field, Alert, Spinner } from './ui.jsx'

/**
 * Embeddable M-Pesa number + OTP verification flow.
 * Calls onDone() after the number is verified.
 */
export default function MpesaSetup({ onDone, onCancel }) {
  const { sendOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState('number')
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const requestCode = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^0\d{9}$/.test(mpesaNumber.replace(/\D/g, ''))) {
      return setError('Enter a valid Safaricom number, e.g. 0712345678')
    }
    setBusy(true)
    try {
      const res = await sendOtp({ mpesaNumber })
      setDevCode(res?.devCode || '')
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (e) => {
    e.preventDefault()
    setError('')
    if (code.replace(/\D/g, '').length !== 6) return setError('Enter the 6-digit code.')
    setBusy(true)
    try {
      await verifyOtp({ mpesaNumber, code })
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    setCode('')
    setBusy(true)
    try {
      const res = await sendOtp({ mpesaNumber })
      setDevCode(res?.devCode || '')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (step === 'otp') {
    return (
      <form onSubmit={confirm}>
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        {devCode && (
          <div className="mb-4">
            <Alert kind="info">Dev mode (no SMS provider): your code is {devCode}.</Alert>
          </div>
        )}
        <Field label={`Enter the 6-digit code sent to ${mpesaNumber}`}>
          <input
            className="field text-center text-2xl tracking-[0.5em]"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Confirm number'}
        </button>
        <div className="mt-3 flex items-center justify-between text-sm">
          <button type="button" onClick={() => setStep('number')} className="font-medium text-ink-muted">
            Change number
          </button>
          <button type="button" onClick={resend} disabled={busy} className="font-medium text-brand-600 dark:text-brand-300">
            Resend code
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={requestCode}>
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <Field label="M-Pesa number" icon="phone" hint="This is where your scheduled sends are paid out.">
        <input
          className="field"
          inputMode="numeric"
          placeholder="0712 345 678"
          value={mpesaNumber}
          onChange={(e) => setMpesaNumber(e.target.value)}
        />
      </Field>
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost flex-1">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? <Spinner /> : 'Send confirmation code'}
        </button>
      </div>
    </form>
  )
}
