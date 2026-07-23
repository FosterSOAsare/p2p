import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Heart,
  ShieldCheck,
  Store,
  Search as SearchIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SearchBar } from '../../shared/ui/SearchBar'
import { FilterChip } from '../../shared/ui/FilterChip'
import { useCategories, useListings } from '../data/marketplaceApi'
import { useMe } from '../../auth/data/authApi'
import { useSavedListings, useSaveListing, useUnsaveListing, useBlockedVendors } from '../../user/data/usersApi'
import { useDebouncedValue } from '../../shared/libs/useDebouncedValue'
import { apiErrorMessage } from '../../shared/libs/api'
import { formatMoney } from '../../shared/libs/currency'

export function Products() {
  const navigate = useNavigate()

  // ---- All filters live in the URL, not component state ----
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? 'All'
  const sort = searchParams.get('sort') ?? 'featured'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    // any filter change resets pagination
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
  }

  // Search box: local text for typing feel, committed to the URL debounced
  const [searchInput, setSearchInput] = useState(search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)
  useEffect(() => {
    if (debouncedSearch !== search) updateParams({ search: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // ---- Server data ----
  const apiQuery = new URLSearchParams()
  if (search) apiQuery.set('search', search)
  if (category !== 'All') apiQuery.set('category', category)
  if (sort !== 'featured') apiQuery.set('sort', sort)
  apiQuery.set('page', String(page))
  apiQuery.set('limit', '12')

  const listingsQuery = useListings(apiQuery.toString())
  const categoriesQuery = useCategories()
  const { data: me } = useMe()

  // ---- Saved listings (real bookmarks) ----
  const savedQuery = useSavedListings()
  const saveListing = useSaveListing()
  const unsaveListing = useUnsaveListing()
  const savedIds = new Set((savedQuery.data?.saved ?? []).map((s) => s.id))

  // Hide listings from vendors this user has blocked
  const blockedQuery = useBlockedVendors()
  const blockedSellers = new Set((blockedQuery.data?.blocked ?? []).map((b) => b.username))

  const toggleSaveListing = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!me) return navigate('/login')
    if (savedIds.has(id)) unsaveListing.mutate(id)
    else saveListing.mutate(id)
  }

  // Category strip scrolling
  const categoryStripRef = useRef<HTMLDivElement>(null)
  const scrollCategories = (direction: 1 | -1) => {
    categoryStripRef.current?.scrollBy({ left: direction * 320, behavior: 'smooth' })
  }

  const resetFilters = () => {
    setSearchInput('')
    setSearchParams(new URLSearchParams())
  }

  const activeChips: { id: string; label: string; onRemove: () => void }[] = []
  if (category !== 'All') {
    activeChips.push({ id: 'cat', label: `Category: ${category}`, onRemove: () => updateParams({ category: null }) })
  }
  if (search) {
    activeChips.push({
      id: 'query',
      label: `"${search}"`,
      onRemove: () => {
        setSearchInput('')
        updateParams({ search: null })
      },
    })
  }

  const categoryNames = ['All', ...(categoriesQuery.data?.categories.map((c) => c.name) ?? [])]
  const data = listingsQuery.data
  const rangeStart = data && data.total > 0 ? (data.page - 1) * 12 + 1 : 0
  const rangeEnd = data ? Math.min(data.page * 12, data.total) : 0

  return (
    <div className="py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-1">
            <Store size={14} />
            Peer-to-Peer Goods & Services
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Marketplace Browse
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Physical items and online-delivered goods — all protected by GH₵ escrow.
          </p>
        </div>
      </div>

      {/* Main Search & Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onClear={() => {
                setSearchInput('')
                updateParams({ search: null })
              }}
              placeholder="Search listings by title, seller (@kwame_tech), or keyword..."
              showFilterButton={false}
            />
          </div>

          {/* Sort Dropdown — URL-driven */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-44">
              <select
                value={sort}
                onChange={(e) => updateParams({ sort: e.target.value === 'featured' ? null : e.target.value })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-primary-500 focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="featured">Featured Listings</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
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

        {/* Category Strip — horizontal scroll with edge fades + arrow controls (all screen sizes) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => scrollCategories(-1)}
            aria-label="Scroll categories left"
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="relative flex-1 min-w-0">
            {/* Edge fade masks */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white dark:from-slate-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white dark:from-slate-950 to-transparent" />

            <div
              ref={categoryStripRef}
              className="flex items-center gap-2 overflow-x-auto scroll-smooth px-1 py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {categoryNames.map((cat) => (
                <button
                  key={cat}
                  onClick={() => updateParams({ category: cat === 'All' ? null : cat })}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    category === cat
                      ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-700 dark:hover:text-primary-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => scrollCategories(1)}
            aria-label="Scroll categories right"
            className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Results Header Counter */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
        <span>
          {data ? (
            <>
              Showing <strong className="text-slate-900 dark:text-white">{rangeStart}–{rangeEnd}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{data.total}</strong> listings
            </>
          ) : (
            'Loading listings...'
          )}
        </span>
        {savedIds.size > 0 && (
          <span className="text-primary-600 dark:text-primary-400">
            ♥ {savedIds.size} item{savedIds.size > 1 ? 's' : ''} saved
          </span>
        )}
      </div>

      {/* Loading / error states */}
      {listingsQuery.isLoading && (
        <div className="py-16 text-center">
          <Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {listingsQuery.isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(listingsQuery.error)}
        </div>
      )}

      {/* Listing Grid */}
      {data && data.listings.length > 0 && (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 transition-opacity ${listingsQuery.isFetching ? 'opacity-60' : ''}`}>
          {data.listings.filter((p) => !blockedSellers.has(p.sellerUsername)).map((p) => {
            const isSaved = savedIds.has(p.id)
            return (
              <div
                key={p.id}
                onClick={() => navigate(`/marketplace/${p.id}`)}
                className="group cursor-pointer relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200"
              >
                <div>
                  {/* Image Container */}
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-2.5">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                        No image available
                      </div>
                    )}

                    <div className="absolute left-2 top-2">
                      <span className="rounded-full bg-slate-900/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-semibold text-white">
                        {p.category}
                      </span>
                    </div>

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
                      @{p.sellerUsername}
                      {p.sellerVerified && (
                        <span title="KYC Verified Vendor" className="flex shrink-0">
                          <ShieldCheck size={12} className="text-primary-600 dark:text-primary-400" />
                        </span>
                      )}
                    </span>
                    {p.condition && (
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-medium text-slate-500 dark:text-slate-400 text-[10px]">
                        {p.condition}
                      </span>
                    )}
                  </div>

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
                      {formatMoney(p.price)}
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
      )}

      {/* Empty State */}
      {data && data.listings.length === 0 && (
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

      {/* Pagination — page lives in the URL */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => updateParams({ page: n === 1 ? null : String(n) })}
              className={`h-8 min-w-8 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                n === page
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= data.pages}
            onClick={() => updateParams({ page: String(page + 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
