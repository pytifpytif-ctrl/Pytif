import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from './ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const tabs = [
  {
    to: '/app',
    label: 'Home',
    end: true,
    icon: (
      <path d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" strokeWidth="2" />
    ),
  },
  {
    to: '/app/history',
    label: 'History',
    icon: (
      <>
        <circle cx="12" cy="12" r="9" strokeWidth="2" />
        <path d="M12 7v5l3 2" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
]

function NavIcon({ children }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
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
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-slate-50'
                }`
              }
            >
              <NavIcon>{t.icon}</NavIcon>
              {t.label}
            </NavLink>
          ))}

          <NavLink
            to="/app/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-float transition hover:bg-brand-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            New schedule
          </NavLink>
        </nav>

        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-slate-50"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 truncate text-left">{user?.name || 'Account'}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeWidth="2" />
          </svg>
        </button>
      </aside>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <main className="flex-1 px-5 pb-28 pt-2 lg:px-10 lg:pb-12 lg:pt-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-around">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-xs font-medium transition ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`
              }
            >
              <NavIcon>{t.icon}</NavIcon>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
