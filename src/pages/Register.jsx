import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner, GoogleButton, OrDivider } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usingMockBackend } from '../lib/api.js'
import { isEmptyAuthSubmit, readAuthFields } from '../lib/authForm.js'

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
    const values = readAuthFields(e.currentTarget, form)
    if (isEmptyAuthSubmit(values, 'register')) return

    setError('')
    if (!values.name) return setError('Tell us your first name.')
    if (!EMAIL_RE.test(values.email)) return setError('Enter a valid email address.')
    if (values.password.length < 6) return setError('Password must be at least 6 characters.')
    if (values.password !== values.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const res = await register({ name: values.name, email: values.email, password: values.password })
      if (res?.needsEmailConfirm) {
        setSentTo(res.email || values.email)
        setBusy(false)
        return
      }
      navigate('/app')
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const updateField = (key) => (e) => {
    setError('')
    setForm({ ...form, [key]: e.target.value })
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
        subtitle="Check your inbox for the link."
        footer={
          <button
            type="button"
            className="font-semibold text-brand-600"
            onClick={() => {
              setSentTo('')
              setResent(false)
            }}
          >
            ← Start over
          </button>
        }
      >
        <Alert kind="success">
          Link sent to <strong>{sentTo}</strong>. Open it to verify, then add your M-Pesa number.
        </Alert>
        {error && (
          <div className="mt-2">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <button type="button" className="btn-primary mt-3 w-full" onClick={resend} disabled={busy || resent}>
          {busy ? <Spinner /> : resent ? 'Email sent' : 'Resend email'}
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create account"
      footer={
        <div className="space-y-3">
          <span>
            Have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600">
              Log in
            </Link>
          </span>
          <p className="text-[10px] leading-snug text-ink-muted">
            By signing up you agree to our{' '}
            <Link to="/terms" className="font-semibold text-brand-600">
              Terms
            </Link>{' '}
            &{' '}
            <Link to="/privacy" className="font-semibold text-brand-600">
              Privacy
            </Link>
            .
          </p>
        </div>
      }
    >
      {!usingMockBackend && (
        <div>
          <GoogleButton onClick={google} disabled={busy} label="Sign up with Google" />
          <OrDivider dense />
        </div>
      )}

      <form onSubmit={submit}>
        {error && (
          <div className="mb-2">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <Field label="First name" icon="user" dense>
          <input
            className="field"
            name="name"
            placeholder="Jane"
            value={form.name}
            onChange={updateField('name')}
            autoComplete="given-name"
            required
          />
        </Field>
        <Field label="Email" icon="mail" dense>
          <input
            className="field"
            type="email"
            name="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={updateField('email')}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" icon="lock" dense>
          <input
            className="field"
            type="password"
            name="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
        <Field label="Confirm" icon="lock" dense>
          <input
            className="field"
            type="password"
            name="confirm"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={updateField('confirm')}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>
        <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={busy}>
          {busy ? (
            <Spinner />
          ) : (
            <>
              <Icon name="signUp" size={24} />
              Create account
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}
