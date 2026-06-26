import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { hasPasscode, isUnlocked, markUnlocked, verifyPasscode } from '../lib/appPasscode.js'
import { LogoMark } from './Logo.jsx'
import PinPad from './PinPad.jsx'
import ForgotPasscodeLink from './ForgotPasscodeLink.jsx'

export default function AppPasscodeGate({ userId, children }) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked(userId))

  if (!userId || !hasPasscode(userId) || unlocked) return children

  return (
    <PasscodeLockScreen
      userId={userId}
      onUnlock={() => {
        markUnlocked(userId)
        setUnlocked(true)
      }}
    />
  )
}

function PasscodeLockScreen({ userId, onUnlock }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const tryPin = async (pin) => {
    setBusy(true)
    setError('')
    try {
      const ok = await verifyPasscode(userId, pin)
      if (ok) {
        onUnlock()
        return
      }
      setError('Wrong passcode. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-bg-decor flex min-h-screen flex-col items-center justify-center bg-app px-6 py-10">
      <div className="flex w-full max-w-sm flex-col items-center text-center lg:max-w-md">
        <div className="mb-8 animate-scale-in">
          <LogoMark size={56} />
        </div>
        <h1 className="text-xl font-extrabold text-ink lg:text-2xl">Welcome back</h1>
        <p className="mt-1 max-w-xs text-sm text-ink-muted lg:max-w-sm">
          Enter your 4-digit app passcode to continue.
        </p>

        <div className="mt-8 w-full max-w-xs animate-fade-in lg:rounded-3xl lg:border lg:border-line lg:bg-surface/80 lg:p-6 lg:shadow-card lg:backdrop-blur-sm">
          <PinPad onComplete={tryPin} error={error} disabled={busy} />
        </div>

        <ForgotPasscodeLink email={user?.email} className="mt-6" />

        <button
          type="button"
          onClick={signOut}
          className="mt-8 text-sm font-semibold text-ink-muted transition hover:text-ink lg:mt-10"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
