import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Logo, ThemeToggle } from './ui.jsx'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useInactivityLogout } from '../hooks/useInactivityLogout.js'
import PwaInstallPrompt from './PwaInstallPrompt.jsx'

const tabs = [
  { to: '/app', label: 'Home', end: true, icon: 'home' },
  { to: '/app/history', label: 'History', icon: 'receipt' },
  { to: '/app/profile', label: 'Profile', icon: 'profile' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  useInactivityLogout(async () => {
    await logout()
    navigate('/login', { replace: true, state: { reason: 'inactivity' } })
  }, Boolean(user))
  const location = useLocation()
  const path = location.pathname
  const isHome = path === '/app'
  const isHistory = path === '/app/history'
  const isProfile = path === '/app/profile'
  const isNotifications = path === '/app/notifications'
  const isAnalytics = path === '/app/analytics'
  const mobileFixed = isHome || isNotifications || isAnalytics || isHistory || isProfile
  const scrollUnderNav = mobileFixed

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => {
      const lockMobile = (isHome || isAnalytics) && mq.matches
      document.documentElement.classList.toggle('home-no-scroll', lockMobile)
      document.body.classList.toggle('home-no-scroll', lockMobile)
      document.documentElement.classList.toggle(
        'hide-page-scrollbar',
        isHome || isNotifications || isAnalytics || isHistory || isProfile,
      )
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.documentElement.classList.remove('home-no-scroll', 'hide-page-scrollbar')
      document.body.classList.remove('home-no-scroll')
    }
  }, [isHome, isAnalytics, isHistory, isNotifications, isProfile])

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-bg-decor min-h-screen bg-app lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo size={40} />
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300'
                    : 'text-ink-soft hover:bg-surface-soft'
                }`
              }
            >
              <Icon name={t.icon} size={22} />
              {t.label}
            </NavLink>
          ))}

          <NavLink
            to="/app/new"
            className="press mt-3 flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Icon name="rocket" size={18} strokeWidth={2.2} />
            New schedule
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <div className="flex items-center justify-between rounded-2xl px-3 py-1.5">
            <span className="text-xs font-medium text-ink-muted">Appearance</span>
            <ThemeToggle withLabel />
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft"
          >
            <Avatar src={user?.avatar_url} name={user?.name} size={28} rounded="rounded-full" />
            <span className="flex-1 truncate text-left">{user?.name || 'Account'}</span>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <main
          key={location.pathname}
          className={`flex-1 animate-fade-in px-5 max-lg:pt-0 lg:px-10 lg:pb-12 lg:pt-8 ${
            mobileFixed
              ? `max-lg:flex max-lg:h-dvh max-lg:max-h-dvh max-lg:flex-col max-lg:overflow-hidden ${
                  scrollUnderNav ? 'max-lg:pb-0' : 'max-lg:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]'
                }`
              : 'pb-28'
          }`}
        >
          <div
            className={`mx-auto w-full max-w-5xl ${
              mobileFixed ? 'max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col' : ''
            }`}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating mobile bottom nav (Home · History · Profile) */}
      <PwaInstallPrompt />
      <nav className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-30 -translate-x-1/2 lg:hidden">
        <div className="flex items-center gap-2 rounded-[1.75rem] bg-neutral-900 p-2 shadow-float dark:bg-neutral-800">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              aria-label={t.label}
              className={({ isActive }) =>
                `press grid h-12 w-12 place-items-center rounded-2xl transition-colors ${
                  isActive ? 'bg-orange-500 text-white shadow-glow' : 'text-neutral-400 hover:text-white'
                }`
              }
            >
              <Icon name={t.icon} size={22} strokeWidth={2.1} />
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
