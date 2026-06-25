import { Link } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6fa] px-6 lg:items-center lg:justify-center lg:px-4">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:flex-none lg:rounded-3xl lg:bg-white lg:p-10 lg:shadow-float">
        <div className="pt-12 lg:pt-0">
          <Logo size={52} />
        </div>

        <div className="mt-8 flex-1 lg:flex-none">
          <div className="mb-6 animate-fade-in">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
          </div>
          <div className="animate-fade-in">{children}</div>
        </div>

        {footer && <div className="pt-8 text-center text-sm text-ink-muted">{footer}</div>}

        <div className="pb-8 pt-4 text-center text-xs text-ink-muted lg:pb-0">
          <Link to="/terms" className="hover:text-brand-600">
            Terms
          </Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="hover:text-brand-600">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  )
}
