import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { maskEmail } from '../lib/format.js'
import { Icon } from './icons.jsx'
import { Spinner } from './ui.jsx'
import EmailSentNotice from './EmailSentNotice.jsx'

function resetLinkPath(devResetUrl) {
  try {
    const token = new URL(devResetUrl, window.location.origin).searchParams.get('token')
    return token ? `/reset-passcode?token=${token}` : devResetUrl
  } catch {
    return devResetUrl
  }
}

function DevResetLink({ devResetUrl, className = '' }) {
  if (!devResetUrl) return null
  return (
    <Link
      to={resetLinkPath(devResetUrl)}
      className={`inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400 ${className}`}
    >
      Open reset link
      <Icon name="arrowRight" size={12} />
    </Link>
  )
}

export default function ForgotPasscodeLink({ email, className = '', variant = 'link' }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')
  const [emailed, setEmailed] = useState(true)

  const send = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await api.requestPasscodeReset()
      setSent(true)
      setEmailed(res?.emailed !== false)
      if (res?.devResetUrl) setDevResetUrl(res.devResetUrl)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setBusy(false)
    }
  }

  if (!email) return null

  if (sent) {
    if (variant === 'row') {
      return (
        <div className={className}>
          <EmailSentNotice compact>
            {emailed ? (
              <>
                We sent a reset link to <strong>{maskEmail(email)}</strong>. Open it on this device, then set a new
                passcode.
              </>
            ) : (
              <>Email is not configured yet. Use the link below on this device.</>
            )}
          </EmailSentNotice>
          {devResetUrl && <DevResetLink devResetUrl={devResetUrl} className="mt-2 text-[11px]" />}
        </div>
      )
    }

    return (
      <div className={`animate-fade-in ${className}`}>
        <EmailSentNotice>
          {emailed ? (
            <>
              We sent a reset link to <strong>{maskEmail(email)}</strong>. Open it on this device, then choose a
              new passcode.
            </>
          ) : (
            'Reset link ready. Open it on this device, then choose a new passcode.'
          )}
        </EmailSentNotice>
        {devResetUrl && <DevResetLink devResetUrl={devResetUrl} className="mt-2 text-sm" />}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <div className={className}>
        {error && <p className="mb-2 text-[11px] font-semibold text-rose-500">{error}</p>}
        <button
          type="button"
          onClick={send}
          disabled={busy}
          className="press flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-soft px-3 py-2.5 text-left transition-colors hover:border-orange-500/30 hover:bg-orange-500/5 disabled:opacity-50"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-300">
            {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="mail" size={14} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink">Forgot passcode?</p>
            <p className="text-[10px] text-ink-muted">Send a reset link to your email</p>
          </div>
          {!busy && <Icon name="arrowRight" size={15} className="shrink-0 text-ink-muted" />}
        </button>
      </div>
    )
  }

  return (
    <div className={`text-center ${className}`}>
      {error && <p className="mb-2 text-xs font-semibold text-rose-500">{error}</p>}
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className="text-sm font-semibold text-ink-muted transition hover:text-orange-600 disabled:opacity-50 dark:hover:text-orange-400"
      >
        {busy ? <Spinner className="mx-auto h-4 w-4" /> : 'Forgot passcode?'}
      </button>
    </div>
  )
}
