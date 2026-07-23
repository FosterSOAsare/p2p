import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  ShieldCheck,
  Store,
  Search as SearchIcon,
} from 'lucide-react'
import { products } from '../data'
import { SearchBar } from '../../shared/ui/SearchBar'
import { FilterChip } from '../../shared/ui/FilterChip'

export function Products() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedCondition, setSelectedCondition] = useState<string>('All')
  const [onlyVerifiedVendors, setOnlyVerifiedVendors] = useState<boolean>(false)
  const [maxPrice, setMaxPrice] = useState<number>(15000)
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured')
  const [savedListings, setSavedListings] = useState<string[]>([])
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false)

  // Toggle saved bookmark
  const toggleSaveListing = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSavedListings((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Filter logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (
          searchQuery &&
          !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false
        }
        // Category
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false
        }
        // Condition
        if (selectedCondition !== 'All' && p.condition !== selectedCondition) {
          return false
        }
        // Verified Vendor
        if (onlyVerifiedVendors && !p.vendorVerified) {
          return false
        }
        // Max Price
        if (p.price > maxPrice) {
          return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price
        if (sortBy === 'price-desc') return b.price - a.price
        if (sortBy === 'rating') return b.rating - a.rating
        return 0
      })
  }, [searchQuery, selectedCategory, selectedCondition, onlyVerifiedVendors, maxPrice, sortBy])

  // Clear all filters
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategory('All')
    setSelectedCondition('All')
    setOnlyVerifiedVendors(false)
    setMaxPrice(15000)
    setSortBy('featured')
  }

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedCondition !== 'All' ? 1 : 0) +
    (onlyVerifiedVendors ? 1 : 0) +
    (maxPrice < 15000 ? 1 : 0) +
    (searchQuery ? 1 : 0)

  // Active filter chip labels
  const activeChips: { id: string; label: string; onRemove: () => void }[] = []
  if (selectedCategory !== 'All') {
    activeChips.push({
      id: 'cat',
      label: `Category: ${selectedCategory}`,
      onRemove: () => setSelectedCategory('All'),
    })
  }
  if (selectedCondition !== 'All') {
    activeChips.push({
      id: 'cond',
      label: `Condition: ${selectedCondition}`,
      onRemove: () => setSelectedCondition('All'),
    })
  }
  if (onlyVerifiedVendors) {
    activeChips.push({
      id: 'kyc',
      label: 'Verified Vendors Only',
      onRemove: () => setOnlyVerifiedVendors(false),
    })
  }
  if (searchQuery) {
    activeChips.push({
      id: 'query',
      label: `"${searchQuery}"`,
      onRemove: () => setSearchQuery(''),
    })
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
            <Store size={14} />
            Peer-to-Peer Physical Goods
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Marketplace Browse
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Discover verified seller items protected by rail-agnostic escrow.
          </p>
        </div>
      </div>

      {/* Main Search & Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Shared SearchBar Component */}
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search listings by title, seller (@kwame_tech), or keyword..."
              onFilterToggle={() => setShowFilterDrawer(!showFilterDrawer)}
              filterCount={activeFilterCount}
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-44">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="featured">Featured Listings</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Top Vendor Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips Container */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Active Filters:</span>
            {activeChips.map((chip) => (
              <FilterChip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
            ))}
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline ml-2 cursor-pointer"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Desktop Filter Options Bar */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Category Pills */}
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Category:</span>
            {['All', 'Electronics', 'Collectibles', 'Home & Office', 'Fashion'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white shadow-sm font-semibold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            {/* KYC Verified Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyVerifiedVendors}
                onChange={(e) => setOnlyVerifiedVendors(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 text-xs">
                <ShieldCheck size={13} className="text-primary-600 dark:text-primary-400" />
                Verified Sellers Only
              </span>
            </label>
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {showFilterDrawer && (
          <div className="md:hidden bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Electronics', 'Collectibles', 'Home & Office', 'Fashion'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3 py-1 ${
                      selectedCategory === cat ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={onlyVerifiedVendors}
                  onChange={(e) => setOnlyVerifiedVendors(e.target.checked)}
                  className="rounded"
                />
                KYC Verified Sellers Only
              </label>
            </div>

            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="text-primary-600 dark:text-primary-400 font-semibold underline">
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Header Counter */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> listings
        </span>
        {savedListings.length > 0 && (
          <span className="text-primary-600 dark:text-primary-400">
            ♥ {savedListings.length} item{savedListings.length > 1 ? 's' : ''} saved
          </span>
        )}
      </div>

      {/* Listing Grid: SLEEK COMPACT CARDS FOR 4 ITEMS PER ROW */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => {
            const isSaved = savedListings.includes(p.id)
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/marketplace/${p.id}`)}
                className="group cursor-pointer relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-2.5">
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                        No image available
                      </div>
                    )}

                    {/* Category Tag Overlay */}
                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                        {p.category}
                      </span>
                    </div>

                    {/* Bookmark Save Action */}
                    <button
                      onClick={(e) => toggleSaveListing(p.id, e)}
                      title={isSaved ? 'Remove from saved' : 'Save listing'}
                      className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                        isSaved
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:text-rose-500'
                      }`}
                    >
                      <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {/* Vendor Panel */}
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 truncate max-w-[65%]">
                      @{p.vendorName}
                      {p.vendorVerified && (
                        <span title="KYC Verified Vendor" className="flex shrink-0">
                          <ShieldCheck size={12} className="text-primary-600 dark:text-primary-400" />
                        </span>
                      )}
                    </span>
                    <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium text-slate-500 dark:text-slate-400 text-[10px]">
                      {p.condition}
                    </span>
                  </div>

                  {/* Title & Short */}
                  <h3 className="font-display font-semibold text-slate-900 dark:text-white text-xs line-clamp-1 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{p.short}</p>
                </div>

                {/* Card Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">In Escrow</span>
                    <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                      ${p.price.toLocaleString()}
                    </span>
                  </div>

                  <span className="inline-flex items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:text-primary-400 group-hover:bg-primary-600 group-hover:text-white dark:group-hover:bg-primary-600 dark:group-hover:text-white transition-all">
                    View
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-10 text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <SearchIcon size={20} />
          </div>
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">No listings match your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords, clearing category filters, or turning off the verified vendor filter.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}
