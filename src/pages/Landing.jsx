import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Logo } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

const FEATURES = [
  { icon: 'lockClosed', title: 'Commit, then forget', desc: 'Lock money you would impulse-spend. No withdrawals — that friction is the point.' },
  { icon: 'clock', title: 'Pays you on schedule', desc: 'Every day, set weekdays, or exact dates. You decide when and how much returns.' },
  { icon: 'phone', title: 'Straight to M-Pesa', desc: 'Funds return to your own number automatically. No app-hopping, no chasing.' },
  { icon: 'trend', title: 'See it all clearly', desc: 'Track locked balance, upcoming sends and full history at a glance.' },
]

const STEPS = [
  { n: '01', title: 'Pick a pattern', desc: 'Choose how often Pytif should send your money back.' },
  { n: '02', title: 'Set times & amounts', desc: 'Build your day with as many sends as you like.' },
  { n: '03', title: 'Lock & relax', desc: 'Approve once. Pytif pays your future self on time.' },
]

export default function Landing() {
  const { user } = useAuth()
  const primaryTo = user ? '/app' : '/register'
  const primaryLabel = user ? 'Open app' : 'Get started'

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" aria-label="Pytif home">
            <Logo size={32} />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-900">Features</a>
            <a href="#how" className="transition-colors hover:text-zinc-900">How it works</a>
            <Link to="/terms" className="transition-colors hover:text-zinc-900">Terms</Link>
          </nav>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900">
                Log in
              </Link>
            )}
            <Link
              to={primaryTo}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-zinc-900/10 transition-transform hover:-translate-y-0.5"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-orange-200/40 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 top-40 h-96 w-96 rounded-full bg-amber-100/60 blur-[120px]" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600">
              <Icon name="bolt" size={13} /> Commitment wallet
            </span>
            <h1 className="mt-6 text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              Good money.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                Better life.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-zinc-500">
              Pytif locks the cash you&apos;d impulse-spend and returns it to your M-Pesa on a schedule you set.
              Discipline, automated.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={primaryTo}
                className="rounded-full bg-zinc-900 px-7 py-4 text-base font-bold text-white shadow-xl shadow-zinc-900/15 transition-transform hover:-translate-y-0.5"
              >
                {primaryLabel}
              </Link>
              <a
                href="#how"
                className="rounded-full border border-zinc-200 bg-white px-7 py-4 text-base font-semibold text-zinc-800 transition-colors hover:bg-zinc-50"
              >
                How it works
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-zinc-400">
              <span className="flex items-center gap-2"><Icon name="check" size={16} className="text-orange-500" /> No withdrawals</span>
              <span className="flex items-center gap-2"><Icon name="check" size={16} className="text-orange-500" /> Your own number</span>
            </div>
          </div>

          <div className="animate-scale-in">
            <CardStack />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Money you can&apos;t touch — until it&apos;s time.</h2>
            <p className="mt-3 text-zinc-500">A wallet built around one idea: make saving the default by removing the temptation.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-xl">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/25">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Three steps to locked.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-zinc-100 bg-white p-7 shadow-sm">
              <span className="bg-gradient-to-br from-orange-500 to-orange-600 bg-clip-text text-5xl font-black text-transparent">{s.n}</span>
              <h3 className="mt-3 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 p-10 text-center text-white lg:p-16">
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-orange-500/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-orange-600/30 blur-3xl" />
          <h2 className="relative text-3xl font-extrabold tracking-tight sm:text-4xl">Pay your future self first.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-zinc-300">Set up your first commitment in under two minutes.</p>
          <Link
            to={primaryTo}
            className="relative mt-8 inline-flex rounded-full bg-gradient-to-br from-orange-400 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-600/30 transition-transform hover:-translate-y-0.5"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-zinc-400 sm:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="ml-1">© {new Date().getFullYear()} Pytif</span>
          </div>
          <div className="flex items-center gap-6">
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
    <div className="relative mx-auto h-[440px] w-full max-w-md">
      {/* Back: orange gradient card */}
      <div className="absolute left-0 top-8 w-64 -rotate-[8deg] rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 p-5 text-white shadow-2xl shadow-orange-500/40 sm:w-72">
        <div className="flex items-center justify-between text-xs font-medium text-white/80">
          <span>Daily transport</span>
          <Icon name="clock" size={16} />
        </div>
        <p className="mt-6 text-sm text-white/80">Returns / day</p>
        <p className="text-2xl font-extrabold">Ksh 250</p>
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="h-1.5 flex-1 rounded-full bg-white/40" />
          ))}
        </div>
      </div>

      {/* Front: dark balance card */}
      <div className="absolute right-0 top-0 w-64 rotate-[4deg] rounded-3xl bg-zinc-900 p-6 text-white shadow-2xl shadow-zinc-900/30 ring-1 ring-white/10 sm:w-72">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/30 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <p className="text-sm text-zinc-400">Total locked</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold">PYTIF</span>
        </div>
        <p className="relative mt-2 text-3xl font-extrabold tracking-tight">Ksh 48,500</p>
        <div className="relative mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
        </div>
        <p className="relative mt-3 text-xs text-zinc-400">3 active schedules · •••• 4321</p>
      </div>

      {/* Peeking white card */}
      <div className="absolute bottom-0 left-8 w-60 rounded-3xl border border-zinc-100 bg-white p-4 shadow-2xl shadow-zinc-900/10 sm:w-64">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
              <Icon name="check" size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-zinc-900">Rent fund</p>
              <p className="text-xs text-zinc-400">Sent · every 1st</p>
            </div>
          </div>
          <span className="text-sm font-bold text-zinc-900">12,000</span>
        </div>
      </div>

      {/* Floating + button */}
      <span className="absolute right-4 top-36 grid h-14 w-14 place-items-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/40 ring-4 ring-white">
        <Icon name="plus" size={24} strokeWidth={2.6} />
      </span>
    </div>
  )
}
