import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo, ThemeToggle } from './ui.jsx'
import { Icon } from './icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const tabs = [
  { to: '/app', label: 'Home', end: true, icon: 'home' },
  { to: '/app/history', label: 'History', icon: 'history' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-app lg:flex">
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
            className="press mt-3 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-float transition hover:bg-brand-700"
          >
            <Icon name="plus" size={18} strokeWidth={2.4} />
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
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 truncate text-left">{user?.name || 'Account'}</span>
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <main key={location.pathname} className="flex-1 animate-fade-in px-5 pb-28 pt-2 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-surface/95 px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-around">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand-600 dark:text-brand-300' : 'text-ink-muted'
                }`
              }
            >
              <Icon name={t.icon} size={22} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
