import { Logo, ThemeToggle } from '../components/ui.jsx'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-app px-6 lg:items-center lg:justify-center lg:px-4">
      {/* Decorative gradient mesh */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/20" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-accent-400/20 blur-3xl dark:bg-accent-500/15" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-500/10" />
      </div>

      <div className="absolute right-5 top-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none lg:rounded-3xl lg:border lg:border-line lg:bg-surface/90 lg:p-10 lg:shadow-float lg:backdrop-blur-xl">
        <div className="pt-12 lg:pt-0">
          <Logo size={76} />
        </div>

        <div className="mt-8 flex-1 lg:mt-7 lg:flex-none">
          <div className="mb-6 animate-slide-up">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-ink-muted">{subtitle}</p>}
          </div>
          <div className="animate-fade-in">{children}</div>
        </div>

        {footer && <div className="pb-8 pt-8 text-center text-sm text-ink-muted lg:pb-0">{footer}</div>}
      </div>
    </div>
  )
}
