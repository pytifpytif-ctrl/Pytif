import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usingMockBackend } from '../lib/api.js'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('details')
  const [form, setForm] = useState({ name: '', mpesaNumber: '', password: '', confirm: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const goToOtp = (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Tell us your name.')
    if (!/^0\d{9}$/.test(form.mpesaNumber.replace(/\D/g, ''))) {
      return setError('Enter a valid Safaricom number, e.g. 0712345678')
    }
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setStep('otp')
  }

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.replace(/\D/g, '').length < 4) return setError('Enter the 6-digit code we sent you.')
    setBusy(true)
    try {
      await register({
        name: form.name,
        mpesaNumber: form.mpesaNumber,
        password: form.password,
      })
      navigate('/app')
    } catch (err) {
      setError(err.message)
      setStep('details')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'otp') {
    return (
      <AuthShell
        title="Verify your number"
        subtitle={`We sent a 6-digit code to ${form.mpesaNumber}.`}
        footer={
          <button onClick={() => setStep('details')} className="font-semibold text-brand-600">
            ← Edit details
          </button>
        }
      >
        <form onSubmit={verify}>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          {usingMockBackend && (
            <div className="mb-4">
              <Alert kind="info">Demo mode: enter any 6 digits to continue.</Alert>
            </div>
          )}
          <Field label="Verification code">
            <input
              className="field text-center text-2xl tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Verify & create account'}
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Commit your money. Get it back exactly when you planned."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Log in
          </Link>
        </span>
      }
    >
      <form onSubmit={goToOtp}>
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <Field label="Full name">
          <input
            className="field"
            placeholder="Jane Wanjiku"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="Mpesa number" hint="This is your login and where money is sent back.">
          <input
            className="field"
            inputMode="numeric"
            placeholder="0712 345 678"
            value={form.mpesaNumber}
            onChange={(e) => setForm({ ...form, mpesaNumber: e.target.value })}
          />
        </Field>
        <Field label="Password">
          <input
            className="field"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="Confirm password">
          <input
            className="field"
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
        <button type="submit" className="btn-primary w-full">
          Continue
        </button>
      </form>
    </AuthShell>
  )
}
