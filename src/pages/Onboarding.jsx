import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Onboarding() {
  const { user, sendOtp, verifyOtp, logout } = useAuth()
  const navigate = useNavigate()
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
      navigate('/app', { replace: true })
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

  const greeting = user?.name && user.name !== 'Pytif user' ? `, ${user.name.split(' ')[0]}` : ''

  if (step === 'otp') {
    return (
      <AuthShell
        title="Confirm your number"
        subtitle={`We sent a 6-digit code to ${mpesaNumber}.`}
        footer={
          <button onClick={() => setStep('number')} className="font-semibold text-brand-600">
            ← Use a different number
          </button>
        }
      >
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
          <Field label="Verification code">
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
            {busy ? <Spinner /> : 'Confirm & finish'}
          </button>
          <button type="button" onClick={resend} disabled={busy} className="mt-3 w-full text-sm font-medium text-brand-600">
            Resend code
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title={`Welcome${greeting}`}
      subtitle="Add the Mpesa number where Pytif should send your money. We'll confirm it with a code."
      footer={
        <button
          onClick={async () => {
            await logout()
            navigate('/login')
          }}
          className="font-semibold text-brand-600"
        >
          Use a different account
        </button>
      }
    >
      <form onSubmit={requestCode}>
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        {user?.email && (
          <div className="mb-4">
            <Alert kind="success">Signed in as {user.email}</Alert>
          </div>
        )}
        <Field label="Mpesa number" hint="This is where your scheduled sends are paid out.">
          <input
            className="field"
            inputMode="numeric"
            placeholder="0712 345 678"
            value={mpesaNumber}
            onChange={(e) => setMpesaNumber(e.target.value)}
          />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Send confirmation code'}
        </button>
      </form>
    </AuthShell>
  )
}
