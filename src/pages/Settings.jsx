import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Avatar, ScreenHeader, Spinner, ThemeToggle } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import MpesaSetup from '../components/MpesaSetup.jsx'
import { formatPhone } from '../lib/format.js'

export default function Settings() {
  const { user, logout, uploadAvatar } = useAuth()
  const navigate = useNavigate()
  const [editingNumber, setEditingNumber] = useState(false)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const hasNumber = Boolean(user?.mpesa_number)

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAvatarError('')
    setUploading(true)
    try {
      await uploadAvatar(file)
    } catch (err) {
      setAvatarError(err.message || 'Could not upload image.')
    } finally {
      setUploading(false)
    }
  }

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
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press group relative shrink-0 rounded-2xl"
              aria-label="Change profile picture"
            >
              <Avatar src={user?.avatar_url} name={user?.name} size={64} rounded="rounded-2xl" />
              <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-orange-500 text-white">
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="camera" size={14} />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold text-ink">{user?.name || 'Your account'}</p>
              {user?.email && <p className="truncate text-sm text-ink-muted">{user.email}</p>}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400"
              >
                {user?.avatar_url ? 'Change photo' : 'Add a photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          {avatarError && <p className="mt-3 text-xs font-medium text-rose-500">{avatarError}</p>}
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
