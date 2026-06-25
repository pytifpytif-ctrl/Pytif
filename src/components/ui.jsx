import { Link } from 'react-router-dom'

export function Logo({ size = 36, className = '' }) {
  return (
    <img
      src="/Logo.png"
      alt="Pytif"
      style={{ height: size }}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  )
}

export function Spinner({ className = '' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" width="20" height="20">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

const STATUS_STYLES = {
  ACTIVE: 'bg-accent-50 text-accent-700',
  PAUSED: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-50 text-rose-700',
  SUCCESS: 'bg-accent-50 text-accent-700',
  PENDING: 'bg-sky-50 text-sky-700',
  FAILED: 'bg-rose-50 text-rose-700',
}

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'
  return <span className={`chip ${cls}`}>{status}</span>
}

export function Field({ label, hint, error, children }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  )
}

export function Alert({ kind = 'info', children }) {
  const styles = {
    info: 'bg-brand-50 text-brand-900 border-brand-100',
    error: 'bg-rose-50 text-rose-700 border-rose-100',
    success: 'bg-accent-50 text-accent-700 border-accent-100',
    warn: 'bg-amber-50 text-amber-800 border-amber-100',
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[kind]}`}>{children}</div>
  )
}

export function EmptyState({ icon = '🗓️', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 max-w-xs text-sm text-ink-muted">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function OrDivider({ label = 'or' }) {
  return (
    <div className="my-4 flex items-center gap-3 text-xs font-medium text-ink-muted">
      <span className="h-px flex-1 bg-slate-200" />
      {label}
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  )
}

export function GoogleButton({ onClick, disabled, label = 'Continue with Google' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="btn-ghost w-full">
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {label}
    </button>
  )
}

export function ScreenHeader({ title, subtitle, back, right }) {
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-5 border-b border-slate-100 bg-[#f4f6fa]/90 px-5 py-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-2 lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {back && (
            <Link
              to={back}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-card"
              aria-label="Back"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight text-ink lg:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </header>
  )
}
