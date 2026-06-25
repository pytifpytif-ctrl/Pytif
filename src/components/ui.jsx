import { Link } from 'react-router-dom'
import { Icon } from './icons.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

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

export function Avatar({ src, name, size = 40, rounded = 'rounded-xl', className = '' }) {
  const initial = (name || 'U').charAt(0).toUpperCase()
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden bg-orange-500 font-bold text-white ${rounded} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        <img src={src} alt={name || 'Profile'} className="h-full w-full object-cover" draggable={false} />
      ) : (
        initial
      )}
    </span>
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
  ACTIVE: 'bg-accent-500/12 text-accent-600 dark:text-accent-300',
  PAUSED: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  COMPLETED: 'bg-surface-soft text-ink-muted',
  CANCELLED: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
  SUCCESS: 'bg-accent-500/12 text-accent-600 dark:text-accent-300',
  PENDING: 'bg-sky-500/12 text-sky-600 dark:text-sky-300',
  FAILED: 'bg-rose-500/12 text-rose-600 dark:text-rose-300',
}

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-surface-soft text-ink-muted'
  return <span className={`chip ${cls}`}>{status}</span>
}

export function Field({ label, hint, error, icon, children }) {
  return (
    <div className="mb-4">
      {label && <label className="label">{label}</label>}
      {icon ? (
        <div className="field-wrap">
          <span className="field-ic">
            <Icon name={icon} size={18} />
          </span>
          {children}
        </div>
      ) : (
        children
      )}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  )
}

export function Alert({ kind = 'info', children }) {
  const styles = {
    info: 'bg-brand-500/10 text-brand-700 border-brand-500/20 dark:text-brand-200',
    error: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-300',
    success: 'bg-accent-500/10 text-accent-700 border-accent-500/20 dark:text-accent-200',
    warn: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-200',
  }
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[kind]}`}>{children}</div>
}

export function EmptyState({ icon = '🗓️', title, subtitle, action }) {
  return (
    <div className="flex animate-scale-in flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
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
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
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
    <header className="sticky top-0 z-20 -mx-5 mb-5 border-b border-line bg-app/85 px-5 py-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-2 lg:backdrop-blur-none">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {back && (
            <Link
              to={back}
              className="press flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card"
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

const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' }
const THEME_ICON = { light: 'sun', dark: 'moon', system: 'monitor' }

export function ThemeToggle({ withLabel = false, className = '' }) {
  const { mode, cycle } = useTheme()
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${THEME_LABEL[mode]} (tap to change)`}
      title={`Theme: ${THEME_LABEL[mode]}`}
      className={`press flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-ink-soft shadow-card transition-colors hover:text-ink ${className}`}
    >
      <span className="grid h-6 w-6 animate-scale-in place-items-center" key={mode}>
        <Icon name={THEME_ICON[mode]} size={17} />
      </span>
      {withLabel && <span className="pr-1 text-sm font-medium">{THEME_LABEL[mode]}</span>}
    </button>
  )
}
