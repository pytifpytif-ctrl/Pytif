import { Logo, ThemeToggle } from '../components/ui.jsx'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] lg:items-center lg:justify-center lg:px-4 lg:py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-32 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl dark:bg-orange-500/15" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl dark:bg-orange-500/10" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center lg:rounded-3xl lg:border lg:border-line lg:bg-surface/90 lg:p-8 lg:shadow-float lg:backdrop-blur-xl">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <Logo size={40} wordmark={false} />
          <ThemeToggle />
        </div>

        <div className="mt-3 shrink-0 animate-slide-up">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight text-ink lg:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">{subtitle}</p>}
        </div>

        <div className="auth-form mt-3 shrink-0 animate-fade-in lg:flex-none">{children}</div>

        {footer && (
          <div className="mt-3 shrink-0 pb-0.5 text-center text-sm text-ink-muted lg:mt-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
