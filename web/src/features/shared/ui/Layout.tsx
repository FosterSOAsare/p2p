import { NavLink, Link, Outlet } from 'react-router-dom'
import { Handshake, Store, ShieldCheck, Palette } from 'lucide-react'

const primaryNavItems = [
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/escrow', label: 'Escrow', icon: ShieldCheck },
]

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white">
              <Handshake size={18} />
            </span>
            <span className="font-display text-lg font-semibold">P2P Trust Market</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {primaryNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/sell"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sell
            </Link>
            <Link to="/login" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Sign up
            </Link>
            <span className="mx-1 h-6 w-px bg-slate-200" />
            <Link
              to="/style-guide"
              title="Style Guide"
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <Palette size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
