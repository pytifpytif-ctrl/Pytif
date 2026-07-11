import { useEffect, useState } from 'react'
import { Icon } from './icons.jsx'
import {
  authenticateWithBiometric,
  biometricLabel,
  checkBiometricHardware,
  isBiometricEnabled,
  isBiometricSupportedPlatform,
  setBiometricEnabled,
} from '../lib/biometrics.js'
import { hasPasscode } from '../lib/appPasscode.js'

export default function BiometricSetup({ userId }) {
  const [hardware, setHardware] = useState(null)
  const [enabled, setEnabled] = useState(() => isBiometricEnabled(userId))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const passcodeOn = hasPasscode(userId)
  const native = isBiometricSupportedPlatform()

  useEffect(() => {
    if (!native || !userId) return undefined
    let cancelled = false
    checkBiometricHardware().then((result) => {
      if (!cancelled) setHardware(result)
    })
    return () => {
      cancelled = true
    }
  }, [native, userId])

  useEffect(() => {
    setEnabled(isBiometricEnabled(userId))
  }, [userId])

  if (!native || !passcodeOn || !hardware?.available) return null

  const label = biometricLabel(hardware.biometryType)

  const toggle = async () => {
    setError('')
    if (enabled) {
      setBiometricEnabled(userId, false)
      setEnabled(false)
      return
    }
    setBusy(true)
    try {
      const ok = await authenticateWithBiometric(`Enable ${label} for Jiokoe`)
      if (!ok) {
        setError('Biometric check failed. Try again.')
        return
      }
      setBiometricEnabled(userId, true)
      setEnabled(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card mt-2 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/12 text-orange-600 dark:text-orange-300">
            <Icon name="shield" size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-ink">{label} unlock</h2>
            <p className="text-[11px] text-ink-muted">Skip the 4-digit passcode on this device.</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy}
          onClick={toggle}
          className={`press relative h-7 w-12 shrink-0 rounded-full transition ${
            enabled ? 'bg-orange-500' : 'bg-line'
          } disabled:opacity-60`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              enabled ? 'left-[1.35rem]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-rose-500">{error}</p>}
    </section>
  )
}
