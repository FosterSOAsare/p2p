import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Store,
  Truck,
  CheckCircle2,
  Eye,
  Star,
  Trash2,
  X,
  Loader2,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Wallet,
  Sparkles,
} from 'lucide-react'
import { useDashboard, type DashboardResponse } from '../features/user/data/usersApi'
import { useDeliverDeal } from '../features/escrow/data/ordersApi'
import { useDeleteListing } from '../features/marketplace/data/marketplaceApi'
import { Badge } from '../features/shared/ui/Badge'

export function SellerDashboard({ dashboardData }: { dashboardData?: DashboardResponse | null }) {
  const { data: fetchDash } = useDashboard()
  const deliverMutation = useDeliverDeal()
  const deleteListingMutation = useDeleteListing()

  const data = dashboardData ?? fetchDash

  const stats = data?.seller?.stats ?? {
    storeName: 'Merchant Store',
    storeHandle: 'vendor',
    rating: 5.0,
    reviewCount: 0,
    totalEarnings: 0,
    escrowLockedBalance: 0,
    availablePayoutBalance: 0,
    actionRequiredCount: 0,
  }

  const orders = data?.seller?.salesOrders ?? []
  const listings = data?.seller?.listings ?? []
  const displayedListings = listings.slice(0, 6)

  // Shipping modal/tracking state
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null)
  const [carrierInput, setCarrierInput] = useState('')
  const [trackingInput, setTrackingInput] = useState('')
  const [noteInput, setNoteInput] = useState('')

  const handleDispatchOrder = (orderId: string) => {
    deliverMutation.mutate(
      {
        id: orderId,
        carrier: carrierInput || undefined,
        trackingNumber: trackingInput || undefined,
        note: noteInput || undefined,
      },
      {
        onSuccess: () => {
          setShippingOrderId(null)
          setCarrierInput('')
          setTrackingInput('')
          setNoteInput('')
        },
      }
    )
  }


  const handleDeleteListing = (id: string) => {
    if (confirm('Are you sure you want to delete this listing?')) {
      deleteListingMutation.mutate(id)
    }
  }

  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Vendor Hero Banner */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-slate-900 p-4 sm:p-8 text-slate-900 dark:text-white shadow-xl space-y-5 transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-md shrink-0">
                <Store size={20} />
              </span>
              <div>
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {stats.storeName}
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  @{stats.storeHandle} • Verified Merchant Portal
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={14} /> KYC Level 2 Verified Vendor
              </span>
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                <Star size={14} fill="currentColor" /> {stats.rating} ({stats.reviewCount} reviews)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/wallet"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-3 text-xs sm:text-sm font-bold text-white dark:text-slate-900 shadow-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Wallet size={18} /> Payout Wallet
            </Link>
            <Link
              to="/listings"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-bold text-white dark:text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Store size={18} /> View All Listings
            </Link>
            <Link
              to="/promotions"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Sparkles size={18} /> Promotions
            </Link>
          </div>
        </div>

        {/* Payout Balance Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Total Sales Revenue</span>
            <span className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              GH₵{stats.totalEarnings.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-500 dark:text-slate-400 block font-medium">Locked in Escrow</span>
            <span className="font-display text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
              GH₵{stats.escrowLockedBalance.toLocaleString()}
            </span>
          </div>

          <Link
            to="/wallet"
            className="group p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 transition-all space-y-1 block cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Available Payout Balance
              </span>
              <ExternalLink size={13} className="text-slate-400 group-hover:text-sky-500" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400 block">
              GH₵{stats.availablePayoutBalance.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 group-hover:underline">Click to withdraw →</span>
          </Link>
        </div>
      </div>

      {/* Sales Orders & Dispatch Management */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Merchant Sales & Dispatch</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Orders placed by buyers. Enter tracking info to mark orders as shipped.</p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full self-start sm:self-auto">
            {stats.actionRequiredCount} Action Required
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
            <Truck size={32} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No incoming sales orders yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      tone={
                        ord.status === 'released' || ord.status === 'disbursed'
                          ? 'success'
                          : ord.status === 'shipped' || ord.status === 'delivered'
                          ? 'info'
                          : ord.status === 'disputed'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {ord.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Link
                      to={`/escrow/${ord.id}`}
                      className="font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                    >
                      {ord.code || ord.id.slice(0, 8)}
                    </Link>
                    <span className="text-slate-400">• Buyer: <strong className="text-slate-900 dark:text-white">@{ord.buyerUsername}</strong></span>
                    <span className="text-slate-400">• {ord.date}</span>
                  </div>

                  <Link
                    to={`/escrow/${ord.id}`}
                    className="font-display font-bold text-slate-900 dark:text-white text-base hover:text-primary-600 dark:hover:text-primary-400 hover:underline block"
                  >
                    {ord.title}
                  </Link>

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
                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0 gap-2">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Escrow Value</span>
                    <span className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      {ord.currency} {ord.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ord.status === 'disputed' || ord.rawStatus === 'disputed' ? (
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle size={14} /> Under Dispute Review
                      </span>
                    ) : ord.status === 'refunded' || ord.rawStatus === 'refunded' || ord.status === 'cancelled' ? (
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-3 py-1.5 rounded-md border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <RotateCcw size={14} /> Refunded to Buyer
                      </span>
                    ) : ord.status === 'awaiting_shipment' || ord.rawStatus === 'funded' ? (
                      <button
                        onClick={() => setShippingOrderId(ord.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer shadow-md"
                      >
                        <Truck size={15} /> Enter Tracking & Dispatch
                      </button>
                    ) : ord.status === 'shipped' || ord.rawStatus === 'delivered' ? (
                      <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 rounded-md border border-sky-200 dark:border-sky-800">
                        Awaiting Confirmation
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Payout Released
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

      {/* Seller Product Inventory Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Manage Store Inventory</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Showing {displayedListings.length} of {listings.length} items listed on catalog.</p>
          </div>
          <Link
            to="/listings"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            View All Listings →
          </Link>
        </div>

        {displayedListings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-2">
            <Store size={32} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No active products listed.</p>
            <Link
              to="/listings"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
            >
              View All Listings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedListings.map((item) => (
              <div
                key={item.id}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                      Stock: {item.stock} units
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Eye size={12} /> {item.views} views
                    </span>
                  </div>

                  <h4 className="font-display font-semibold text-slate-900 dark:text-white text-xs line-clamp-1 leading-snug">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-display font-bold text-slate-900 dark:text-white text-sm">
                    {item.currency || 'GH₵'} {item.price.toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDeleteListing(item.id)}
                    disabled={deleteListingMutation.isPending}
                    title="Remove Listing"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enter Tracking & Delivery Details Modal */}
      {shippingOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Dispatch & Delivery Details</h3>
              <button onClick={() => setShippingOrderId(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Shipping Carrier / Method</label>
                <input
                  type="text"
                  placeholder="e.g. DHL Express, FedEx, Local Rider, Online"
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3 text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Tracking Code / Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. DHL-GH-99201 or Courier Phone"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2.5 px-3 font-mono text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Delivery Note & Instructions (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Courier contact name, rider phone number, or digital item instructions"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 px-3 text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShippingOrderId(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDispatchOrder(shippingOrderId)}
                disabled={deliverMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md cursor-pointer disabled:opacity-50"
              >
                {deliverMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

