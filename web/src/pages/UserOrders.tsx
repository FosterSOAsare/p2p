import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Search,
  ExternalLink,
  ArrowLeft,
  Lock,
  Store,
  X,
} from 'lucide-react'
import { mockUserOrders, type UserOrder } from '../features/user/data/userProfile'
import { mockSellerOrders, type SellerSaleOrder } from '../features/seller/data/sellerData'
import { Badge } from '../features/shared/ui/Badge'

export function UserOrders() {
  const [buyerOrders, setBuyerOrders] = useState<UserOrder[]>(mockUserOrders)
  const [sellerOrders, setSellerOrders] = useState<SellerSaleOrder[]>(mockSellerOrders)

  // Role toggle: 'buyer' vs 'seller'
  const [roleMode, setRoleMode] = useState<'buyer' | 'seller'>('buyer')
  const [statusFilter, setStatusFilter] = useState<'all' | 'funded' | 'shipped' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Dispatch modal state for sellers
  const [dispatchModalId, setDispatchModalId] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState('')
  const [carrierInput, setCarrierInput] = useState('DHL Express')

  const handleConfirmReceipt = (orderId: string) => {
    setBuyerOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: 'completed' } : ord))
    )
  }

  const handleDispatchOrder = (orderId: string) => {
    if (!trackingInput) return
    setSellerOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, status: 'shipped', trackingNumber: trackingInput, carrier: carrierInput }
          : ord
      )
    )
    setDispatchModalId(null)
    setTrackingInput('')
  }

  const filteredBuyerOrders = buyerOrders.filter((ord) => {
    if (statusFilter !== 'all' && ord.status !== statusFilter) return false
    if (searchQuery && !ord.title.toLowerCase().includes(searchQuery.toLowerCase()) && !ord.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  const filteredSellerOrders = sellerOrders.filter((ord) => {
    if (searchQuery && !ord.title.toLowerCase().includes(searchQuery.toLowerCase()) && !ord.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-md mb-1">
            <ShoppingBag size={14} />
            Unified Escrow Orders Portal
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Orders & Escrow Releases
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Manage your purchases as a buyer or dispatch package tracking as a seller.
          </p>
        </div>

        {/* Role Mode Toggle Switch: Mobile Full Width */}
        <div className="flex items-center rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800 w-full md:w-auto shrink-0 text-xs font-semibold">
          <button
            onClick={() => setRoleMode('buyer')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 transition-all cursor-pointer ${
              roleMode === 'buyer'
                ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag size={15} /> Purchases (As Buyer)
          </button>
          <button
            onClick={() => setRoleMode('seller')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-4 py-2 transition-all cursor-pointer ${
              roleMode === 'seller'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store size={15} /> Sales (As Seller)
          </button>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        {roleMode === 'buyer' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-semibold pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'funded', label: 'In Escrow' },
              { id: 'shipped', label: 'Shipped' },
              { id: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`rounded-xl px-3.5 py-2 transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 self-start sm:self-auto">
            <Store size={15} className="text-emerald-600 dark:text-emerald-400" />
            Merchant Sales Log ({sellerOrders.length} orders received)
          </span>
        )}

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or Order ID..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Mode 1: Buyer Purchases View */}
      {roleMode === 'buyer' && (
        <div className="space-y-4">
          {filteredBuyerOrders.length > 0 ? (
            filteredBuyerOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
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
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{ord.id}</span>
                    <span className="text-slate-400">• Ordered: {ord.orderDate}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                    Seller: <strong className="text-slate-900 dark:text-white">@{ord.vendorName}</strong>
                    {ord.vendorVerified && (
                      <span title="KYC Verified Seller" className="flex shrink-0">
                        <ShieldCheck size={14} className="text-primary-600 dark:text-primary-400" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 w-full md:w-auto">
                    <img
                      src={ord.imageUrl}
                      alt={ord.title}
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                    />
                    <div className="space-y-1">
                      <h3 className="font-display font-bold text-slate-900 dark:text-white text-xs sm:text-base line-clamp-1">
                        {ord.title}
                      </h3>
                      <p className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        ${ord.price.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USD Escrow</span>
                      </p>

                      {ord.trackingCode ? (
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                          <Truck size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
                          <span>{ord.shippingCarrier}:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {ord.trackingCode}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <Lock size={12} /> Funds locked in escrow. Awaiting vendor dispatch tracking.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-auto flex items-center justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    {ord.status === 'shipped' || ord.status === 'funded' ? (
                      <button
                        onClick={() => handleConfirmReceipt(ord.id)}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 sm:px-5 py-2.5 sm:py-3 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
                      >
                        <CheckCircle2 size={16} /> Confirm Receipt & Release Funds
                      </button>
                    ) : (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={16} /> Delivered & Paid Out
                        </span>
                        <span className="text-[10px] text-slate-400">Escrow released</span>
                      </div>
                    )}

                    <Link
                      to={`/marketplace/${ord.productId}`}
                      className="inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shrink-0"
                      title="View Listing Page"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-10 text-center space-y-3">
              <ShoppingBag size={24} className="mx-auto text-slate-400" />
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">No purchase orders found</h3>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Seller Sales View */}
      {roleMode === 'seller' && (
        <div className="space-y-4">
          {filteredSellerOrders.map((ord) => (
            <div
              key={ord.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    tone={
                      ord.status === 'released'
                        ? 'success'
                        : ord.status === 'shipped'
                        ? 'info'
                        : 'warning'
                    }
                  >
                    {ord.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{ord.id}</span>
                  <span className="text-slate-400">• Buyer: <strong className="text-slate-900 dark:text-white">@{ord.buyerUsername}</strong></span>
                  <span className="text-slate-400">• {ord.date}</span>
                </div>

                <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">{ord.title}</h3>

                {ord.trackingNumber && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Truck size={14} className="text-primary-600 dark:text-primary-400" />
                    <span>Courier: {ord.carrier}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {ord.trackingNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* Price & Action */}
              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Escrow Value</span>
                  <span className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    ${ord.amount.toLocaleString()} <span className="text-xs text-slate-400">{ord.currency}</span>
                  </span>
                </div>

                {ord.status === 'awaiting_shipment' ? (
                  <button
                    onClick={() => setDispatchModalId(ord.id)}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-md mt-2"
                  >
                    <Truck size={15} /> Enter Tracking & Dispatch
                  </button>
                ) : (
                  <span className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Shipped / Payout Pending
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enter Tracking Modal */}
      {dispatchModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Enter Dispatch Tracking Info</h3>
              <button onClick={() => setDispatchModalId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Shipping Carrier</label>
                <select
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3 text-slate-900 dark:text-white"
                >
                  <option value="DHL Express">DHL Express (Insured)</option>
                  <option value="FedEx Priority">FedEx Priority</option>
                  <option value="UPS Worldwide">UPS Worldwide</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold uppercase text-slate-500 dark:text-slate-400">Tracking Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DHL-GH-99201"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDispatchModalId(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDispatchOrder(dispatchModalId)}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md cursor-pointer"
              >
                Save Tracking & Mark Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
