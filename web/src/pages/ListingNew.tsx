import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { ListingForm } from '../features/seller/ui/ListingForm'
import { useCreateListing } from '../features/seller/data/listingsApi'
import { imagesFromText, type ListingForm as ListingFormValues } from '../features/seller/data/schemas'

export function ListingNew() {
  const navigate = useNavigate()
  const createListing = useCreateListing()

  const onSubmit = (values: ListingFormValues) => {
    createListing.mutate(
      {
        title: values.title,
        description: values.description || null,
        price: values.price,
        category: values.category,
        condition: values.condition,
        quantity: values.quantity,
        images: imagesFromText(values.imagesText),
        location: values.location || null,
        status: values.status === 'out_of_stock' ? 'active' : values.status,
      },
      { onSuccess: () => navigate('/listings') },
    )
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

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          <PlusCircle size={14} />
          New Listing
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create a Listing</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Priced in GH₵ — buyers pay through escrow and funds release to your payout account on confirmed delivery.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <ListingForm
          submitLabel="Publish Listing"
          pendingLabel="Publishing..."
          isPending={createListing.isPending}
          error={createListing.error}
          onSubmit={onSubmit}
          showStatus={false}
        />
      </div>
    </div>
  )
}

