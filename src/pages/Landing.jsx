import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Logo } from '../components/ui.jsx'
import { Icon } from '../components/icons.jsx'

export default function Landing() {
  const { user } = useAuth()
  const primaryTo = user ? '/app' : '/register'
  const primaryLabel = user ? 'Open app' : 'Get started'

  return (
    <div className="landing-shell relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-orange-400/25 blur-[90px]" />
        <div className="absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-violet-400/15 blur-[80px]" />
        <div className="absolute bottom-0 left-1/2 h-56 w-96 -translate-x-1/2 rounded-full bg-amber-200/30 blur-[100px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/" aria-label="Pytif home" className="opacity-90 transition hover:opacity-100">
          <Logo size={30} />
        </Link>
        {!user && (
          <Link
            to="/login"
            className="text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Log in
          </Link>
        )}
      </header>

      {/* One-screen hero */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex flex-1 flex-col justify-center">
          <HeroCards />

          <div className="mt-8 animate-slide-up text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600/80">
              Commitment wallet
            </p>
            <h1 className="mt-2 text-[2rem] font-black leading-[1.05] tracking-tight text-zinc-900 sm:text-[2.35rem]">
              Welcome to
              <br />
              smarter saving.
            </h1>
            <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-zinc-500">
              Lock money you&apos;d spend impulsively. Pytif sends it back to your M-Pesa on your schedule.
            </p>
          </div>

          <div className="mt-8 space-y-3 animate-fade-in">
            <Link
              to={primaryTo}
              className="press flex h-14 w-full items-center justify-center rounded-2xl bg-zinc-900 text-base font-bold text-white shadow-xl shadow-zinc-900/20 transition hover:bg-zinc-800"
            >
              {primaryLabel}
            </Link>
            {!user && (
              <Link
                to="/login"
                className="press flex h-14 w-full items-center justify-center rounded-2xl border border-zinc-200/80 bg-white/80 text-base font-bold text-zinc-800 shadow-sm backdrop-blur transition hover:bg-white"
              >
                Sign in
              </Link>
            )}
          </div>

          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] font-medium text-zinc-400">
            <li className="flex items-center gap-1.5">
              <Icon name="lockClosed" size={13} className="text-orange-500" />
              No withdrawals
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="phone" size={13} className="text-orange-500" />
              Your M-Pesa
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="clock" size={13} className="text-orange-500" />
              On schedule
            </li>
          </ul>
        </div>

        <footer className="mt-6 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
          <span>© {new Date().getFullYear()} Pytif</span>
          <Link to="/terms" className="hover:text-zinc-700">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-zinc-700">
            Privacy
          </Link>
        </footer>
      </main>
    </div>
  )
}

/** Orient-style stacked wallet cards — hero visual */
function HeroCards() {
  return (
    <div className="relative mx-auto h-[210px] w-full max-w-[280px] animate-scale-in sm:h-[230px] sm:max-w-[300px]">
      {/* Back card — violet */}
      <div
        className="absolute left-3 top-0 h-[118px] w-[78%] -rotate-[14deg] rounded-[1.35rem] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 p-4 text-white shadow-2xl shadow-violet-500/25 sm:h-[128px]"
        aria-hidden
      >
        <p className="text-[10px] font-medium text-white/75">Rent fund</p>
        <p className="mt-5 text-lg font-extrabold tracking-tight">Ksh 12,000</p>
        <p className="mt-0.5 text-[10px] text-white/60">Every 1st · locked</p>
      </div>

      {/* Middle card — orange */}
      <div
        className="absolute right-2 top-3 h-[118px] w-[78%] rotate-[8deg] rounded-[1.35rem] bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 p-4 text-white shadow-2xl shadow-orange-500/30 sm:h-[128px]"
        aria-hidden
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-white/80">Daily transport</p>
          <Icon name="clock" size={13} className="text-white/70" />
        </div>
        <p className="mt-5 text-lg font-extrabold tracking-tight">Ksh 250</p>
        <p className="mt-0.5 text-[10px] text-white/65">Returns each weekday</p>
      </div>

      {/* Front card — dark balance (Orient-style) */}
      <div className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2 rounded-[1.35rem] bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4 text-white shadow-2xl shadow-zinc-900/40 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-orange-500/35 blur-2xl" />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium text-zinc-400">Total locked</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight sm:text-[1.65rem]">Ksh 48,500</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold tracking-wide text-white/90">
            PYTIF
          </span>
        </div>
        <div className="relative mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
          </div>
          <span className="text-[10px] text-zinc-500">3 active</span>
        </div>
      </div>
    </div>
  )
}
