import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Layers, Tag, Star, ExternalLink, Trash2, Loader2, Package } from 'lucide-react'
import { ConfirmDialog } from '../features/shared/ui/ConfirmDialog'
import { ListingForm } from '../features/seller/ui/ListingForm'
import { ListingDisputePanel } from '../features/seller/ui/ListingDisputePanel'
import { useListing } from '../features/marketplace/data/marketplaceApi'
import { useUpdateListing, useDeleteListing } from '../features/seller/data/listingsApi'
import { imagesFromText, CONDITIONS, type ListingForm as ListingFormValues } from '../features/seller/data/schemas'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

export function ListingDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const listingQuery = useListing(id)
  const updateListing = useUpdateListing()
  const deleteListing = useDeleteListing()
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  if (listingQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  const listing = listingQuery.data

  if (listingQuery.isError || !listing) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <Package size={28} className="mx-auto text-slate-400" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Listing not found</h1>
        <Link
          to="/listings"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all"
        >
          <ArrowLeft size={14} /> Back to My Listings
        </Link>
      </div>
    )
  }

  const knownCondition = CONDITIONS.includes(listing.condition as (typeof CONDITIONS)[number])
    ? (listing.condition as (typeof CONDITIONS)[number])
    : 'Good'

  const onSubmit = (values: ListingFormValues) => {
    updateListing.mutate(
      {
        id,
        title: values.title,
        description: values.description || null,
        price: values.price,
        category: values.category,
        condition: values.condition,
        quantity: values.quantity,
        images: imagesFromText(values.imagesText),
        location: values.location || null,
        status: values.status,
      },
      { onSuccess: () => navigate('/listings') },
    )
  }

  const onDelete = () => {
    deleteListing.mutate(id, {
      onSuccess: () => navigate('/listings'),
      onSettled: () => setConfirmDeleteOpen(false),
    })
  }

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-6 space-y-6">
      <Link
        to="/listings"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to My Listings
      </Link>

      {/* Listing header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
            {listing.images[0] ? (
              <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400"><Package size={20} /></div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{listing.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(listing.price)} · {listing.category}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              to={`/marketplace/${listing.id}`}
              title="View public page"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <ExternalLink size={14} />
            </Link>
            <button
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={deleteListing.isPending}
              title="Delete listing"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-all cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Layers size={12} /> In Stock</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{listing.quantity}</div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Star size={12} /> Reviews</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{listing.reviewCount}</div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Tag size={12} /> Status</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">{listing.status.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {deleteListing.isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(deleteListing.error)}
        </div>
      )}

      {/* Edit form — prefilled from the live listing */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-4">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
          Edit Listing
        </h3>
        {listing.removal && (
          <ListingDisputePanel listingId={listing.id} removal={listing.removal} />
        )}

        <ListingForm
          defaultValues={{
            title: listing.title,
            description: listing.description ?? '',
            price: listing.price,
            category: listing.category,
            condition: knownCondition,
            quantity: listing.quantity,
            imagesText: listing.images.join('\n'),
            location: listing.location ?? '',
            status: listing.status as ListingFormValues['status'],
          }}
          submitLabel="Save Changes"
          pendingLabel="Saving..."
          isPending={updateListing.isPending}
          error={updateListing.error}
          onSubmit={onSubmit}
        />
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this listing?"
        description={`"${listing.title}" will be permanently removed from the marketplace. This can't be undone.`}
        confirmLabel="Delete Listing"
        isPending={deleteListing.isPending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}

