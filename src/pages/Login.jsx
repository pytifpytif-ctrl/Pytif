import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { usingMockBackend } from '../lib/api.js'

export default function Login() {
  const { login, seedDemo } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ mpesaNumber: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

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

  const demo = async () => {
    setBusy(true)
    try {
      await seedDemo()
      navigate('/app')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Lock it. Forget it. Get it back on schedule."
      footer={
        <span>
          New to Wastel?{' '}
          <Link to="/register" className="font-semibold text-brand-600">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={submit}>
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
            value={form.mpesaNumber}
            onChange={(e) => setForm({ ...form, mpesaNumber: e.target.value })}
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <input
            className="field"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
          />
        </Field>

        <div className="mb-5 text-right">
          <Link to="/forgot" className="text-sm font-medium text-brand-600">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : 'Log in'}
        </button>
      </form>

      {usingMockBackend && (
        <button onClick={demo} className="btn-ghost mt-3 w-full" disabled={busy}>
          Explore with a demo account
        </button>
      )}
    </AuthShell>
  )
}
