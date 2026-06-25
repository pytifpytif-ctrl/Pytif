import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner, GoogleButton, OrDivider } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usingMockBackend } from '../lib/api.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const { register, resendConfirmation, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [resent, setResent] = useState(false)

  const google = async () => {
    setError('')
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Tell us your first name.')
    if (!EMAIL_RE.test(form.email.trim())) return setError('Enter a valid email address.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const res = await register({ name: form.name, email: form.email, password: form.password })
      if (res?.needsEmailConfirm) {
        setSentTo(res.email || form.email.trim().toLowerCase())
        setBusy(false)
        return
      }
      navigate('/app') // confirmation disabled: straight to onboarding
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const resend = async () => {
    setError('')
    setBusy(true)
    try {
      await resendConfirmation({ email: sentTo })
      setResent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Confirm your email"
        subtitle="One more step before you can log in."
        footer={
          <span>
            Wrong address?{' '}
            <button
              type="button"
              className="font-semibold text-brand-600"
              onClick={() => {
                setSentTo('')
                setResent(false)
              }}
            >
              Start over
            </button>
          </span>
        }
      >
        <Alert kind="success">
          We sent a confirmation link to <strong>{sentTo}</strong>. Open it to verify your email,
          then you'll be taken to add your Mpesa number.
        </Alert>
        {error && (
          <div className="mt-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <p className="mt-5 text-sm text-ink-muted">
          Didn't get it? Check spam, or resend below.
        </p>
        <button
          type="button"
          className="btn-primary w-full mt-3"
          onClick={resend}
          disabled={busy || resent}
        >
          {busy ? <Spinner /> : resent ? 'Email sent' : 'Resend confirmation email'}
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Just your name and email to start. You'll add your Mpesa number next."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600">
            Log in
          </Link>
        </span>
      }
    >
      {!usingMockBackend && (
        <div className="mb-1">
          <GoogleButton onClick={google} disabled={busy} label="Sign up with Google" />
          <OrDivider />
        </div>
      )}

      <form onSubmit={submit}>
        {error && (
          <div className="mb-4">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <Field label="First name" icon="user">
          <input
            className="field"
            placeholder="Jane"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Email" icon="mail">
          <input
            className="field"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" icon="lock">
          <input
            className="field"
            type="password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm password" icon="lock">
          <input
            className="field"
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            autoComplete="new-password"
          />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Create account'}
        </button>
        <p className="mt-3 text-center text-xs text-ink-muted">
          By creating an account you agree to our{' '}
          <Link to="/terms" className="font-semibold text-brand-600">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="font-semibold text-brand-600">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  )
}
