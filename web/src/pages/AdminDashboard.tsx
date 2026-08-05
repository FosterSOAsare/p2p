import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  Package,
  Scale,
  Handshake,
  ClipboardCheck,
  Wallet,
  Ban,
  Flag,
  Loader2,
} from 'lucide-react'
import { useAdminStats, type DealStatus } from '../features/admin/data/adminStatsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'

const DEAL_STATUSES: { id: DealStatus; label: string; className: string }[] = [
  { id: 'created', label: 'Created', className: 'text-slate-600 dark:text-slate-300' },
  { id: 'funded', label: 'Funded', className: 'text-blue-600 dark:text-blue-400' },
  { id: 'delivered', label: 'Delivered', className: 'text-amber-600 dark:text-amber-400' },
  { id: 'disbursed', label: 'Completed', className: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'disputed', label: 'Disputed', className: 'text-rose-600 dark:text-rose-400' },
  { id: 'cancelled', label: 'Cancelled', className: 'text-slate-500 dark:text-slate-400' },
]

function StatCard({
  icon,
  label,
  value,
  sub,
  to,
  accent = 'text-primary-600 dark:text-primary-400',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  to?: string
  accent?: string
}) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm h-full transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${accent}`}>
        {icon} {label}
      </div>
      <p className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-2">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  )
}

export function AdminDashboard() {
  const { data: stats, isLoading, isError, error } = useAdminStats()

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Platform Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Live snapshot of accounts, listings, escrow deals, and the review queues.
            </p>
          </div>
          <AdminSectionNav />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(error)}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Primary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users size={14} />}
              label="Total Users"
              value={stats.users.toLocaleString()}
              sub={`${stats.suspendedUsers} suspended`}
              to="/admin/users"
            />
            <StatCard
              icon={<Package size={14} />}
              label="Active Listings"
              value={stats.activeListings.toLocaleString()}
              accent="text-sky-600 dark:text-sky-400"
              // Every tile doubles as a way in; this one lands pre-filtered.
              to="/admin/listings?status=active"
            />
            <StatCard
              icon={<Wallet size={14} />}
              label="Settled Volume"
              value={formatMoney(stats.ghsVolume, 'GHS')}
              sub="Completed (disbursed) deals"
              accent="text-emerald-600 dark:text-emerald-400"
              to="/deals?status=disbursed"
            />
            <StatCard
              icon={<ClipboardCheck size={14} />}
              label="KYC Pending"
              value={stats.kycPending.toLocaleString()}
              sub="Awaiting review"
              to="/admin/kyc"
              accent="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<Scale size={14} />}
              label="Open Disputes"
              value={stats.openDisputes.toLocaleString()}
              sub="Need a ruling"
              to="/admin/disputes"
              accent="text-rose-600 dark:text-rose-400"
            />
            <StatCard
              icon={<Flag size={14} />}
              label="Open Reports"
              value={stats.openReports.toLocaleString()}
              sub="Flagged by buyers"
              to="/admin/reports"
              accent="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<Handshake size={14} />}
              label="Total Deals"
              value={stats.totalDeals.toLocaleString()}
              to="/deals"
            />
          </div>

          {/* Deals by status */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-slate-900 dark:text-white text-sm">Escrow deals by status</h2>
              <Link to="/deals" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Oversight →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {DEAL_STATUSES.map((s) => (
                <Link
                  key={s.id}
                  to={`/deals?status=${s.id}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center hover:border-primary-300 dark:hover:border-primary-600 transition-all"
                >
                  <p className={`font-display text-2xl font-bold ${s.className}`}>{stats.dealsByStatus[s.id]}</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {stats.suspendedUsers > 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Ban size={15} />
              {stats.suspendedUsers} account{stats.suspendedUsers === 1 ? ' is' : 's are'} currently suspended.
              <Link to="/admin/users?status=suspended" className="font-bold underline ml-1">
                Review
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
