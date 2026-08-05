import { useState, useEffect } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMe, useLogout } from '../../auth/data/authApi'
import { useMessageNotifications } from '../../messages/data/useMessageNotifications'
import { useUnreadTotal } from '../../messages/data/messagesApi'
import { useNotificationEvents } from '../../notifications/data/useNotificationEvents'
import { useUnreadNotifications } from '../../notifications/data/notificationsApi'
import { NotificationPanel } from '../../notifications/ui/NotificationPanel'
import type { LucideIcon } from 'lucide-react'
import {
  Handshake,
  Store,
  ShieldCheck,
  AlertTriangle,
  Menu,
  X,
  ShoppingBag,
  Settings,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Package,
  Sun,
  Moon,
  PlusCircle,
  FileText,
  Heart,
  Wallet,
  Scale,
  Users,
  MessageSquare,
  PackageSearch,
  Bell,
} from 'lucide-react'
import { Footer } from './Footer'

/** Unread pill on a nav entry. Capped so a busy inbox can't stretch the item. */
function UnreadDot({ count }: { count: number }) {
  return (
    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  )
}

const dropdownLinkClass =
  'flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-primary-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'

// Dark/Light Mode Theme (class strategy on <html>, with system fallback)
function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('p2p_theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!document.documentElement.classList.contains('dark'))
}

