import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/ui.jsx'

export const LEGAL_EFFECTIVE = '25 June 2026'

export const COMPANY = {
  name: 'Jiokoe Limited',
  tagline: 'Pay Yourself In The Future',
  site: 'jiokoe.com',
  address: 'Qwetu Hurlingham, Hurlingham Road, Nairobi, Kenya',
  support: 'support@jiokoe.com',
  privacy: 'privacy@jiokoe.com',
  legal: 'legal@jiokoe.com',
  phone: '+254 708 758 500',
  dpo: 'Alfred Mulinge Maweu',
}

export default function LegalLayout({ title, docLabel, children }) {
  const navigate = useNavigate()
  return (
    <div className="app-bg-decor min-h-screen bg-app">
      <header className="sticky top-0 z-10 border-b border-line bg-app/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" aria-label="Jiokoe home">
            <Logo size={48} wordmark />
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="press shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 lg:px-8 lg:py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
          {COMPANY.tagline}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Effective date: {LEGAL_EFFECTIVE} · Last updated: {LEGAL_EFFECTIVE}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          {COMPANY.name} · Nairobi, Kenya ·{' '}
          <a href={`https://${COMPANY.site}`} className="font-semibold text-brand-600 dark:text-brand-300">
            {COMPANY.site}
          </a>
        </p>

        <div className="legal-prose mt-8 space-y-8 text-ink-muted">{children}</div>

        <footer className="mt-14 border-t border-line pt-6 text-sm text-ink-muted">
          <p className="font-medium text-ink-soft">
            {COMPANY.name} · {docLabel} · Effective {LEGAL_EFFECTIVE}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/terms" className="font-semibold text-brand-600 dark:text-brand-300">
              Terms of Service
            </Link>
            <Link to="/privacy" className="font-semibold text-brand-600 dark:text-brand-300">
              Privacy Policy
            </Link>
            <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-300">
              Create account
            </Link>
            <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300">
              Log in
            </Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} {COMPANY.name}. All rights reserved.</p>
        </footer>
      </main>
    </div>
  )
}

export function Section({ heading, children }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="mt-3 space-y-3 leading-relaxed">{children}</div>
    </section>
  )
}

export function SummaryBox({ children }) {
  return (
    <div className="rounded-2xl border border-orange-500/25 bg-orange-500/8 p-4 text-sm leading-relaxed text-ink-soft">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
        Plain language summary
      </p>
      {children}
    </div>
  )
}

export function Callout({ title, children }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      {title && <p className="mb-2 text-sm font-bold text-amber-800 dark:text-amber-200">{title}</p>}
      <div className="space-y-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </div>
  )
}

export function DefList({ items }) {
  return (
    <dl className="space-y-3">
      {items.map(({ term, def }) => (
        <div key={term}>
          <dt className="font-semibold text-ink">{term}</dt>
          <dd className="mt-0.5 pl-0 text-ink-muted">{def}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RetentionTable({ rows }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[280px] text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-soft">
            <th className="px-3 py-2.5 font-semibold text-ink">Data type</th>
            <th className="px-3 py-2.5 font-semibold text-ink">Retention period</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([type, period]) => (
            <tr key={type} className="border-b border-line last:border-0">
              <td className="px-3 py-2.5 align-top text-ink-soft">{type}</td>
              <td className="px-3 py-2.5 align-top">{period}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
