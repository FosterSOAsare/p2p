import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Eye,
  Gavel,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Star,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import {
  useAdminListing,
  useReinstateListing,
  type AdminListingDetail as Listing,
} from '../features/admin/data/adminListingsApi'
import { RemoveListingDialog } from '../features/admin/ui/RemoveListingDialog'
import { useRemoveListing } from '../features/admin/data/adminListingsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'

/**
 * The admin's review page for one listing — the place moderation decisions are
 * made from.
 *
 * It shows what the buyer's page shows (every image, the untruncated
 * description, price and condition) plus what only an admin needs: the seller's
 * standing, how many deals reference the listing, and the takedown trail. The
 * list view can then stay a scannable index rather than trying to carry enough
 * detail to judge from.
 */

const STATUS_STYLES: Record<Listing['status'], string> = {
  active:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  out_of_stock:
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  removed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
}

const STATUS_LABELS: Record<Listing['status'], string> = {
  active: 'Active',
  draft: 'Draft',
  out_of_stock: 'Out of stock',
  removed: 'Removed',
}

export function AdminListingDetail() {
  const { id = '' } = useParams()
  const listingQuery = useAdminListing(id)
  const remove = useRemoveListing()
  const reinstate = useReinstateListing()

  const [removeOpen, setRemoveOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  const listing = listingQuery.data

  if (listingQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (listingQuery.isError || !listing) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <Package size={30} className="mx-auto text-slate-400" />
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Listing not found</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {listingQuery.error ? apiErrorMessage(listingQuery.error) : 'It may have been deleted.'}
        </p>
        <Link
          to="/admin/listings"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={14} /> Back to listings
        </Link>
      </div>
    )
  }

  const isRemoved = listing.status === 'removed'
  const actionError = remove.isError
    ? apiErrorMessage(remove.error)
    : reinstate.isError
      ? apiErrorMessage(reinstate.error)
      : null

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* Header */}
      <div className="space-y-3 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/admin/listings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={16} /> Back to listings
          </Link>
          <AdminSectionNav />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[listing.status]}`}
              >
                {STATUS_LABELS[listing.status]}
              </span>
              {listing.dealCount > 0 && (
                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {listing.dealCount} deal{listing.dealCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {/* Full title — the list view truncates, this deliberately doesn't. */}
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              {listing.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listed {formatDate(listing.createdAt)} · {listing.views} view{listing.views === 1 ? '' : 's'}
            </p>
          </div>
          <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {formatMoney(listing.price, listing.currency)}
          </span>
        </div>
      </div>

      {/* Removal banner — the reason in red, prominent, as soon as you land */}
      {listing.removal && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/50">
          <div className="flex items-start gap-3">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-bold text-rose-800 dark:text-rose-300">
                Removed — {listing.removal.reasonText}
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                by @{listing.removal.removedBy ?? 'an administrator'} on {formatDate(listing.removal.removedAt)} ·{' '}
                {listing.removal.disputeAllowed ? 'the seller may appeal' : 'no appeal allowed'}
              </p>
              {listing.dispute && (
                <p className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-rose-800 dark:text-rose-300">
                  <Gavel size={13} /> Appeal {listing.dispute.status}
                  {listing.dispute.status === 'open' && ' — awaiting your review'}
                </p>
              )}
            </div>
          </div>
          {listing.dispute && (
            <p className="mt-3 whitespace-pre-wrap border-t border-rose-200 pt-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900 dark:text-rose-300">
              <span className="font-semibold">Seller's appeal:</span> {listing.dispute.explanation}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Images + description */}
        <div className="space-y-4 lg:col-span-7">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            {listing.images.length > 0 ? (
              <img
                src={listing.images[activeImage]}
                alt={listing.title}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center">
                <Package size={40} className="text-slate-400" />
              </div>
            )}
          </div>

          {/* Every image, not just the first */}
          {listing.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {listing.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-16 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                    i === activeImage
                      ? 'border-primary-500'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Description</h2>
            {/* whitespace-pre-wrap, no clamp — the whole thing, as the seller wrote it */}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {listing.description || <span className="italic text-slate-400">No description provided.</span>}
            </p>
          </div>
        </div>

        {/* Facts + seller + actions */}
        <div className="space-y-4 lg:col-span-5">
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Details</h2>
            <dl className="space-y-2 text-xs">
              <Row label="Category" value={listing.category} />
              <Row label="Condition" value={listing.condition ?? '—'} />
              <Row label="Quantity" value={String(listing.quantity)} />
              <Row
                label="Location"
                value={
                  listing.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} /> {listing.location}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <Row
                label="Rating"
                value={
                  listing.rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {listing.rating.toFixed(1)} ({listing.reviewCount})
                    </span>
                  ) : (
                    'No reviews'
                  )
                }
              />
              <Row
                label="Views"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Eye size={11} /> {listing.views}
                  </span>
                }
              />
              <Row label="Last updated" value={formatDate(listing.updatedAt)} />
            </dl>
          </div>

          {/* Seller */}
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Seller</h2>
            <div className="flex items-center gap-3">
              {listing.seller.avatarUrl ? (
                <img src={listing.seller.avatarUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold uppercase text-white">
                  {listing.seller.username.charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <Link
                  to={`/seller/${listing.seller.username}`}
                  className="block truncate text-sm font-bold text-slate-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                >
                  {listing.seller.storeName ?? `@${listing.seller.username}`}
                </Link>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  @{listing.seller.username} · {listing.seller.email}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label={`KYC ${listing.seller.kycStatus}`}
                tone={listing.seller.kycStatus === 'verified' ? 'good' : 'neutral'}
              />
              <Chip
                label={listing.seller.accountStatus}
                tone={listing.seller.accountStatus === 'active' ? 'good' : 'bad'}
              />
              <Chip label={`${listing.seller.listingsCount} listings`} tone="neutral" />
            </div>
            <Link
              to={`/admin/users?search=${listing.seller.username}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Manage this account
            </Link>
          </div>

          {/* Moderation */}
          <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">Moderation</h2>

            {actionError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                {actionError}
              </div>
            )}

            {isRemoved ? (
              <>
                <button
                  onClick={() => reinstate.mutate(listing.id)}
                  disabled={reinstate.isPending}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:opacity-50"
                >
                  {reinstate.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Reinstate listing
                </button>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Puts it back on the marketplace and closes any open appeal.
                </p>
              </>
            ) : (
              <button
                onClick={() => setRemoveOpen(true)}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-rose-700"
              >
                <Trash2 size={14} /> Remove listing
              </button>
            )}

            {listing.dispute?.status === 'open' && (
              <Link
                to="/admin/listings?status=appeals"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Gavel size={13} /> Review the appeal
              </Link>
            )}

            {/* Permanent deletion is deliberately absent when deals reference the
                listing — removing the row would take their history with it. */}
            <p className="flex items-start gap-1.5 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {listing.dealCount > 0 ? (
                <>
                  <ShieldCheck size={13} className="mt-0.5 shrink-0" />
                  {listing.dealCount} escrow deal{listing.dealCount === 1 ? '' : 's'} reference this listing, so
                  removal keeps the record rather than deleting it.
                </>
              ) : (
                <>
                  <Clock size={13} className="mt-0.5 shrink-0" />
                  Removal is reversible — the listing is hidden, not destroyed.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      <RemoveListingDialog
        open={removeOpen}
        listingTitle={listing.title}
        isPending={remove.isPending}
        errorMessage={remove.isError ? apiErrorMessage(remove.error) : null}
        onConfirm={(reason, note, disputeAllowed) =>
          remove.mutate(
            { id: listing.id, reason, note, disputeAllowed },
            { onSuccess: () => setRemoveOpen(false) },
          )
        }
        onCancel={() => setRemoveOpen(false)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-slate-800">
      <dt className="shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  )
}

function Chip({ label, tone }: { label: string; tone: 'good' | 'bad' | 'neutral' }) {
  const styles = {
    good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    bad: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  }[tone]
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles}`}>{label}</span>
}
