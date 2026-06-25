import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ScreenHeader, ThemeToggle } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import MpesaSetup from '../components/MpesaSetup.jsx'
import { formatPhone } from '../lib/format.js'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editingNumber, setEditingNumber] = useState(false)

  const hasNumber = Boolean(user?.mpesa_number)
  const initial = (user?.name || 'U').charAt(0).toUpperCase()

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <ScreenHeader title="Settings" subtitle="Manage your account and payout number" />

      <div className="space-y-5">
        {/* Profile */}
        <section className="card p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-500 text-xl font-bold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold text-ink">{user?.name || 'Your account'}</p>
              {user?.email && <p className="truncate text-sm text-ink-muted">{user.email}</p>}
            </div>
          </div>
        </section>

        {/* M-Pesa number */}
        <section className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
              <Icon name="phone" size={18} />
            </span>
            <div>
              <h2 className="font-bold text-ink">Payout M-Pesa number</h2>
              <p className="text-xs text-ink-muted">Where Pytif sends your scheduled money.</p>
            </div>
          </div>

          {hasNumber && !editingNumber ? (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface-soft px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300">
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <p className="font-bold text-ink">{formatPhone(user.mpesa_number)}</p>
                  <p className="text-xs text-accent-600 dark:text-accent-300">Verified</p>
                </div>
              </div>
              <button onClick={() => setEditingNumber(true)} className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                Change
              </button>
            </div>
          ) : (
            <>
              {!hasNumber && (
                <p className="mb-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                  Add and verify your M-Pesa number to start locking money.
                </p>
              )}
              <MpesaSetup
                onDone={() => setEditingNumber(false)}
                onCancel={hasNumber ? () => setEditingNumber(false) : undefined}
              />
            </>
          )}
        </section>

        {/* Appearance */}
        <section className="card flex items-center justify-between p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/12 text-brand-600 dark:text-brand-300">
              <Icon name="sun" size={18} />
            </span>
            <div>
              <h2 className="font-bold text-ink">Appearance</h2>
              <p className="text-xs text-ink-muted">Light, dark, or match your system.</p>
            </div>
          </div>
          <ThemeToggle withLabel />
        </section>

        {/* Sign out */}
        <button onClick={signOut} className="btn-ghost w-full">
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </div>
    </div>
  )
}
