import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShoppingBag,
  Lock,
  Heart,
  Package,
  Truck,
  CheckCircle2,
  Settings,
  Plus,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { useDashboard, type DashboardResponse } from '../features/user/data/usersApi'
import { useReleaseDeal } from '../features/escrow/data/ordersApi'
import { ConfirmDialog } from '../features/shared/ui/ConfirmDialog'
import { formatMoney } from '../features/shared/libs/currency'
import { Badge } from '../features/shared/ui/Badge'
import { useMe } from '../features/auth/data/authApi'

export function UserDashboard({ dashboardData }: { dashboardData?: DashboardResponse | null }) {
  const { data: fetchDash } = useDashboard()
  const { data: me } = useMe()
  const releaseMutation = useReleaseDeal()

  const data = dashboardData ?? fetchDash

  const profile = data?.profile ?? {
    fullName: me?.fullName ?? 'User',
    username: me?.username ?? 'user',
    avatarUrl: me?.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${me?.username ?? 'user'}`,
    joinedDate: 'Recently',
    isKycVerified: me?.kycStatus === 'verified',
    kycStatus: me?.kycStatus ?? 'unverified',
  }

  const stats = data?.buyer?.stats ?? {
    activeOrdersCount: me?.stats?.activeOrdersCount ?? 0,
    escrowLockedBalance: 0,
    totalSpent: me?.stats?.totalSpent ?? 0,
    savedItemsCount: me?.stats?.savedItemsCount ?? 0,
  }

  const orders = data?.buyer?.recentOrders ?? []

  /** The order awaiting its release confirmation. */
  const [pendingRelease, setPendingRelease] = useState<(typeof orders)[number] | null>(null)

  /**
   * The release itself. Reached only from the confirmation dialog — this card
   * used to release the escrow on a single click, with no way back.
   */
  const handleConfirmReceipt = (orderId: string) => {
    releaseMutation.mutate(orderId, { onSettled: () => setPendingRelease(null) })
  }

  /*
    Same split as the deal page: with the seller's delivery on record this
    confirms a claim already made, without it the buyer is asserting receipt
    themselves.
  */
  const releaseDelivered =
    pendingRelease?.status === 'delivered' || pendingRelease?.status === 'shipped'
  /** Net of fees, matching the deal page — not the gross escrow amount. */
  const releaseAmount = pendingRelease
    ? formatMoney(pendingRelease.sellerPayout, pendingRelease.currency)
    : ''

  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Header Profile Hero Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-300">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <img
              src={profile.avatarUrl}
              alt={profile.fullName}
              className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-primary-500 shadow-md"
            />
            {profile.isKycVerified && (
              <span
                className="absolute -bottom-1 -right-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md border-2 border-white dark:border-slate-900"
                title="KYC Verified Account"
              >
                <ShieldCheck size={14} />
              </span>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h1>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">@{profile.username}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Member since {profile.joinedDate} • <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Protected Buyer</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link
            to="/deals"
            className="w-full sm:w-auto text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            My Orders
          </Link>
          <Link
            to="/settings"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm"
          >
            <Settings size={14} /> Profile Settings
          </Link>
        </div>
      </div>

      {/* Metrics Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Active Orders</span>
            <ShoppingBag size={18} className="text-primary-600 dark:text-primary-400" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {stats.activeOrdersCount}
          </p>
          <p className="text-[11px] text-slate-400">In escrow or shipped</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Escrow Locked</span>
            <Lock size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            GH₵{stats.escrowLockedBalance.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">100% Deposit Protection</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Total Purchases</span>
            <Package size={18} className="text-sky-600 dark:text-sky-400" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            GH₵{stats.totalSpent.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Across all marketplace deals</p>
        </div>

        <Link
          to="/bookmarks"
          className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm hover:border-rose-300 dark:hover:border-rose-800 transition-all block cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              Saved Items
            </span>
            <Heart size={18} className="text-rose-500 fill-rose-500" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{stats.savedItemsCount}</p>
          <p className="text-[11px] text-slate-400 group-hover:underline">View my bookmarks →</p>
        </Link>
      </div>

      {/* Quick Escrow & Orders Banner */}
      <div className="rounded-2xl bg-emerald-50 dark:bg-slate-900 p-4 sm:p-6 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md transition-colors duration-300">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">Have an off-market 3rd-party deal?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300">Create an independent escrow deal for freelance work or domain sales.</p>
        </div>
        <Link
          to="/escrow/new"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white dark:text-slate-950 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all shrink-0"
        >
          <Plus size={16} /> Start Escrow Deal
        </Link>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Recent Marketplace Orders</h2>
          <Link to="/deals" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            View All Orders →
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
            <ShoppingBag size={32} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No active or recent orders found.</p>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Badge
                      tone={
                        ord.status === 'disbursed' || ord.status === 'completed'
                          ? 'success'
                          : ord.status === 'delivered' || ord.status === 'shipped'
                          ? 'info'
                          : ord.status === 'disputed'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {(ord.status === 'disbursed' ? 'COMPLETED' : ord.status === 'delivered' ? 'SHIPPED' : ord.status).toUpperCase()}
                    </Badge>
                    <Link
                      to={`/escrow/${ord.id}`}
                      className="text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                    >
                      {ord.code || ord.id.slice(0, 8)}
                    </Link>
                    <span className="text-xs text-slate-400">• {ord.orderDate}</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Seller: <strong className="text-slate-900 dark:text-white">@{ord.vendorName}</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <Link to={`/escrow/${ord.id}`} className="shrink-0 group">
                      <img
                        src={ord.imageUrl}
                        alt={ord.title}
                        className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 group-hover:opacity-85 transition-opacity"
                      />
                    </Link>
                    <div>
                      <Link
                        to={`/escrow/${ord.id}`}
                        className="font-display font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1 hover:text-primary-600 dark:hover:text-primary-400 hover:underline block"
                      >
                        {ord.title}
                      </Link>
                      <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                        {ord.currency} {ord.price.toLocaleString()}
                      </p>
                      {ord.trackingCode && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <Truck size={12} className="text-primary-600 dark:text-primary-400" />
                          {ord.shippingCarrier}: <span className="font-mono font-semibold text-slate-900 dark:text-white">{ord.trackingCode}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full sm:w-auto flex items-center justify-end gap-2 shrink-0">
                    {ord.status === 'disputed' ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle size={14} /> Under Dispute Review
                      </span>
                    ) : ord.status === 'refunded' || ord.status === 'cancelled' ? (
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <RotateCcw size={14} /> Escrow Refunded
                      </span>
                    ) : ord.status === 'delivered' || ord.status === 'shipped' || ord.status === 'funded' ? (
                      <button
                        onClick={() => setPendingRelease(ord)}
                        disabled={releaseMutation.isPending}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {releaseMutation.isPending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Confirm Receipt & Release Escrow
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={15} /> Completed & Paid Out
                      </span>
                    )}

                    <Link
                      to={`/escrow/${ord.id}`}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      title="View Escrow Deal"
                    >
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingRelease !== null}
        tone={releaseDelivered ? 'primary' : 'danger'}
        title={releaseDelivered ? 'Release the escrow?' : 'Release without a delivery update?'}
        description={
          releaseDelivered
            ? `${pendingRelease?.vendorName ?? 'The seller'} has marked this as delivered. Confirming says you received it.`
            : `${pendingRelease?.vendorName ?? 'The seller'} has not marked this as delivered. You are confirming, on your own, that the item reached you.`
        }
        consequence={
          releaseDelivered
            ? `${releaseAmount} is released to the seller. This cannot be undone.`
            : `${releaseAmount} is released to the seller even though delivery is still pending. Only continue if you actually have the item — this cannot be undone.`
        }
        confirmLabel="Release Funds"
        cancelLabel="Not yet"
        isPending={releaseMutation.isPending}
        onCancel={() => setPendingRelease(null)}
        onConfirm={() => pendingRelease && handleConfirmReceipt(pendingRelease.id)}
      />
    </div>
  )
}

