import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, Loader2, PackageOpen } from 'lucide-react'
import { ListingCard } from '../../shared/ui/ListingCard'
import { useListings } from '../../marketplace/data/marketplaceApi'
import { formatMoney } from '../../shared/libs/currency'

/** Top 6 marketplace listings by average review rating (real API data). */
export function FeaturedListings() {
  const { data, isLoading } = useListings('sort=rating&limit=6')
  const listings = data?.listings ?? []

  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
            <Sparkles size={14} />
            Top Rated · KYC Verified Vendors
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
            Featured Marketplace Listings
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1">
            The highest-rated physical goods on the platform — every purchase is escrow protected.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-3">
          <PackageOpen size={28} className="mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No listings yet — check back soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((item) => (
            <ListingCard
              key={item.id}
              id={item.id}
              imageUrl={item.image ?? undefined}
              title={item.title}
              price={formatMoney(item.price, item.currency)}
              location={item.location ?? ''}
              vendorName={item.sellerUsername}
              vendorVerified={item.sellerVerified}
              rating={item.rating ?? 0}
              reviewCount={item.reviewCount}
            />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/marketplace"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          View All Marketplace Listings
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
