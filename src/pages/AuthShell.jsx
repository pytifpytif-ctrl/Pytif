import { Logo } from '../components/ui.jsx'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#f4f6fb] px-6">
      <div className="pt-12">
        <Logo size={34} />
      </div>

      <div className="mt-8 flex-1">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
        </div>
        <div className="animate-fade-in">{children}</div>
      </div>

      {footer && <div className="py-8 text-center text-sm text-ink-muted">{footer}</div>}
    </div>
  )
}
