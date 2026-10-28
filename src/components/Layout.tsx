import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: '출제', end: true },
  { to: '/topics', label: '목록' },
  { to: '/review', label: '복습' },
  { to: '/settings', label: '설정' },
]

export default function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-20 bg-paper/95 backdrop-blur border-b border-rule">
        <div className="mx-auto max-w-3xl px-4 h-12 flex items-center justify-between">
          <NavLink to="/" className="font-semibold tracking-tight text-ink no-underline">
            기술사 답안 연습
          </NavLink>
          <nav className="hidden sm:flex gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm no-underline ${
                    isActive ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-rule/60'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-5 pb-24 sm:pb-10">
        <Outlet />
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-sheet border-t border-rule pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-14">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center justify-center text-sm no-underline ${
                  isActive ? 'text-ink font-semibold' : 'text-ink-3'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
