import { NavLink, Outlet } from 'react-router-dom'

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

export default function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#f4f6fb]">
      <main className="flex-1 px-5 pb-28 pt-2">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-100 bg-white/95 px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