export function Layout() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { data: me } = useMe()
  const logout = useLogout()
  const isLoggedIn = Boolean(me)

  // Opens the session-wide socket and keeps the inbox/unread counts fresh.
  useMessageNotifications()
  const unreadTotal = useUnreadTotal()

  // Same socket, different room traffic — notices arrive on every page, which
  // is the whole point of a notification.
  useNotificationEvents()
  const unreadNotifications = useUnreadNotifications()

  // Role-aware navigation: admin (account role) > seller (KYC-verified) > buyer.
  // /dashboard renders the right component per persona, so every role points there.
  const isAdmin = me?.role === 'admin'
  const isSeller = !isAdmin && me?.kycStatus === 'verified'

  // Admins get a dedicated review surface only — no marketplace/escrow/buyer chrome.
  const primaryNavItems: { to: string; label: string; icon: LucideIcon; badge?: number }[] = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck },
        { to: '/admin/disputes', label: 'Disputes', icon: Scale },
        // Next to Disputes — the two moderation queues belong together, and a
        // listing appeal is reviewed from here.
        { to: '/admin/listings', label: 'Listings', icon: PackageSearch },
        { to: '/admin/users', label: 'Users', icon: Users }
      ]
    : [
        { to: '/marketplace', label: 'Marketplace', icon: Store },
        // One unified deals list — a buyer/seller sees their own deals (scoped server-side)
        ...(isLoggedIn ? [{ to: '/deals', label: 'My Deals', icon: ShieldCheck }] : []),
        ...(isLoggedIn
          ? [{ to: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadTotal }]
          : []),
        // Sellers manage listings, buyers can become sellers
        ...(isSeller
          ? [{ to: '/listings', label: 'My Listings', icon: Package }]
          : [{ to: '/sell', label: 'Sell Goods', icon: Store }]),
      ]

  // Apply saved (or system-preferred) theme on first mount
  useEffect(() => {
    const saved = localStorage.getItem('p2p_theme')
    const dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const location = useLocation()
  const isHomePage = location.pathname === '/'
  // The inbox owns the viewport: no footer, no page scroll — only the message
  // list and the conversation list scroll, inside their own panes.
  const isChatPage = location.pathname === '/messages'

  // Automatically scroll to top when route changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div
      className={`${
        isChatPage ? 'h-screen overflow-hidden' : 'min-h-screen'
      } flex flex-col transition-colors duration-300 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100`}
    >
      <header className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-300 border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md transition-transform group-hover:scale-105">
              <Handshake size={20} />
            </span>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              P2P Trust Market
            </span>
          </Link>

          {/* Desktop Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryNavItems.map(({ to, label, icon: Icon, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-bold border border-primary-200/80 dark:bg-primary-950 dark:text-primary-400 dark:border-primary-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900'
                  }`
                }
              >
                <Icon size={15} />
                {label}
                {Boolean(badge) && <UnreadDot count={badge!} />}
              </NavLink>
            ))}
          </nav>

          {/* Action Links, Theme Toggle & Profile Dropdown */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              {/* + New Escrow Deal CTA Button — buyer/seller only */}
              {!isAdmin && (
                <Link
                  to="/escrow/new"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-primary-700 transition-all cursor-pointer"
                >
                  <PlusCircle size={15} /> New Deal
                </Link>
              )}

              {isLoggedIn && !isAdmin && (
                <Link
                  to="/wallet"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                  title="Payout Wallet & Balances"
                >
                  <Wallet size={16} />
                </Link>
              )}

              {isLoggedIn ? (
                /* Logged-In User Profile Pill & Dropdown */
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 rounded-xl border p-1.5 pr-2.5 text-xs font-semibold transition-all cursor-pointer border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {me?.avatarUrl ? (
                      <img src={me.avatarUrl} alt="User Avatar" className="h-6 w-6 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-600 text-[11px] font-bold text-white uppercase">
                        {me?.username.charAt(0)}
                      </span>
                    )}
                    <span>{me?.username}</span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl border p-2 shadow-2xl animate-fade-in z-50 text-xs space-y-0.5 border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-3 py-2 border-b mb-1 border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-900 dark:text-white">{me?.fullName}</p>
                        <p className="text-[11px] text-slate-400 truncate">{me?.email}</p>
                      </div>

                      {!isAdmin && (
                        <>
                          <Link to="/dashboard" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <LayoutDashboard size={15} /> Dashboard
                          </Link>

                          <Link to="/wallet" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <Wallet size={15} /> Payout Wallet
                          </Link>

                          <Link to="/deals" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <ShoppingBag size={15} /> {isSeller ? 'My Sales' : 'My Orders'}
                          </Link>
                        </>
                      )}

                      {/* Opens the panel rather than routing — the panel is the
                          only notifications surface, so there's nowhere to go. */}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setNotificationsOpen(true)
                        }}
                        className={`w-full cursor-pointer ${dropdownLinkClass}`}
                      >
                        <Bell size={15} /> Notifications
                        {unreadNotifications > 0 && <UnreadDot count={unreadNotifications} />}
                      </button>

                      {/* Outside the !isAdmin gate — admins hold threads too
                          (dispute follow-ups), and their nav omits Messages. */}
                      <Link to="/messages" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                        <MessageSquare size={15} /> Messages
                        {unreadTotal > 0 && <UnreadDot count={unreadTotal} />}
                      </Link>

                      {!isSeller && !isAdmin && (
                        <Link to="/bookmarks" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                          <Heart size={15} className="text-rose-500" /> My Bookmarks
                        </Link>
                      )}

                      {isSeller && (
                        <Link to="/listings" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                          <Package size={15} /> My Listings
                        </Link>
                      )}

                      {!isAdmin && (
                        <Link to="/deals?tab=disputed" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                          <AlertTriangle size={15} /> Disputes
                        </Link>
                      )}

                      <Link to="/settings" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                        <Settings size={15} /> Account Settings
                      </Link>

                      <Link to="/terms" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                        <FileText size={15} /> Terms & Legal Policy
                      </Link>

                      {me?.role === 'admin' && (
                        <div className="pt-1 border-t mt-1 border-slate-100 dark:border-slate-800">
                          <span className="block px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Admin
                          </span>
                          <Link to="/admin" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <LayoutDashboard size={15} /> Dashboard
                          </Link>
                          <Link to="/admin/kyc" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <ShieldCheck size={15} /> KYC Review Queue
                          </Link>
                          <Link to="/admin/disputes" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <Scale size={15} /> Disputes Arbitration
                          </Link>
                          <Link to="/admin/listings" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <PackageSearch size={15} /> Listings Moderation
                          </Link>
                          <Link to="/admin/users" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <Users size={15} /> User Management
                          </Link>
                          <Link to="/deals" onClick={() => setUserDropdownOpen(false)} className={dropdownLinkClass}>
                            <Handshake size={15} /> Escrow Deals Oversight
                          </Link>
                        </div>
                      )}

                      <div className="pt-1 border-t mt-1 border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false)
                            logout.mutate(undefined, { onSettled: () => navigate('/') })
                          }}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold cursor-pointer"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-colors border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-xl bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Notifications bell — outside the `hidden sm:flex` group above so
                it stays reachable on mobile, where the panel goes full-width. */}
            {isLoggedIn && (
              <button
                onClick={() => setNotificationsOpen(true)}
                aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} unread)` : 'Notifications'}
                title="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell size={17} />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>
            )}

            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              title="Toggle Theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-amber-400 dark:hover:bg-slate-800"
            >
              <Sun size={17} className="hidden dark:block" />
              <Moon size={17} className="dark:hidden" />
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border transition-all border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Toggle Navigation Drawer"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t p-4 animate-fade-in border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
            <nav className="space-y-1">
              {primaryNavItems.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-bold dark:bg-primary-950 dark:text-primary-400'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                  {Boolean(badge) && <UnreadDot count={badge!} />}
                </NavLink>
              ))}

              {!isAdmin && (
                <Link
                  to="/escrow/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-xs font-bold text-white shadow-md my-2"
                >
                  <PlusCircle size={16} /> Create New Escrow Deal
                </Link>
              )}

              <div className="pt-2 border-t space-y-1 font-medium border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3">Account & Support</span>
                {!isAdmin && (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      to="/wallet"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                      <Wallet size={16} /> Payout Wallet
                    </Link>
                  </>
                )}
                {!isAdmin && (
                  <Link
                    to="/deals"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <ShoppingBag size={16} /> {isSeller ? 'My Sales' : 'My Orders'}
                  </Link>
                )}
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setNotificationsOpen(true)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer"
                  >
                    <Bell size={16} /> Notifications
                    {unreadNotifications > 0 && <UnreadDot count={unreadNotifications} />}
                  </button>
                )}
                {isLoggedIn && (
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <MessageSquare size={16} /> Messages
                  </Link>
                )}
                {!isSeller && !isAdmin && (
                  <Link
                    to="/bookmarks"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <Heart size={16} className="text-rose-500" /> My Bookmarks
                  </Link>
                )}
                {isSeller && (
                  <Link
                    to="/listings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <Package size={16} /> My Listings
                  </Link>
                )}
                {!isAdmin && (
                  <Link
                    to="/deals?tab=disputed"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <AlertTriangle size={16} /> Disputes
                  </Link>
                )}
                <Link
                  to="/terms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  <FileText size={16} /> Terms & Privacy
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className={`w-full flex-1 ${isChatPage ? 'min-h-0' : ''}`}>
        {isHomePage ? (
          <Outlet />
        ) : (
          <div className={`mx-auto max-w-6xl px-3 sm:px-6 ${isChatPage ? 'h-full py-3' : 'py-3 sm:py-8'}`}>
            <Outlet />
          </div>
        )}
      </main>
      {!isChatPage && <Footer />}

      {isLoggedIn && (
        <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      )}
    </div>
  )
}
