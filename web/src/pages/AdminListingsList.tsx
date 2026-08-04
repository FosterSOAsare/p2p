import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Search, Loader2, PackageSearch, Trash2, Ban, Gavel } from 'lucide-react'
import {
  useAdminListings,
  useAdminListingDisputes,
  useRemoveListing,
  type AdminListingRow,
  type AdminListingDispute,
  type ListingStatus,
  type RemovalReason,
} from '../features/admin/data/adminListingsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { RemoveListingDialog } from '../features/admin/ui/RemoveListingDialog'
import { ListingDisputeReview } from '../features/admin/ui/ListingDisputeReview'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { useDebouncedValue } from '../features/shared/libs/useDebouncedValue'

type StatusTab = 'all' | ListingStatus | 'disputes'

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All Listings' },
  { id: 'active', label: 'Active' },
  { id: 'draft', label: 'Drafts' },
  { id: 'out_of_stock', label: 'Out of Stock' },
  { id: 'removed', label: 'Removed' },
  { id: 'disputes', label: 'Disputes' },
]

const STATUS_STYLES: Record<ListingStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  out_of_stock: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  removed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
}

const STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'active',
  draft: 'draft',
  out_of_stock: 'out of stock',
  removed: 'removed',
}

export function AdminListingsList() {
  // Filters, search and page all live in the URL query.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as StatusTab | null) ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchQ = searchParams.get('search') ?? ''

  const [searchInput, setSearchInput] = useState(searchQ)
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400)
  const [removeTarget, setRemoveTarget] = useState<AdminListingRow | null>(null)
  const [reviewTarget, setReviewTarget] = useState<AdminListingDispute | null>(null)
  const showDisputes = statusTab === 'disputes'

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page') // any filter change resets to page 1
    setSearchParams(next)
  }

  useEffect(() => {
    if (debouncedSearch !== searchQ) setParams({ search: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQ) params.set('search', searchQ)
    if (statusTab !== 'all' && statusTab !== 'disputes') params.set('status', statusTab)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [searchQ, statusTab, page])

  const listingsQuery = useAdminListings(showDisputes ? '' : query)
  const disputesQuery = useAdminListingDisputes('all')
  const removeListing = useRemoveListing()

  const confirmRemove = (reason: RemovalReason, note: string | undefined, disputeAllowed: boolean) => {
    if (!removeTarget) return
    removeListing.mutate(
      { id: removeTarget.id, reason, note, disputeAllowed },
      { onSuccess: () => setRemoveTarget(null) },
    )
  }

  const data = listingsQuery.data
  const disputes = disputesQuery.data?.disputes ?? []
  const openDisputes = disputes.filter((d) => d.status === 'open').length

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
              Listing Moderation
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Search every listing and remove any that break the rules. Removed listings leave the marketplace and the
              seller is notified with the reason.
            </p>
          </div>
          <AdminSectionNav />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setParams({ status: tab.id === 'all' ? null : tab.id })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusTab === tab.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
              {tab.id === 'disputes' && openDisputes > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {openDisputes}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className={`relative ${showDisputes ? 'hidden' : ''}`}>
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search title, category, seller…"
            className="w-64 max-w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {removeListing.isError && !removeTarget && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(removeListing.error)}
        </div>
      )}

      {/* Disputes tab */}
      {showDisputes ? (
        disputesQuery.isLoading ? (
          <div className="py-20 text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
            <Gavel size={36} className="mx-auto text-slate-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No disputes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sellers haven't appealed any removals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-wrap items-center gap-4 justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    {d.listing.image ? <img src={d.listing.image} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{d.listing.title}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                          d.status === 'open'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : d.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      @{d.seller.username} · removed for {d.listing.removalReasonText}
                    </p>
                    <span className="text-[10px] text-slate-400">Appealed {formatDate(d.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setReviewTarget(d)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold cursor-pointer ${
                    d.status === 'open'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Gavel size={13} /> {d.status === 'open' ? 'Review' : 'View'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : /* List */
      listingsQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : listingsQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(listingsQuery.error)}
        </div>
      ) : (data?.listings ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <PackageSearch size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No listings found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">No listings match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.listings.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:gap-4"
            >
              {/* The only column that flexes — so everything to its right keeps
                  the same x-position no matter how long the title runs. */}
              <Link
                to={`/admin/listings/${l.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-80"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {l.image ? <img src={l.image} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">{l.title}</span>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {formatMoney(l.price)} · {l.category} · @{l.seller.username}
                  </p>
                  {l.removal ? (
                    <p className="mt-1 truncate text-[10px] text-rose-600 dark:text-rose-400">
                      {l.removal.reasonText}
                      {l.removal.removedBy ? ` · by @${l.removal.removedBy}` : ''} · {formatDate(l.removal.removedAt)}
                      {l.removal.disputeStatus
                        ? ` · dispute ${l.removal.disputeStatus}`
                        : l.removal.disputeAllowed
                          ? ' · disputable'
                          : ' · no appeal'}
                    </p>
                  ) : (
                    <span className="text-[10px] text-slate-400">Listed {formatDate(l.createdAt)}</span>
                  )}
                </div>
              </Link>

              {/* Fixed-width columns: identical position on every row. */}
              <div className="hidden w-24 shrink-0 justify-center sm:flex">
                <span
                  className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[l.status]}`}
                >
                  {STATUS_LABELS[l.status]}
                </span>
              </div>

              <div className="flex w-28 shrink-0 justify-end">
                {l.status === 'removed' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
                    <Ban size={13} /> Removed
                  </span>
                ) : (
                  <button
                    onClick={() => setRemoveTarget(l)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!showDisputes && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
            disabled={page <= 1}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {data.page} of {data.pages} · {data.total} listings
          </span>
          <button
            onClick={() => setParams({ page: String(Math.min(data.pages, page + 1)) })}
            disabled={page >= data.pages}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {reviewTarget && (
        <ListingDisputeReview dispute={reviewTarget} onClose={() => setReviewTarget(null)} />
      )}

      <RemoveListingDialog
        open={removeTarget !== null}
        listingTitle={removeTarget?.title ?? ''}
        isPending={removeListing.isPending}
        errorMessage={removeListing.isError ? apiErrorMessage(removeListing.error) : null}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
