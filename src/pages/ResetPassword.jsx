import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell.jsx'
import { Field, Alert, Spinner } from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

// Reached via the password-reset email link. Supabase puts the user into a
// temporary recovery session, so we can set a new password directly.
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await updatePassword({ newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/app', { replace: true }), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a new password for your account.">
      {done ? (
        <Alert kind="success">Password updated. Taking you in…</Alert>
      ) : (
        <form onSubmit={submit}>
          {error && (
            <div className="mb-4">
              <Alert kind="error">{error}</Alert>
            </div>
          )}
          <Field label="New password">
            <input
              className="field"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <input
              className="field"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner /> : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
