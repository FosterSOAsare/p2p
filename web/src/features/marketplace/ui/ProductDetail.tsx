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
  Maximize2,
} from 'lucide-react'
import { products } from '../data'
import { RatingStars } from '../../shared/ui/RatingStars'
import { Reviews } from './Reviews'
import { Badge } from '../../shared/ui/Badge'

export function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.id === id)

  const [isSaved, setIsSaved] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [vendorBlocked, setVendorBlocked] = useState(false)
  const [reported, setReported] = useState(false)
  const [chatOpened, setChatOpened] = useState(false)

  if (!product) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Listing Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">The listing you are looking for may have been sold or removed.</p>
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

  if (vendorBlocked) {
    return (
      <div className="py-12 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
          <UserX size={24} />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Vendor Blocked</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You have blocked @{product.vendorName}. All listings from this vendor are hidden from your feed per your account preferences.
        </p>
        <button
          onClick={() => setVendorBlocked(false)}
          className="text-xs font-semibold text-primary-600 dark:text-primary-400 underline cursor-pointer"
        >
          Unblock @{product.vendorName}
        </button>
      </div>
    )
  }

  const slideCount = product.images.length

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slideCount)
  }

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slideCount) % slideCount)
  }

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
          {/* Main Slider Container */}
          <div className="group relative h-64 sm:h-[380px] lg:h-[440px] w-full overflow-hidden rounded-3xl bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
            {product.images[activeSlide] ? (
              <img
                src={product.images[activeSlide]}
                alt={`${product.title} - Slide ${activeSlide + 1}`}
                className="h-full w-full object-cover transition-opacity duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                No image preview available
              </div>
            )}

            {/* Category Tag Badge */}
            <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
              <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                {product.category}
              </span>
            </div>

            {/* Slide Index Counter Badge */}
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                {activeSlide + 1} / {slideCount}
              </span>
            </div>

            {/* Carousel Navigation Arrows */}
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

            {/* Full Screen View Button */}
            <button
              onClick={() => setIsFullScreen(true)}
              className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 text-white backdrop-blur-md hover:bg-slate-900 cursor-pointer"
              title="Expand full screen"
            >
              <Maximize2 size={15} />
            </button>
          </div>

          {/* Carousel Slide Indicators & Thumbnail Strip */}
          {slideCount > 1 && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              {/* Dots */}
              <div className="flex gap-1.5 shrink-0">
                {product.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeSlide === idx ? 'w-5 bg-primary-600' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 overflow-x-auto shrink-0">
                {product.images.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl border-2 transition-all shrink-0 cursor-pointer ${
                      activeSlide === idx ? 'border-primary-600 ring-2 ring-primary-200 dark:ring-primary-900' : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8 space-y-3 mt-4 shadow-sm">
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">Item Description</h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>
        </div>

        {/* Right Column: Checkout & Vendor Information Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 lg:p-8 shadow-sm space-y-5 sm:space-y-6">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge tone="neutral">{product.condition}</Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {product.quantity} unit{product.quantity > 1 ? 's' : ''} available
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                {product.title}
              </h1>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  ${product.price.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">USD in Escrow</span>
              </div>
            </div>

            {/* Vendor Panel Card */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 font-display text-xs font-bold text-primary-700 dark:text-primary-300 shrink-0">
                    {product.vendorName[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">@{product.vendorName}</span>
                      {product.vendorVerified && (
                        <span title="KYC Verified Vendor" className="flex shrink-0">
                          <ShieldCheck size={15} className="text-primary-600 dark:text-primary-400" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Response time: {product.vendorResponseTime}</p>
                  </div>
                </div>
                {product.vendorVerified && <Badge tone="success">KYC Verified</Badge>}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                <RatingStars rating={product.vendorRating} reviewCount={product.reviewCount} />
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/checkout?listing=${product.id}`)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer"
              >
                <Lock size={18} />
                Buy Now (Fund Escrow)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setChatOpened(!chatOpened)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <MessageCircle size={15} />
                  Message Vendor
                </button>

                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-semibold transition-all cursor-pointer ${
                    isSaved
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>

            {/* Chat Box Drawer Simulation */}
            {chatOpened && (
              <div className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/50 p-3.5 space-y-2.5 text-xs animate-fade-in">
                <div className="flex justify-between items-center font-semibold text-slate-800 dark:text-slate-200">
                  <span>Pre-Purchase Chat with @{product.vendorName}</span>
                  <button onClick={() => setChatOpened(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                </div>
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px]">
                  Ask vendor questions before placing order. Messages will be recorded into the official order audit trail if you purchase.
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Is this still available for delivery?"
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button className="rounded-xl bg-primary-600 px-3 py-1.5 font-semibold text-white cursor-pointer">Send</button>
                </div>
              </div>
            )}

            {/* Escrow Guarantee Policy */}
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3.5 space-y-1.5 text-xs text-emerald-900 dark:text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                Escrow Guarantee & Protection Policy
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                Funds remain safely held in our append-only escrow ledger. The seller is only paid after you confirm delivery and inspect the item.
              </p>
            </div>

            {/* Shipping & Returns */}
            <div className="space-y-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                <Truck size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Shipping & Delivery</span>
                  {product.shippingEstimate}
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
                <RotateCcw size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Return & Inspection Policy</span>
                  {product.returnPolicy}
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
                onClick={() => setVendorBlocked(true)}
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
        <Reviews reviews={product.reviews} />
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
