import { formatKes, formatPhone } from '../lib/format.js'
import { Icon } from './icons.jsx'
import { LogoMark } from './Logo.jsx'

const STEPS = [
  { id: 'sent', label: 'Prompt sent' },
  { id: 'pin', label: 'Enter PIN' },
  { id: 'lock', label: 'Locking in' },
]

export default function StkWaitingScreen({
  total,
  phone,
  title = 'Check your phone',
  description,
  variant = 'full',
  children,
}) {
  const body =
    description ||
    (phone ? (
      <>
        Approve the M-Pesa prompt for <span className="font-bold text-ink">{formatKes(total)}</span> on{' '}
        <span className="font-semibold text-ink">{formatPhone(phone)}</span>. Your money locks once you enter your PIN.
      </>
    ) : (
      <>
        Approve the M-Pesa prompt for <span className="font-bold text-ink">{formatKes(total)}</span> to continue.
      </>
    ))

  if (variant === 'simple') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center animate-fade-in">
        <div className="relative mb-6">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/30" />
          <span
            className="absolute inset-2 animate-pulse-ring rounded-full bg-brand-500/20"
            style={{ animationDelay: '0.6s' }}
          />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-brand-500/12 text-brand-600 dark:text-brand-300">
            <Icon name="phone" size={28} />
          </span>
        </div>

        <span className="rounded-full bg-surface-soft px-3.5 py-1 text-sm font-bold text-ink">{formatKes(total)}</span>

        <h1 className="mt-5 text-xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-muted">{body}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-brand-500 animate-stk-dot"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">Waiting for confirmation…</span>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[28%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="absolute bottom-[18%] right-[12%] h-48 w-48 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute left-[8%] top-[55%] h-32 w-32 rounded-full bg-brand-400/10 blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="relative mx-auto mb-8 flex h-48 w-48 items-center justify-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/35" />
          <span
            className="absolute inset-3 animate-pulse-ring rounded-full bg-brand-500/25"
            style={{ animationDelay: '0.55s' }}
          />
          <span
            className="absolute inset-6 animate-pulse-ring rounded-full bg-accent-500/20"
            style={{ animationDelay: '1.1s' }}
          />

          <div className="absolute inset-0 animate-stk-orbit">
            <span className="absolute left-1/2 top-1 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-400 shadow-[0_0_14px_rgba(251,146,60,0.9)]" />
          </div>
          <div className="absolute inset-0 animate-stk-orbit" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
            <span className="absolute bottom-2 right-3 h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_10px_rgba(0,200,150,0.7)]" />
          </div>

          <div className="relative z-10 w-[9.5rem] animate-stk-float rounded-2xl border border-line/80 bg-surface/95 p-4 shadow-glow backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-600 dark:text-accent-300">
                  M-Pesa
                </span>
              </div>
              <LogoMark size={18} />
            </div>

            <p className="text-left text-[10px] font-medium uppercase tracking-wide text-ink-muted">Pay request</p>
            <p className="mt-0.5 text-left text-2xl font-extrabold tabular-nums tracking-tight text-ink">
              {formatKes(total)}
            </p>

            <div className="mt-3 flex justify-center gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-2.5 w-2.5 rounded-full bg-brand-500 animate-stk-pin"
                  style={{ animationDelay: `${i * 0.18}s` }}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-ink-muted">Enter PIN on your phone</p>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{body}</p>
        {children}

        <div className="mt-8 rounded-2xl border border-line bg-surface/70 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors ${
                    i === 0
                      ? 'bg-accent-500 text-white'
                      : i === 1
                        ? 'bg-brand-500 text-white ring-4 ring-brand-500/20'
                        : 'bg-surface-soft text-ink-muted'
                  }`}
                >
                  {i === 0 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M5 12l5 5L20 7"
                        stroke="currentColor"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={`text-[10px] font-semibold ${i === 1 ? 'text-brand-600 dark:text-brand-300' : 'text-ink-muted'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-brand-500 animate-stk-dot"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-300">Waiting for confirmation…</span>
        </div>
      </div>
    </div>
  )
}
