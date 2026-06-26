import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Field, Alert, Spinner } from './ui.jsx'

function normalizeInput(num) {
  let digits = String(num || '').replace(/\D/g, '')
  if (digits.startsWith('254')) digits = '0' + digits.slice(3)
  if (digits.length === 9 && digits.startsWith('7')) digits = '0' + digits
  return digits
}

/**
 * M-Pesa payout number — enter twice to confirm, then save.
 */
export default function MpesaSetup({ onDone, onCancel }) {
  const { confirmMpesaNumber } = useAuth()
  const [mpesaNumber, setMpesaNumber] = useState('')
  const [confirmNumber, setConfirmNumber] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const phone = normalizeInput(mpesaNumber)
    const confirm = normalizeInput(confirmNumber)
    if (!/^0\d{9}$/.test(phone)) {
      return setError('Enter a valid Safaricom number, e.g. 0712345678')
    }
    if (phone !== confirm) {
      return setError('Numbers do not match. Check both fields and try again.')
    }
    setBusy(true)
    try {
      await confirmMpesaNumber({ mpesaNumber: phone, confirmMpesaNumber: confirm })
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
      <Field label="M-Pesa number" icon="phone" hint="Where your scheduled sends are paid out.">
        <input
          className="field"
          inputMode="numeric"
          placeholder="0712 345 678"
          value={mpesaNumber}
          onChange={(e) => setMpesaNumber(e.target.value)}
          autoComplete="tel"
        />
      </Field>
      <Field label="Confirm M-Pesa number" icon="phone" hint="Enter the same number again.">
        <input
          className="field"
          inputMode="numeric"
          placeholder="0712 345 678"
          value={confirmNumber}
          onChange={(e) => setConfirmNumber(e.target.value)}
          autoComplete="tel"
        />
      </Field>
      <div className="flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="press shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-soft"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="press inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? <Spinner className="h-4 w-4" /> : 'Save number'}
        </button>
      </div>
    </form>
  )
}
