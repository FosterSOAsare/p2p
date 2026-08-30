import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldCheck,
  Scale,
  Users,
  Handshake,
  PackageSearch,
  Flag,
  Banknote,
} from 'lucide-react'
import { useAdminStats } from '../data/adminStatsApi'

const items = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/kyc', label: 'KYC Reviews', icon: ShieldCheck },
  { to: '/admin/disputes', label: 'Disputes', icon: Scale },
  { to: '/admin/listings', label: 'Listings', icon: PackageSearch },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: Banknote },
  { to: '/deals', label: 'Deals', icon: Handshake },
]

/** Shared sub-navigation across the admin console pages. */
export function AdminSectionNav() {
  // Reports are the one queue buyers can fill without an admin looking, so the
  // count rides the nav. Cached (see useAdminStats) — this mounts on every page.
  const { data: stats } = useAdminStats()
  const openReports = stats?.openReports ?? 0

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/admin'}
          className={({ isActive }) =>
            `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              isActive
                ? 'font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`
          }
        >
          <Icon size={13} /> {label}
          {to === '/admin/reports' && openReports > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {openReports}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  )
}
