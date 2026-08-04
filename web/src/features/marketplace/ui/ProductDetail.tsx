import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Heart,
  MessageCircle,
  Truck,
  RotateCcw,
  Flag,
  UserX,
  ArrowLeft,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  PackageX,
} from 'lucide-react'
import { Reviews } from './Reviews'
import { Badge } from '../../shared/ui/Badge'
import { useListing } from '../data/marketplaceApi'
import { useMe } from '../../auth/data/authApi'
import { useSavedListings, useSaveListing, useUnsaveListing, useBlockedVendors } from '../../user/data/usersApi'
import { formatMoney } from '../../shared/libs/currency'
import { formatDate } from '../../shared/libs/date'
import { apiErrorMessage } from '../../shared/libs/api'

export function ProductDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const listingQuery = useListing(id)
  const { data: me } = useMe()

  // Real save/bookmark state
  const savedQuery = useSavedListings()
  const saveListing = useSaveListing()
  const unsaveListing = useUnsaveListing()
  const isSaved = (savedQuery.data?.saved ?? []).some((s) => s.id === id)

  // Real vendor-block state (managed on the seller profile page)
  const blockedQuery = useBlockedVendors()

  const [activeSlide, setActiveSlide] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [reported, setReported] = useState(false)

  if (listingQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  const product = listingQuery.data

  // The server already 404s a removed listing for everyone except its owner and
  // admins — they get it back so the seller's own page can show the takedown
  // reason. On the *marketplace* it should be gone for them too: this is the
  // public shopfront, and `/listings/:id` is where the seller reviews it.
  if (listingQuery.isError || !product || product.status === 'removed') {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Listing Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {listingQuery.isError && listingQuery.error
            ? apiErrorMessage(listingQuery.error)
            : 'The listing you are looking for may have been sold or removed.'}
        </p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={16} />
          Back to Marketplace
        </Link>
      </div>
    )
  }

  // Checkout would 404 on the server anyway (`status !== 'active'`), so the
  // buy path is closed here rather than letting the buyer discover it after a
  // quantity picker and a Pay button. Status and quantity are checked
  // separately: the last unit sells before the seller's row flips.
  const outOfStock = product.status === 'out_of_stock' || product.quantity < 1

  const toggleSave = () => {
    if (!me) return navigate('/login')
    if (isSaved) unsaveListing.mutate(id)
    else saveListing.mutate(id)
  }

  const blockEntry = (blockedQuery.data?.blocked ?? []).find((b) => b.username === product.seller.username)

  if (blockEntry) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <UserX size={24} />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Vendor Blocked</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You blocked @{product.seller.username} — "{blockEntry.reason}". Their listings are hidden from your feed.
        </p>
        <Link
          to={`/seller/${product.seller.username}`}
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 underline"
        >
          Manage block on their profile
        </Link>
      </div>
    )
  }

  const images = product.images ?? []
  const slideCount = images.length
  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % Math.max(1, slideCount))
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + Math.max(1, slideCount)) % Math.max(1, slideCount))

  // Server reviews → the Reviews component's display shape
  const mappedReviews = product.reviews.map((r) => ({
    id: r.id,
    name: `@${r.reviewer}`,
    rating: r.rating,
    date: formatDate(r.createdAt),
    comment: r.comment ?? '',
    verifiedPurchase: true, // reviews only come from completed escrow deals
  }))

  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Back Link */}
      <div>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Marketplace Browse
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12">
        {/* Left Column: Interactive Image Slider */}
        <div className="lg:col-span-7 space-y-4">
          <div className="group relative h-64 sm:h-[380px] lg:h-[440px] w-full overflow-hidden rounded-3xl bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            {images[activeSlide] ? (
              <img
                src={images[activeSlide]}
                alt={`${product.title} - Slide ${activeSlide + 1}`}
                className="h-full w-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                No image preview available
              </div>
            )}

            <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
              <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                {product.category}
              </span>
            </div>

            {slideCount > 0 && (
              <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
                <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                  {activeSlide + 1} / {slideCount}
                </span>
              </div>
            )}

            {slideCount > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  aria-label="Previous image"
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white shadow-md backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 transition-all opacity-90 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextSlide}
                  aria-label="Next image"
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white shadow-md backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 transition-all opacity-90 group-hover:opacity-100 cursor-pointer"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    activeSlide === i ? 'border-primary-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Detailed Product Specs & Description */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Product Overview & Specifications
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 font-medium block">Category</span>
                <span className="font-semibold text-slate-900 dark:text-white">{product.category}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 font-medium block">Condition</span>
                <span className="font-semibold text-slate-900 dark:text-white">{product.condition || 'New'}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-[10px] text-slate-400 font-medium block">Stock Available</span>
                <span className={`font-semibold ${outOfStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                  {outOfStock ? 'Out of stock' : `${product.quantity} units`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Pricing, Seller info, Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{product.category}</Badge>
                {product.condition && <Badge tone="info">{product.condition}</Badge>}
              </div>

              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {product.title}
              </h1>

              <div className="pt-2">
                <span className="text-xs text-slate-400 font-medium block">Escrow Purchase Price</span>
                <span className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                  {formatMoney(product.price)}
                </span>
              </div>
            </div>

            {/* Vendor Profile Card */}
            <Link
              to={`/seller/${product.seller.username}`}
              className="block rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 p-3.5 hover:border-primary-300 dark:hover:border-primary-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-sm">
                    {product.seller.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-display font-semibold text-xs text-slate-900 dark:text-white">
                        {product.seller.storeName || `@${product.seller.username}`}
                      </span>
                      {product.seller.verified && (
                        <span title="KYC Verified Vendor" className="flex shrink-0">
                          <ShieldCheck size={15} className="text-primary-600 dark:text-primary-400" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      @{product.seller.username} · joined {formatDate(product.seller.joinedAt)} · view profile →
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Primary Action Buttons */}
            {me && me.username === product.seller.username ? (
              <button
                onClick={() => navigate('/listings')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-3.5 text-sm sm:text-base font-bold text-white dark:text-slate-900 shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Store size={18} />
                This is your listing — Manage in Listings
              </button>
            ) : (
              <div className="space-y-3">
                {outOfStock ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                        <PackageX size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                          Out of stock
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                          Every unit has sold. Message the seller to ask whether they're restocking, or
                          save the listing to check back later.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/checkout?listing=${product.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer"
                  >
                    <Lock size={18} />
                    Buy Now (Fund Escrow)
                  </button>
                )}

                {(!me || (me.role !== 'admin' && me.kycStatus !== 'verified')) ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(me ? `/messages?u=${product.seller.username}` : '/login')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <MessageCircle size={15} />
                      Message Vendor
                    </button>

                    <button
                      onClick={toggleSave}
                      disabled={saveListing.isPending || unsaveListing.isPending}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                        isSaved
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {saveListing.isPending || unsaveListing.isPending ? (
                        <Loader2 size={15} className="animate-spin text-rose-500" />
                      ) : (
                        <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} />
                      )}
                      {saveListing.isPending || unsaveListing.isPending
                        ? isSaved
                          ? 'Removing...'
                          : 'Saving...'
                        : isSaved
                        ? 'Saved'
                        : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/messages?u=${product.seller.username}`)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    Message Vendor
                  </button>
                )}
              </div>
            )}

            {/* Escrow Guarantee Policy — hidden when sold out: it describes what
                happens when you pay, and there's nothing to pay for. */}
            {!outOfStock && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Escrow Guarantee & Protection Policy
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                  Your GH₵ payment stays locked in escrow. The seller is only paid after you confirm delivery and inspect the item.
                </p>
              </div>
            )}

            {/* Shipping & Returns */}
            <div className="space-y-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                <Truck size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Location & Delivery</span>
                  {product.location ?? 'Delivery arranged with the seller after escrow funding.'}
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                <RotateCcw size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Return & Inspection Policy</span>
                  Inspection window before release, with full escrow refund protection if the item isn't as described.
                </div>
              </div>
            </div>

            {/* Secondary Actions: Report & Block */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setReported(true)}
                className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <Flag size={13} />
                {reported ? 'Listing Reported' : 'Report Listing'}
              </button>
              <button
                onClick={() => navigate(me ? `/seller/${product.seller.username}` : '/login')}
                title="Blocking (with a reason) is done from the vendor's profile"
                className="flex items-center gap-1 hover:text-rose-600 cursor-pointer"
              >
                <UserX size={13} />
                Block Vendor
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-4 shadow-sm">
        <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Buyer Reviews & Ratings</h2>
        <Reviews reviews={mappedReviews} />
      </div>

      {/* FullScreen Modal View */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-xs font-semibold text-white hover:bg-white/40 cursor-pointer"
          >
            ✕ Close
          </button>
          <img
            src={product.images[activeSlide]}
            alt={product.title}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}
