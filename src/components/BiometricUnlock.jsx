import { useEffect, useState } from 'react'
import { Icon } from './icons.jsx'
import {
  authenticateWithBiometric,
  biometricLabel,
  checkBiometricHardware,
  isBiometricEnabled,
} from '../lib/biometrics.js'
import { isNativeApp } from '../lib/native.js'

export default function BiometricUnlock({ userId, onUnlock, autoPrompt = true }) {
  const [hardware, setHardware] = useState(null)
  const [busy, setBusy] = useState(false)

  const enabled = isBiometricEnabled(userId)
  const show = isNativeApp() && enabled

  useEffect(() => {
    if (!show) return undefined
    let cancelled = false
    checkBiometricHardware().then((result) => {
      if (!cancelled) setHardware(result)
    })
    return () => {
      cancelled = true
    }
  }, [show])

  const unlock = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await authenticateWithBiometric('Unlock Jiokoe')
      if (ok) onUnlock()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!show || !autoPrompt || !hardware?.available) return undefined
    const t = setTimeout(() => {
      unlock()
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, autoPrompt, hardware?.available])

  if (!show || !hardware?.available) return null

  const label = biometricLabel(hardware.biometryType)

  return (
    <button
      type="button"
      onClick={unlock}
      disabled={busy}
      className="press mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-card disabled:opacity-60"
    >
      <Icon name="shield" size={16} className="text-orange-500" />
      {busy ? 'Checking…' : `Unlock with ${label}`}
    </button>
  )
}
