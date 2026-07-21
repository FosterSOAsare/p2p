import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { ListingCard } from '../../shared/ui/ListingCard'
import { products } from '../../marketplace/data'

const categories = ['All', 'Electronics', 'Collectibles', 'Home & Office', 'Fashion']

export function FeaturedListings() {
  const [selectedCategory, setSelectedCategory] = useState('All')

  const filtered =
    selectedCategory === 'All'
      ? products.slice(0, 8)
      : products.filter((item) => item.category === selectedCategory).slice(0, 8)

  return (
    <section className="relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
            <Sparkles size={14} />
            KYC Verified Vendors
          </div>
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">Featured Marketplace Listings</h2>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-1">Explore physical goods available with escrow protection.</p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: 4 items per row on large screens */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <ListingCard
            key={item.id}
            id={item.id}
            imageUrl={item.images[0]}
            title={item.title}
            price={`$${item.price.toLocaleString()}`}
            location={item.location}
            vendorName={item.vendorName}
            vendorVerified={item.vendorVerified}
            rating={item.rating}
            reviewCount={item.reviewCount}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/marketplace"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
        >
          View All Marketplace Listings ({products.length} Total)
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
