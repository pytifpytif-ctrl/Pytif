import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { Avatar, ScreenHeader, Spinner } from '../components/ui.jsx'
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
      <ScreenHeader title="Profile" subtitle="Manage your account and payout number" />

      <div className="space-y-6">
        {/* Profile identity */}
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press group relative shrink-0 rounded-full"
              aria-label="Change profile picture"
            >
              <span className="block rounded-full ring-2 ring-orange-500/30 ring-offset-2 ring-offset-surface">
                <Avatar src={user?.avatar_url} name={user?.name} size={72} rounded="rounded-full" />
              </span>
              <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-orange-500 text-white">
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="camera" size={13} />}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold text-ink">{user?.name || 'Your account'}</p>
              {user?.email && <p className="truncate text-sm text-ink-muted">{user.email}</p>}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 dark:text-orange-400"
              >
                <Icon name="camera" size={14} />
                {user?.avatar_url ? 'Change photo' : 'Add a photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          {avatarError && <p className="relative mt-3 text-xs font-medium text-rose-500">{avatarError}</p>}
        </section>

        {/* Payout number */}
        <div>
          <SectionLabel>Payout</SectionLabel>
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-300">
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
                <button
                  onClick={() => setEditingNumber(true)}
                  className="press rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
                >
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
        </div>

        {/* Preferences */}
        <div>
          <SectionLabel>Preferences</SectionLabel>
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-300">
                  <Icon name="moon" size={18} />
                </span>
                <div>
                  <h2 className="font-bold text-ink">Appearance</h2>
                  <p className="text-xs text-ink-muted">Choose light or dark mode.</p>
                </div>
              </div>
              <ThemeSegment />
            </div>
          </section>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="press flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-500">
            <Icon name="logout" size={18} />
          </span>
          <span className="flex-1 font-semibold text-rose-600 dark:text-rose-300">Sign out</span>
          <Icon name="arrowRight" size={18} className="text-rose-400" />
        </button>

        <p className="pb-2 text-center text-xs text-ink-muted">Pytif · Phase 1</p>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-muted">{children}</p>
}

function ThemeSegment() {
  const { mode, setMode } = useTheme()
  const opts = [
    { id: 'light', label: 'Light', icon: 'sun' },
    { id: 'dark', label: 'Dark', icon: 'moon' },
  ]
  return (
    <div className="inline-flex rounded-full border border-line bg-surface-soft p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setMode(o.id)}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
            mode === o.id ? 'bg-orange-500 text-white shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Icon name={o.icon} size={15} />
          {o.label}
        </button>
      ))}
    </div>
  )
}
