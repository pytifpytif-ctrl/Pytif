import { Link } from 'react-router-dom'

export function Logo({ size = 28, withText = true }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <rect width="64" height="64" rx="16" fill="#1a4ef5" />
        <path
          d="M16 22c0-2.2 1.8-4 4-4h24c2.2 0 4 1.8 4 4v20c0 2.2-1.8 4-4 4H20c-2.2 0-4-1.8-4-4V22z"
          fill="#fff"
        />
        <circle cx="42" cy="32" r="4" fill="#1a4ef5" />
        <path
          d="M22 30l3 6 3-9 3 12 3-6"
          stroke="#1a4ef5"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {withText && <span className="text-xl font-extrabold tracking-tight text-ink">Wastel</span>}
    </div>
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
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PAUSED: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-50 text-rose-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
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
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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

export function ScreenHeader({ title, subtitle, back, right }) {
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-5 border-b border-slate-100 bg-[#f4f6fb]/90 px-5 py-4 backdrop-blur">
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
            <h1 className="text-lg font-bold leading-tight text-ink">{title}</h1>
            {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
    </header>
  )
}
