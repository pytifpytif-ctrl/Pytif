import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner, GoogleButton, OrDivider } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usingMockBackend } from '../lib/api.js'

export default function Login() {
  const { login, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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
    setBusy(true)
    try {
      await login(form)
      navigate('/app')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your commitment wallet."
      footer={
        <span>
          New to Jiokoe?{' '}
          <Link to="/register" className="font-semibold text-brand-600">
            Create an account
          </Link>
        </span>
      }
    >
      {!usingMockBackend && (
        <div>
          <GoogleButton onClick={google} disabled={busy} />
          <OrDivider dense />
        </div>
      )}

      <form onSubmit={submit}>
        {error && (
          <div className="mb-2">
            <Alert kind="error">{error}</Alert>
          </div>
        )}
        <Field label="Email" icon="mail" dense>
          <input
            className="field"
            type="email"
            placeholder="jane@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
        <Field label="Password" icon="lock" dense>
          <input
            className="field"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
          />
        </Field>

        <div className="mb-2.5 text-right">
          <Link to="/forgot" className="text-xs font-medium text-brand-600">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Log in'}
        </button>
      </form>
    </AuthShell>
  )
}
