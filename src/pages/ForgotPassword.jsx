import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { api } from '../lib/api.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!EMAIL_RE.test(email.trim())) return setError('Enter the email on your account.')
    setBusy(true)
    try {
      await api.resetPassword({ email })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure link to set a new password."
      footer={
        <Link to="/login" className="font-semibold text-brand-600">
          ← Back to login
        </Link>
      }
    >
      {sent ? (
        <Alert kind="success">
          If an account exists for {email}, a reset link is on its way. Check your inbox (and spam).
        </Alert>
      ) : (
        <form onSubmit={submit}>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <Field label="Email">
            <input
              className="field"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
