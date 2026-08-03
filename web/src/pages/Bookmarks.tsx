import { Link, Navigate } from 'react-router-dom'
import { Heart, Loader2, Trash2, Lock, ArrowLeft, Store, ExternalLink } from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { useSavedListings, useUnsaveListing } from '../features/user/data/usersApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'

export function Bookmarks() {
  const { data: me, isLoading: meLoading } = useMe()
  const savedQuery = useSavedListings()
  const unsaveListing = useUnsaveListing()

  if (meLoading || savedQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />

  // Sellers don't have bookmarks
  const isSeller = me.role !== 'admin' && me.kycStatus === 'verified'
  if (isSeller) return <Navigate to="/dashboard" replace />

  const savedItems = savedQuery.data?.saved ?? []

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft size={16} /> Back to Marketplace
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              My Bookmarked Items
            </h1>
            <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-3 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
              {savedItems.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Products and listings you have saved for later purchase or price watching.
          </p>
        </div>

        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700 transition-all shrink-0"
        >
          <Store size={15} /> Browse Marketplace
        </Link>
      </div>

      {/* Bookmarks Grid */}
      {savedItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {savedItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm hover:shadow-md transition-all space-y-3"
            >
              <div className="space-y-2">
                <div className="relative h-40 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute left-2 top-2">
                    <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                      {item.category}
                    </span>
                  </div>

                  <button
                    onClick={() => unsaveListing.mutate(item.id)}
                    disabled={unsaveListing.isPending && unsaveListing.variables === item.id}
                    title="Remove from bookmarks"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 text-rose-500 hover:bg-rose-500 hover:text-white shadow-md backdrop-blur-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {unsaveListing.isPending && unsaveListing.variables === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>@{item.sellerUsername}</span>
                  {item.condition && <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium">{item.condition}</span>}
                </div>

                <Link
                  to={`/marketplace/${item.id}`}
                  className="font-display font-semibold text-slate-900 dark:text-white text-xs line-clamp-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors block"
                >
                  {item.title}
                </Link>
                {/* The card already carries category, seller and condition, and the
                    saved-listings endpoint sends no blurb — so this slot shows when
                    it was bookmarked, which nothing else does. */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Saved {formatDate(item.savedAt)}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Price</span>
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {formatMoney(item.price)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/marketplace/${item.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <ExternalLink size={12} /> View
                  </Link>
                  <Link
                    to={`/checkout?listing=${item.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 shadow-sm transition-all"
                  >
                    <Lock size={12} /> Buy
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500">
            <Heart size={24} />
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">No bookmarked items yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Browse the marketplace and tap the heart icon on any listing to save it to your bookmarks for quick checkout later.
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-700 shadow-sm"
          >
            <Store size={15} /> Explore Marketplace
          </Link>
        </div>
      )}
    </div>
  )
}
