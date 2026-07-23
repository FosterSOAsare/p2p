import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Eye, Layers, Tag, CheckCircle2, Save } from 'lucide-react'
import { mockSellerListings } from '../features/seller/data/sellerData'
import { formatMoney } from '../features/shared/libs/currency'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none'

function StatusBadge({ status }: { status: 'active' | 'out_of_stock' | 'draft' }) {
  if (status === 'active')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Active
      </span>
    )
  if (status === 'out_of_stock')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Out of Stock
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
      Draft
    </span>
  )
}

/** Seller/admin view of a single listing (mock data — persistence lands with the marketplace API wiring). */
export function ListingDetail() {
  const { id = '' } = useParams()
  const listing = mockSellerListings.find((l) => l.id === id)

  const [title, setTitle] = useState(listing?.title ?? '')
  const [price, setPrice] = useState(listing?.price ?? 0)
  const [stock, setStock] = useState(listing?.stock ?? 0)
  const [category, setCategory] = useState(listing?.category ?? 'Electronics')
  const [saved, setSaved] = useState(false)

  if (!listing) {
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
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
          <img src={listing.imageUrl} alt={listing.title} className="h-20 w-20 rounded-2xl object-cover shrink-0" />
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{listing.title}</h1>
              <StatusBadge status={listing.status} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(listing.price)} · {listing.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="space-y-0.5 pt-2">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Eye size={12} /> Views</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{listing.views.toLocaleString()}</div>
          </div>
          <div className="space-y-0.5 pt-2">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Layers size={12} /> In Stock</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{listing.stock}</div>
          </div>
          <div className="space-y-0.5 pt-2">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase text-slate-400"><Tag size={12} /> Category</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{listing.category}</div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
          Edit Listing
        </h3>

        {saved && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} /> Listing updated!
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-title">
            Title
          </label>
          <input id="listing-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-price">
              Price (GH₵)
            </label>
            <input id="listing-price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-stock">
              Stock
            </label>
            <input id="listing-stock" type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="listing-category">
              Category
            </label>
            <select id="listing-category" value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} cursor-pointer`}>
              <option>Electronics</option>
              <option>Collectibles</option>
              <option>Home & Office</option>
              <option>Fashion</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all cursor-pointer shadow-md"
        >
          <Save size={15} /> Save Changes
        </button>
      </form>
    </div>
  )
}
