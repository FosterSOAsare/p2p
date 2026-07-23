import { Link, useSearchParams } from 'react-router-dom'
import {
  Package,
  PlusCircle,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { useState } from 'react'
import { SellerGuard } from '../features/seller/ui/SellerGuard'
import { useMyListings, useDeleteListing, type MyListingCard } from '../features/seller/data/listingsApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out_of_stock', label: 'Out of Stock' },
] as const

function StatusBadge({ status }: { status: MyListingCard['status'] }) {
  if (status === 'active')
    return <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Active</span>
  if (status === 'out_of_stock')
    return <span className="rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Out of Stock</span>
  return <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">Draft</span>
}

function MyListingsInner() {
  // Filters + pagination live in the URL
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
  }

  const apiQuery = new URLSearchParams()
  if (status !== 'all') apiQuery.set('status', status)
  apiQuery.set('page', String(page))
  apiQuery.set('limit', '10')

  const listQuery = useMyListings(apiQuery.toString())
  const deleteListing = useDeleteListing()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const data = listQuery.data

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
            <Package size={14} />
            Seller Console
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Listings</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Manage your marketplace inventory. All sales settle through GH₵ escrow.
          </p>
        </div>
        <Link
          to="/listings/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all shrink-0"
        >
          <PlusCircle size={16} />
          Add New Listing
        </Link>
      </div>

      {/* Status tabs — URL-driven */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => updateParams({ status: id === 'all' ? null : id })}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              status === id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
            {data.total} listing{data.total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {deleteListing.isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(deleteListing.error)}
        </div>
      )}

      {listQuery.isLoading && (
        <div className="py-16 text-center">
          <Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {listQuery.isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(listQuery.error)}
        </div>
      )}

      {data && data.listings.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-3">
          <Package size={28} className="mx-auto text-slate-400" />
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {status === 'all' ? 'No listings yet' : `No ${STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()} listings`}
          </h3>
          <Link
            to="/listings/new"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
          >
            <PlusCircle size={14} /> Create your first listing
          </Link>
        </div>
      )}

      {data && data.listings.length > 0 && (
        <div className={`space-y-3 transition-opacity ${listQuery.isFetching ? 'opacity-60' : ''}`}>
          {data.listings.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-sm"
            >
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                {l.image ? (
                  <img src={l.image} alt={l.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400"><Package size={18} /></div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/listings/${l.id}`}
                    className="font-display text-sm font-bold text-slate-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {l.title}
                  </Link>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatMoney(l.price)} · {l.category} · qty {l.quantity} · listed {formatDate(l.createdAt)}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                  <Eye size={11} /> {l.views.toLocaleString()} views
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to={`/marketplace/${l.id}`}
                  title="View public page"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <ExternalLink size={14} />
                </Link>
                <Link
                  to={`/listings/${l.id}`}
                  title="Edit listing"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                >
                  <Pencil size={14} />
                </Link>
                {confirmDeleteId === l.id ? (
                  <button
                    onClick={() => {
                      deleteListing.mutate(l.id, { onSettled: () => setConfirmDeleteId(null) })
                    }}
                    disabled={deleteListing.isPending}
                    className="rounded-xl bg-rose-600 px-2.5 h-8 text-[11px] font-bold text-white hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {deleteListing.isPending ? '...' : 'Confirm?'}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(l.id)}
                    title="Delete listing"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => updateParams({ page: n === 1 ? null : String(n) })}
              className={`h-8 min-w-8 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                n === page
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= data.pages}
            onClick={() => updateParams({ page: String(page + 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

export function MyListings() {
  return (
    <SellerGuard>
      <MyListingsInner />
    </SellerGuard>
  )
}
