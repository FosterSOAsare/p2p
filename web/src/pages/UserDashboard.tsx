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
} from 'lucide-react'
import { mockUserProfile, mockUserOrders, type UserOrder } from '../features/user/data/userProfile'
import { Badge } from '../features/shared/ui/Badge'

export function UserDashboard() {
  const [orders, setOrders] = useState<UserOrder[]>(mockUserOrders)
  const profile = mockUserProfile

  const handleConfirmReceipt = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'completed' } : ord))
    )
  }

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
            to="/user/orders"
            className="w-full sm:w-auto text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            My Orders
          </Link>
          <Link
            to="/user/settings"
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
            {orders.filter((o) => o.status !== 'completed').length}
          </p>
          <p className="text-[11px] text-slate-400">In escrow or shipped</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Escrow Locked</span>
            <Lock size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            ${orders.filter((o) => o.status !== 'completed').reduce((a, b) => a + b.price, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">100% Deposit Protection</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Total Purchases</span>
            <Package size={18} className="text-sky-600 dark:text-sky-400" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">${profile.totalSpent.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400">Across all marketplace deals</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">Saved Items</span>
            <Heart size={18} className="text-rose-500" />
          </div>
          <p className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{profile.savedItemsCount}</p>
          <p className="text-[11px] text-slate-400">Watchlist & bookmarks</p>
        </div>
      </div>

      {/* Quick Escrow & Orders Banner with Light & Dark adaptation */}
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
          <Link to="/user/orders" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            View All Orders →
          </Link>
        </div>

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
                      ord.status === 'completed'
                        ? 'success'
                        : ord.status === 'shipped'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {ord.status.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{ord.id}</span>
                  <span className="text-xs text-slate-400">• {ord.orderDate}</span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Seller: <strong className="text-slate-900 dark:text-white">@{ord.vendorName}</strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <img
                    src={ord.imageUrl}
                    alt={ord.title}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                  <div>
                    <h4 className="font-display font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">{ord.title}</h4>
                    <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">${ord.price.toLocaleString()}</p>
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
                  {ord.status === 'shipped' || ord.status === 'funded' ? (
                    <button
                      onClick={() => handleConfirmReceipt(ord.id)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 size={16} /> Confirm Receipt & Release Escrow
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={15} /> Completed & Paid Out
                    </span>
                  )}
                  <Link
                    to={`/marketplace/${ord.productId}`}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="View Product Page"
                  >
                    <ExternalLink size={15} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
