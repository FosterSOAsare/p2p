import { NavLink, useLocation } from 'react-router-dom'
import { Home, Store, ShieldCheck, Package, type LucideIcon } from 'lucide-react'
import { useMe } from '../../auth/data/authApi'

/**
 * The phone's primary navigation, below `md`.
 *
 * The site used to hand off to a hamburger drawer at this width — a narrower
 * desktop rather than an app. These are the same four destinations the Expo
 * app puts in its bottom bar (`mobile/src/app/(app)/(tabs)/_layout.tsx`), in the
 * same order, so moving between the two doesn't mean relearning where anything
 * is. Thumb-reachable and always present, which is the actual difference
 * between a site that works on a phone and one that feels like an app.
 *
 * The drawer stays for everything else — wallet, messages, orders, settings,
 * sign out. Four is the bar's whole point; a fifth and sixth would crowd the
 * labels and it would stop reading as a tab bar. The same reasoning is written
 * into the app's console layout, which refuses a sixth tab for Reports.
 */

interface Tab {
  to: string
  label: string
  icon: LucideIcon
}

export function MobileTabBar() {
  const { data: me } = useMe()
  const location = useLocation()

  const isAdmin = me?.role === 'admin'
  const isSeller = !isAdmin && me?.kycStatus === 'verified'

  /*
    Signed out gets nothing: there is no dashboard or deals list to go to, and a
    bar of two would look broken. The header still carries Log in / Sign up.

    Admins get nothing either — their console is six queues, which is a different
    navigation problem and not what this bar is for. They keep the drawer.
  */
  if (!me || isAdmin) return null

  // The inbox owns the viewport and puts its composer against the bottom edge;
  // a bar over it would sit on the send button.
  if (location.pathname === '/messages') return null

  const tabs: Tab[] = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: '/marketplace', label: 'Market', icon: Store },
    { to: '/deals', label: 'Deals', icon: ShieldCheck },
    isSeller
      ? { to: '/listings', label: 'Listings', icon: Package }
      : { to: '/sell', label: 'Sell', icon: Store },
  ]

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95"
      // Clears the home indicator on phones that have one. Without it the row
      // sits under the gesture pill and the last few pixels are untappable.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* 44pt of tappable height comes from the padding above, not the
                    icon — the label is too small to be a target on its own. */}
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
