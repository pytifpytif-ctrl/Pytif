import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from '../components/icons.jsx'
import { Logo } from '../components/ui.jsx'
import ExampleCard from '../components/landing/ExampleCard.jsx'
import ScenarioCard from '../components/landing/ScenarioCard.jsx'
import PromiseItem from '../components/landing/PromiseItem.jsx'
import { SlideEyebrow, SlideFrame, StepPills } from '../components/landing/SlideFrame.jsx'
import {
  DAILY_SCHEDULE_ROWS,
  LANDING_SLIDES,
  TRIP_WALLET_ROWS,
} from '../content/landingSlides.js'

export default function Landing() {
  const { user } = useAuth()
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const active = LANDING_SLIDES[slide]
  const primaryTo = user ? '/app' : '/register'
  const primaryLabel = user ? 'Open app' : 'Lock my money now'

  const goTo = useCallback((index) => {
    setSlide(((index % LANDING_SLIDES.length) + LANDING_SLIDES.length) % LANDING_SLIDES.length)
  }, [])

  const goNext = useCallback(() => {
    setSlide((i) => (i + 1) % LANDING_SLIDES.length)
  }, [])

  const goPrev = useCallback(() => {
    setSlide((i) => (i - 1 + LANDING_SLIDES.length) % LANDING_SLIDES.length)
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('home-no-scroll', 'hide-page-scrollbar')
    document.body.classList.add('home-no-scroll')
    return () => {
      document.documentElement.classList.remove('home-no-scroll', 'hide-page-scrollbar')
      document.body.classList.remove('home-no-scroll')
    }
  }, [])

  // Fallback advance when motion is reduced (CSS animation completes instantly).
  useEffect(() => {
    if (paused) return undefined
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setTimeout(goNext, active.durationMs)
    return () => window.clearTimeout(timer)
  }, [slide, paused, active.durationMs, goNext])

  return (
    <div className="landing-shell relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
      <main className="relative z-10 mx-auto flex h-full w-full max-w-[390px] flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-2 flex shrink-0 items-center">
          <Logo size={56} wordmark className="[&_span:last-child]:text-white" />
        </div>

        <HeroCards />

        <header className="mb-1.5 mt-2 flex shrink-0 items-center justify-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            Pay yourself in the future
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <StatusProgress slide={slide} paused={paused} onSelect={goTo} onAdvance={goNext} />

          <div
            className="relative mt-1 max-h-[min(340px,42dvh)] min-h-[200px] flex-1"
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
          >
            <button
              type="button"
              aria-label="Previous story"
              className="absolute inset-y-0 left-0 z-10 w-[28%]"
              onClick={goPrev}
            />
            <button
              type="button"
              aria-label="Next story"
              className="absolute inset-y-0 right-0 z-10 w-[28%]"
              onClick={goNext}
            />

            <article
              key={active.id}
              className="landing-card pointer-events-none relative flex h-full max-h-full flex-col overflow-y-auto rounded-xl p-3.5 animate-slide-up"
            >
              <SlideBody slide={active} />
            </article>
          </div>
        </div>

        <div className="mt-2 shrink-0 space-y-2">
          <Link
            to={primaryTo}
            className="btn-primary press flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold"
          >
            {user ? (
              <>
                <Icon name="rocket" size={18} strokeWidth={2.2} />
                {primaryLabel}
              </>
            ) : (
              <>
                <Icon name="signUp" size={24} />
                {primaryLabel}
              </>
            )}
          </Link>
          {!user && (
            <Link
              to="/login"
              className="press flex h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-transparent text-[15px] font-semibold text-zinc-400"
            >
              <Icon name="rocket" size={18} strokeWidth={2.2} />
              Sign in
            </Link>
          )}
        </div>

        <footer className="mt-3 flex shrink-0 items-center justify-between text-[13px] text-zinc-600">
          <span>© 2026 Jiokoe</span>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-zinc-500 no-underline transition hover:text-zinc-300">
              Terms
            </Link>
            <Link to="/privacy" className="text-zinc-500 no-underline transition hover:text-zinc-300">
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}

function StatusProgress({ slide, paused, onSelect, onAdvance }) {
  return (
    <div className="mb-2 flex shrink-0 gap-[3px]" role="tablist" aria-label="Story progress">
      {LANDING_SLIDES.map((s, i) => {
        const isPast = i < slide
        const isCurrent = i === slide
        const durationMs = s.durationMs

        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-label={`Story ${i + 1} of ${LANDING_SLIDES.length}`}
            onClick={() => onSelect(i)}
            className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-700/90"
          >
            {isPast && <span className="absolute inset-0 rounded-full bg-orange-500" />}
            {isCurrent && (
              <span
                key={`progress-${slide}-${durationMs}`}
                className="landing-status-fill absolute inset-y-0 left-0 rounded-full bg-orange-500"
                style={{
                  animationDuration: `${durationMs}ms`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
                onAnimationEnd={(e) => {
                  if (i !== slide || e.animationName !== 'landing-status-fill' || paused) return
                  onAdvance()
                }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

function SlideBody({ slide }) {
  switch (slide.type) {
    case 'hero-headline':
      return (
        <SlideFrame accent="amber" icon="wallet" centered iconSize={24}>
          <SlideEyebrow>Jiokoe</SlideEyebrow>
          <h1 className="text-[23px] font-medium leading-[1.32] tracking-[-0.3px] text-white">
            Have you ever had money for 10 days…
            <br />
            and spent it <span className="text-[#F59E0B]">all on day one</span>?
          </h1>
        </SlideFrame>
      )

    case 'hero-sub':
      return (
        <SlideFrame accent="orange" icon="trend" centered>
          <p className="text-[14px] leading-[1.65] text-zinc-300">
            We know the feeling. Pocket money, side hustle, allowance — it lands and you feel rich.
            <br />
            Then somehow by the 5th, bills are due and you&apos;re skipping lunch.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-500/25 bg-orange-500/10 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
            <span className="text-[13px] text-zinc-300">There&apos;s a better way. It&apos;s called Jiokoe.</span>
          </div>
        </SlideFrame>
      )

    case 'mirror-title':
      return (
        <SlideFrame accent="orange" icon="moodSad">
          <h2 className="text-lg font-semibold leading-snug text-white">
            Do the next few examples sound familiar?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
            Swipe through — you might recognise your own week.
          </p>
        </SlideFrame>
      )

    case 'scenario':
      return (
        <SlideFrame accent="orange">
          <ScenarioCard dark icon={slide.icon} text={slide.text} />
        </SlideFrame>
      )

    case 'quote':
      return (
        <SlideFrame accent="orange" icon="phone">
          <div className="rounded-xl border border-zinc-700/80 bg-zinc-800/50 p-4 ring-1 ring-orange-500/15">
            <blockquote className="border-l-[3px] border-orange-500 py-0.5 pl-3 text-[14px] italic leading-[1.65] text-zinc-100">
              &ldquo;The problem isn&apos;t how much you get. It&apos;s that money sitting in your Mpesa is money you
              will spend. Jiokoe fixes that.&rdquo;
            </blockquote>
          </div>
        </SlideFrame>
      )

    case 'what-title':
      return (
        <SlideFrame accent="orange" icon="clock">
          <SlideEyebrow>What is Jiokoe</SlideEyebrow>
          <h2 className="text-xl font-semibold leading-[1.35] tracking-[-0.3px] text-white">
            You send yourself money in the future.
          </h2>
        </SlideFrame>
      )

    case 'what-body':
      return (
        <SlideFrame accent="orange" icon="lock">
          <p className="text-[14px] leading-[1.65] text-zinc-300">
            At Jiokoe, you lock your money and tell us when to send it back to you — down to the exact time of
            day. We hold it. We send it. You get it only when you said you needed it. Not before.
          </p>
          <StepPills
            steps={[
              { icon: 'lock', label: 'Lock it' },
              { icon: 'clock', label: 'Set the time' },
              { icon: 'phone', label: 'Get it on M-Pesa' },
            ]}
          />
        </SlideFrame>
      )

    case 'card-label':
      return (
        <SlideFrame accent={slide.icon === 'beach' ? 'green' : 'orange'} icon={slide.icon} centered iconSize={24}>
          <SlideEyebrow>{slide.label}</SlideEyebrow>
          <p className="text-sm text-zinc-400">
            {slide.icon === 'beach'
              ? 'Save for a goal — add funds whenever you can.'
              : 'Small sends, exact times, every weekday.'}
          </p>
        </SlideFrame>
      )

    case 'daily-card':
      return (
        <SlideFrame accent="orange">
          <ExampleCard
            dark
            headerColor="#ea580c"
            headerIcon="clock"
            headerTitle="Jane's daily schedule · Mon – Fri"
            rows={DAILY_SCHEDULE_ROWS}
            footerLeft="Locked for 20 days"
            footerRight="Ksh 9,600 total"
            footerRightColor="#fafafa"
            defaultAmountColor="#fb923c"
          />
        </SlideFrame>
      )

    case 'connector':
      return (
        <SlideFrame accent="orange" icon="bolt">
          <p className="text-[14px] leading-[1.65] text-zinc-300">
            Every day at exactly those times, Jiokoe sends the money to your Mpesa. Not a shilling more. So when
            you go out at night and overspend — the next morning your transport money still arrives. Your lunch
            still arrives. Your life keeps running.
          </p>
          <StepPills
            steps={[
              { icon: 'clock', label: '6:00 AM transport' },
              { icon: 'clock', label: '12:00 PM lunch' },
              { icon: 'phone', label: 'Your M-Pesa' },
            ]}
          />
        </SlideFrame>
      )

    case 'trip-card':
      return (
        <SlideFrame accent="green">
          <ExampleCard
            dark
            headerColor="#059669"
            headerIcon="beach"
            headerTitle="Mombasa trip · December 20th"
            rows={TRIP_WALLET_ROWS}
            footerLeft="Add more until trip day"
            footerRight="All arrives Dec 20, 6AM"
            footerRightColor="#34d399"
            defaultAmountColor="#34d399"
          />
        </SlideFrame>
      )

    case 'trip-close':
      return (
        <SlideFrame accent="green" icon="beach">
          <p className="text-[14px] leading-[1.65] text-zinc-300">
            Create a trip wallet for Mombasa (or any goal). Add funds manually whenever you can — then on the exact
            date and time you pick, Jiokoe sends it all to your Mpesa. That trip is finally happening.
          </p>
          <StepPills
            steps={[
              { icon: 'plus', label: 'Add funds' },
              { icon: 'lock', label: 'Stay locked' },
              { icon: 'phone', label: 'Payout day' },
            ]}
          />
        </SlideFrame>
      )

    case 'promise-header':
      return (
        <SlideFrame accent="orange" icon="shield">
          <SlideEyebrow>Why Jiokoe works</SlideEyebrow>
          <h2 className="text-xl font-semibold leading-[1.32] tracking-[-0.3px] text-white">
            Money locked. Safe. Comes when you need it.
          </h2>
        </SlideFrame>
      )

    case 'promise-item':
      return (
        <SlideFrame accent="orange">
          <PromiseItem dark icon={slide.icon} title={slide.title} subtitle={slide.subtitle} />
        </SlideFrame>
      )

    case 'tagline':
      return (
        <SlideFrame accent="orange" icon="lock" centered iconSize={26}>
          <p className="text-[24px] font-semibold leading-[1.28] tracking-[-0.5px] text-white">
            Lock it now.
            <br />
            <span className="text-orange-500">Don&apos;t regret later.</span>
          </p>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">Jiokoe — pay yourself in the future.</p>
        </SlideFrame>
      )

    default:
      return null
  }
}

function HeroCards() {
  return (
    <div className="relative mx-auto h-[124px] w-full max-w-[min(268px,94vw)] shrink-0 animate-scale-in">
      <div className="absolute left-1/2 top-0 w-full max-w-[268px] origin-top -translate-x-1/2 scale-[0.9] min-[380px]:scale-[0.96]">
        <div className="relative h-[132px] w-full">
          {/* Small cards — sit behind */}
          <div className="absolute inset-x-0 top-0 z-0 -translate-x-3 min-[380px]:-translate-x-4">
            <div
              className="absolute left-0 top-0 h-[72px] w-[72%] max-w-[168px] -rotate-[12deg] rounded-[1rem] bg-gradient-to-br from-zinc-800 to-zinc-950 p-3 text-white ring-1 ring-white/10"
              aria-hidden
            >
              <p className="text-[8px] font-medium text-zinc-500">Bills fund</p>
              <p className="mt-2 text-sm font-extrabold tracking-tight">Ksh 12,000</p>
              <p className="mt-0.5 text-[8px] text-zinc-600">Every 1st · locked</p>
            </div>

            <div
              className="absolute right-5 top-1 h-[66px] w-[64%] max-w-[152px] rotate-[8deg] rounded-[1rem] money-card p-2.5 shadow-lg shadow-orange-900/30"
              aria-hidden
            >
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-medium text-white/85">Daily transport</p>
                <Icon name="clock" size={10} className="text-white/70" />
              </div>
              <p className="mt-1.5 text-sm font-extrabold tracking-tight">Ksh 250</p>
              <p className="mt-0.5 text-[8px] text-white/70">Returns each weekday</p>
            </div>
          </div>

          {/* Main card — larger, right, overlaps the two above */}
          <div className="animate-stk-float absolute bottom-0 right-0 z-20 w-[88%] max-w-[236px] rounded-[1rem] bg-zinc-900 p-3 text-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
            <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-orange-500/25 blur-2xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div>
                <p className="text-[8px] font-medium text-zinc-500">Total locked</p>
                <p className="mt-0.5 text-lg font-extrabold tracking-tight">Ksh 48,500</p>
              </div>
              <span className="rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[7px] font-bold tracking-wide text-orange-300">
                JIOKOE
              </span>
            </div>
            <div className="relative mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[68%] rounded-full bg-orange-500" />
              </div>
              <span className="text-[8px] text-zinc-600">3 active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
