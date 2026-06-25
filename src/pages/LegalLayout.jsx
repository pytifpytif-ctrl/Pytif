import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

export default function LegalLayout({ title, updated, children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-[#f4f6fa]/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Pytif home">
            <Logo size={36} />
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-brand-600"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {updated && <p className="mt-2 text-sm text-ink-muted">Last updated: {updated}</p>}
        <div className="legal mt-8 space-y-6 text-ink-muted">{children}</div>

        <footer className="mt-12 border-t border-slate-200 pt-6 text-sm text-ink-muted">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/terms" className="font-semibold text-brand-600">
              Terms of Service
            </Link>
            <Link to="/privacy" className="font-semibold text-brand-600">
              Privacy Policy
            </Link>
            <Link to="/login" className="font-semibold text-brand-600">
              Back to app
            </Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} Pytif. All rights reserved.</p>
        </footer>
      </main>
    </div>
  )
}

export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="mt-2 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}
