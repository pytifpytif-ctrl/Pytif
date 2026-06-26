import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import EmailSentNotice, { EmailSentActions } from '../components/EmailSentNotice.jsx'
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
      subtitle={sent ? 'Instructions are on the way.' : "We'll email you a secure reset link."}
      footer={
        !sent ? (
          <Link to="/login" className="font-semibold text-brand-600">
            ← Back to login
          </Link>
        ) : null
      }
    >
      {sent ? (
        <div className="space-y-4">
          <EmailSentNotice>
            We&apos;ve sent instructions to <strong>{email}</strong>. Click the link in that email to set a new
            password (link expires in about an hour).
          </EmailSentNotice>
          <EmailSentActions
            backTo="/login"
            backLabel="Back to login"
            onResend={() => {
              setSent(false)
              setError('')
            }}
          />
        </div>
      ) : (
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
