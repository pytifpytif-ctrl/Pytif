import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { api, usingMockBackend } from '../lib/api.js'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request')
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const requestCode = (e) => {
    e.preventDefault()
    setError('')
    if (!/^0\d{9}$/.test(mpesaNumber.replace(/\D/g, ''))) {
      return setError('Enter the number on your account.')
    }
    setStep('reset')
  }

  const reset = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.replace(/\D/g, '').length < 4) return setError('Enter the code we sent you.')
    if (password.length < 6) return setError('New password must be at least 6 characters.')
    setBusy(true)
    try {
      await api.resetPassword({ mpesaNumber, newPassword: password })
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle={step === 'request' ? 'We will text you a reset code.' : 'Enter the code and a new password.'}
      footer={
        <Link to="/login" className="font-semibold text-brand-600">
          ← Back to login
        </Link>
      }
    >
      {step === 'request' ? (
        <form onSubmit={requestCode}>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <Field label="Mpesa number">
            <input
              className="field"
              inputMode="numeric"
              placeholder="0712 345 678"
              value={mpesaNumber}
              onChange={(e) => setMpesaNumber(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn-primary w-full">
            Send reset code
          </button>
        </form>
      ) : (
        <form onSubmit={reset}>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          {usingMockBackend && (
            <div className="mb-4">
              <Alert kind="info">Demo mode: enter any code to reset.</Alert>
            </div>
          )}
          <Field label="Reset code">
            <input
              className="field text-center text-2xl tracking-[0.4em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </Field>
          <Field label="New password">
            <input
              className="field"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Reset password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
