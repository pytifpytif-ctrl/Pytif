import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { Avatar, ScreenHeader, Spinner } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'
import MpesaSetup from '../components/MpesaSetup.jsx'
import AppPasscodeSetup from '../components/AppPasscodeSetup.jsx'
import { maskPhone } from '../lib/format.js'

export default function Settings() {
  const { user, logout, uploadAvatar } = useAuth()
  const navigate = useNavigate()
  const [mpesaModalOpen, setMpesaModalOpen] = useState(false)
  const fileRef = useRef(null)
  const topChromeRef = useRef(null)
  const [topChromeHeight, setTopChromeHeight] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  const hasVerifiedNumber = Boolean(user?.is_verified && user?.mpesa_number)

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

  useLayoutEffect(() => {
    const el = topChromeRef.current
    if (!el) return undefined

    const update = () => setTopChromeHeight(el.getBoundingClientRect().height)
    update()

    const mq = window.matchMedia('(max-width: 1023px)')
    const onMq = () => update()
    mq.addEventListener('change', onMq)

    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      mq.removeEventListener('change', onMq)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-2xl flex-1 flex-col overflow-hidden">
      <div
        ref={topChromeRef}
        className="page-top-chrome page-top-chrome-dark z-40 shrink-0 max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:px-5 max-lg:pb-2.5 max-lg:pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-2 lg:backdrop-blur-none"
      >
        <ScreenHeader
          embedded
          inverse
          compact
          dense
          title="Profile"
          subtitle="Account & payout"
        />
      </div>

      <div className="shrink-0 lg:hidden" style={{ height: topChromeHeight || undefined }} aria-hidden />

      <div className="no-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 lg:pb-8 lg:pt-4">
        <div className="space-y-4">
        {/* Profile identity */}
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press group relative shrink-0 rounded-full"
              aria-label="Change profile picture"
            >
              <span className="block rounded-full ring-2 ring-orange-500/30 ring-offset-2 ring-offset-surface">
                <Avatar src={user?.avatar_url} name={user?.name} size={56} rounded="rounded-full" />
              </span>
              <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-orange-500 text-white">
                {uploading ? <Spinner className="h-3 w-3" /> : <Icon name="camera" size={11} />}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-ink">{user?.name || 'Your account'}</p>
              {user?.email && <p className="truncate text-xs text-ink-muted">{user.email}</p>}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400"
              >
                <Icon name="camera" size={12} />
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
          <section className="card p-3.5">
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-500/12 text-accent-600 dark:text-accent-300">
                <Icon name="phone" size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-ink">Payout M-Pesa number</h2>
                <p className="text-[11px] text-ink-muted">Where scheduled money is sent.</p>
              </div>
            </div>

            {hasVerifiedNumber ? (
              <>
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-soft px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-500/12 text-accent-600 dark:text-accent-300">
                      <Icon name="check" size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{maskPhone(user.mpesa_number)}</p>
                      <p className="text-[10px] font-medium text-accent-600 dark:text-accent-300">Saved</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMpesaModalOpen(true)}
                    className="press shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
                  >
                    Change
                  </button>
                </div>
                {mpesaModalOpen && (
                  <MpesaSetup
                    onDone={() => setMpesaModalOpen(false)}
                    onCancel={() => setMpesaModalOpen(false)}
                  />
                )}
              </>
            ) : (
              <>
                <p className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
                  Add and verify your M-Pesa number to start locking money.
                </p>
                {!mpesaModalOpen && (
                  <button
                    type="button"
                    onClick={() => setMpesaModalOpen(true)}
                    className="press w-full rounded-xl border border-dashed border-accent-500/40 bg-accent-500/5 px-3 py-2.5 text-xs font-semibold text-accent-600 transition hover:bg-accent-500/10 dark:text-accent-300"
                  >
                    Add M-Pesa number
                  </button>
                )}
                {mpesaModalOpen && (
                  <MpesaSetup
                    onDone={() => setMpesaModalOpen(false)}
                    onCancel={() => setMpesaModalOpen(false)}
                  />
                )}
              </>
            )}
          </section>
        </div>

        {/* Security — optional app passcode */}
        <div>
          <SectionLabel>Security</SectionLabel>
          <AppPasscodeSetup userId={user?.id} />
        </div>

        {/* Preferences */}
        <div>
          <SectionLabel>Preferences</SectionLabel>
          <section className="card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/12 text-orange-600 dark:text-orange-300">
                  <Icon name="moon" size={16} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ink">Appearance</h2>
                  <p className="text-[11px] text-ink-muted">Light or dark mode</p>
                </div>
              </div>
              <ThemeSegment />
            </div>
          </section>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="press inline-flex w-full items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-left transition-colors hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
            <Icon name="logout" size={14} />
          </span>
          <span className="flex-1 text-sm font-semibold text-rose-600 dark:text-rose-300">Sign out</span>
          <Icon name="arrowRight" size={14} className="text-rose-400" />
        </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">{children}</p>
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
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            mode === o.id ? 'bg-orange-500 text-white shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          <Icon name={o.icon} size={13} />
          {o.label}
        </button>
      ))}
    </div>
  )
}
