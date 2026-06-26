import { Link } from 'react-router-dom'
import WavySuccessIcon from './WavySuccessIcon.jsx'

/** Inline wavy success badge — callout row. */
export function SuccessBadgeIcon({ className = '', compact = false }) {
  return (
    <WavySuccessIcon
      size={compact ? 48 : 56}
      rings={2}
      className={`mt-0.5 ${className}`}
    />
  )
}

/** Centered wavy badge — full-screen after M-Pesa confirm. */
export function SuccessHeroIcon({ className = '' }) {
  return <WavySuccessIcon size={88} rings={3} className={className} />
}

/** Soft bordered inline success callout — icon left, message right. */
export function SuccessCallout({ children, className = '', compact = false }) {
  return (
    <div
      className={`flex animate-fade-in items-start gap-3 rounded-lg border border-line bg-surface-soft ${
        compact ? 'p-2.5' : 'p-3'
      } ${className}`}
      role="status"
    >
      <SuccessBadgeIcon compact={compact} />
      <div
        className={`min-w-0 flex-1 pt-1 leading-relaxed text-ink-muted ${
          compact ? 'text-[11px]' : 'text-xs'
        } [&_strong]:font-semibold [&_strong]:text-ink`}
      >
        {children}
      </div>
    </div>
  )
}

/** Full-screen success — hero icon, title, body, stacked actions. */
export function SuccessScreen({ title, children, actions, className = '' }) {
  return (
    <div
      className={`flex min-h-[100dvh] flex-col items-center justify-center px-8 text-center animate-fade-in ${className}`}
    >
      <SuccessHeroIcon />
      <h1 className="mt-6 text-xl font-extrabold text-ink lg:text-2xl">{title}</h1>
      {children && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted [&_strong]:font-semibold [&_strong]:text-ink">
          {children}
        </p>
      )}
      {actions && <div className="mt-8 w-full max-w-xs space-y-2">{actions}</div>}
    </div>
  )
}

export function SuccessActions({
  onResend,
  resendLabel = 'Send another email',
  backTo = '/login',
  backLabel = 'Back to login',
}) {
  return (
    <div className="space-y-2">
      <Link to={backTo} className="btn-primary h-9 w-full py-0 text-sm">
        {backLabel}
      </Link>
      {onResend && (
        <button type="button" className="btn-ghost h-9 w-full py-0 text-sm" onClick={onResend}>
          {resendLabel}
        </button>
      )}
    </div>
  )
}
