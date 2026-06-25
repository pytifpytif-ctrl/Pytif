import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Logo } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

const FEATURES = [
  { icon: 'lockClosed', title: 'Commit, then forget', desc: 'Lock impulse cash. No withdrawals — that friction is the point.' },
  { icon: 'clock', title: 'Pays on schedule', desc: 'Daily, weekdays, or exact dates. You pick when it returns.' },
  { icon: 'phone', title: 'Straight to M-Pesa', desc: 'Funds hit your own number automatically.' },
  { icon: 'trend', title: 'See it clearly', desc: 'Balance, upcoming sends, and history at a glance.' },
]

const STEPS = [
  { n: '01', title: 'Pick a pattern', desc: 'How often money comes back.' },
  { n: '02', title: 'Set amounts', desc: 'As many sends as you like.' },
  { n: '03', title: 'Lock & relax', desc: 'Approve once. Pytif handles the rest.' },
]

export default function Landing() {
  const { user } = useAuth()
  const primaryTo = user ? '/app' : '/register'
  const primaryLabel = user ? 'Open app' : 'Get started'

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 lg:px-8">
          <Link to="/" aria-label="Pytif home">
            <Logo size={28} />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-900">Features</a>
            <a href="#how" className="transition-colors hover:text-zinc-900">How it works</a>
            <Link to="/terms" className="transition-colors hover:text-zinc-900">Terms</Link>
          </nav>
          <div className="flex items-center gap-1.5">
            {!user && (
              <Link to="/login" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900">
                Log in
              </Link>
            )}
            <Link
              to={primaryTo}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white shadow-md shadow-zinc-900/10 transition-transform hover:-translate-y-0.5"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-64 w-64 rounded-full bg-orange-200/40 blur-[100px]" />
        <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full bg-amber-100/60 blur-[100px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-12">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600">
              <Icon name="bolt" size={11} /> Commitment wallet
            </span>
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Good money.{' '}
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">Better life.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-zinc-500 sm:text-base">
              Lock cash you&apos;d impulse-spend. Pytif returns it to your M-Pesa on your schedule.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                to={primaryTo}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-zinc-900/15 transition-transform hover:-translate-y-0.5"
              >
                {primaryLabel}
              </Link>
              <a
                href="#how"
                className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                How it works
              </a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><Icon name="check" size={14} className="text-orange-500" /> No withdrawals</span>
              <span className="flex items-center gap-1.5"><Icon name="check" size={14} className="text-orange-500" /> Your own number</span>
            </div>
          </div>

          <div className="hidden animate-scale-in lg:block">
            <CardStack />
          </div>
        </div>
      </section>

      <section id="features" className="bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
          <div className="max-w-lg">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Can&apos;t touch it — until it&apos;s time.</h2>
            <p className="mt-1 text-sm text-zinc-500">Saving by default. Temptation removed.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-zinc-100 bg-white p-3.5 shadow-sm lg:p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/20">
                  <Icon name={f.icon} size={18} />
                </span>
                <h3 className="mt-2.5 text-sm font-bold leading-snug">{f.title}</h3>
                <p className="mt-0.5 text-xs leading-snug text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-10">
        <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Three steps to locked.</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 lg:gap-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm lg:p-4">
              <span className="bg-gradient-to-br from-orange-500 to-orange-600 bg-clip-text text-2xl font-black text-transparent lg:text-3xl">{s.n}</span>
              <h3 className="mt-1 text-sm font-bold leading-snug">{s.title}</h3>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-500 lg:text-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 lg:px-8 lg:pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900 px-5 py-6 text-center text-white lg:px-8 lg:py-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-500/40 blur-3xl" />
          <h2 className="relative text-xl font-extrabold tracking-tight sm:text-2xl">Pay your future self first.</h2>
          <p className="relative mx-auto mt-1 max-w-sm text-sm text-zinc-300">Set up in under two minutes.</p>
          <Link
            to={primaryTo}
            className="relative mt-4 inline-flex rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition-transform hover:-translate-y-0.5"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-400 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <Logo size={20} />
            <span>© {new Date().getFullYear()} Pytif</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-zinc-900">Terms</Link>
            <Link to="/privacy" className="hover:text-zinc-900">Privacy</Link>
            <Link to="/login" className="hover:text-zinc-900">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CardStack() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-sm">
      <div className="absolute left-0 top-6 w-52 -rotate-[8deg] rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 p-4 text-white shadow-xl shadow-orange-500/30">
        <div className="flex items-center justify-between text-[10px] font-medium text-white/80">
          <span>Daily transport</span>
          <Icon name="clock" size={14} />
        </div>
        <p className="mt-4 text-xs text-white/80">Returns / day</p>
        <p className="text-xl font-extrabold">Ksh 250</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-white/40" />
          ))}
        </div>
      </div>

      <div className="absolute right-0 top-0 w-52 rotate-[4deg] rounded-2xl bg-zinc-900 p-4 text-white shadow-xl shadow-zinc-900/30 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/30 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <p className="text-xs text-zinc-400">Total locked</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold">PYTIF</span>
        </div>
        <p className="relative mt-1 text-2xl font-extrabold tracking-tight">Ksh 48,500</p>
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
        </div>
        <p className="relative mt-2 text-[10px] text-zinc-400">3 schedules · •••• 4321</p>
      </div>

      <div className="absolute bottom-0 left-6 w-48 rounded-2xl border border-zinc-100 bg-white p-3 shadow-xl shadow-zinc-900/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600">
              <Icon name="check" size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-zinc-900">Rent fund</p>
              <p className="text-[10px] text-zinc-400">Sent · every 1st</p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-bold text-zinc-900">12,000</span>
        </div>
      </div>

      <span className="absolute right-2 top-28 grid h-11 w-11 place-items-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/40 ring-4 ring-white">
        <Icon name="plus" size={20} strokeWidth={2.6} />
      </span>
    </div>
  )
}
