import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  PauseCircle,
  PlayCircle,
  Search,
  Sparkles,
  Store,
  Trash2,
  Zap,
} from 'lucide-react'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { useMyListings } from '../features/seller/data/listingsApi'
import {
  getPromotionStatusLabel,
  useCancelPromotion,
  useMyPromotions,
  usePausePromotion,
  usePromotionMetrics,
  useResumePromotion,
  type Promotion,
  type PromotionStatus,
} from '../features/seller/data/promotions'

/**
 * How much of a run is left, in the words a seller actually wants.
 *
 * The card only ever showed the end date, which makes you do the arithmetic —
 * "ends 14 Sep" says nothing at a glance about whether that is tomorrow or next
 * month. Kept identical to the phone's copy in
 * `mobile/src/features/seller/ui/PromotionsScreen.tsx`, so the same run does not
 * describe itself two different ways on two devices.
 *
 * Rounded up, so a run with eight hours left reads "1 day left" rather than
 * "0 days left" while it is still going. Under an hour gets its own wording:
 * "1 day left" on something expiring within the hour would be a lie.
 */
function timeLeft(endsAt: string | null): string | null {
  if (!endsAt) return null
  const ms = new Date(endsAt).getTime() - Date.now()
  if (Number.isNaN(ms) || ms <= 0) return null
  if (ms < 60 * 60 * 1000) return 'ends within the hour'
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  return days === 1 ? '1 day left' : `${days} days left`
}

function StatusBadge({ status }: { status: PromotionStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Live &amp; Promoted
      </span>
    )
  }

  const classes =
    status === 'paused'
      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
      : status === 'expired'
        ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        : 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'

  return <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${classes}`}>{getPromotionStatusLabel(status)}</span>
}

function PromotionCard({
  promotion,
  busy,
  onPause,
  onResume,
  onCancel,
}: {
  promotion: Promotion
  busy: boolean
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
          {promotion.listingImage ? (
            <img src={promotion.listingImage} alt={promotion.listingTitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
              <Store size={20} />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/promotions/${promotion.listingId}`}
              className="font-display text-sm font-bold text-slate-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {promotion.listingTitle}
            </Link>
            <StatusBadge status={promotion.status} />
          </div>
          {/*
            Hidden on phones, shown from `sm` up. These are four facts a seller
            rarely needs — category, boost weight, what was paid, the exact end
            date — and on a narrow screen they crowd out the two that matter:
            which listing, and how long is left. A tablet or a desktop has the
            room, so it keeps them.

            `sm` (640px) rather than the `md` this app usually switches at: `md`
            is where the nav hands off to the drawer, but a tablet in portrait
            sits between the two and should show this.
          */}
          <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
            {promotion.category} · boost {promotion.priority} · paid {formatMoney(promotion.amount)}
            {promotion.endsAt ? ` · ends ${formatDate(promotion.endsAt)}` : ''}
          </p>
          {/*
            Plan and time remaining share a row. They answer the same question
            from two sides — what was bought, and how much of it is left — and
            beside the status badge the countdown made that row a column wider
            for no gain. Wraps, because a long plan label next to "14 days left"
            can outrun a narrow card.

            Only while a run is live: on a paused or expired promotion it would
            be describing a clock that is stopped.
          */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-block text-[10px] font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-md border border-primary-200 dark:border-primary-800">
              Plan: {promotion.planLabel}
            </span>
            {promotion.status === 'active' && timeLeft(promotion.endsAt) && (
              /* Unfilled on purpose — two chips side by side compete, and the
                 plan is the one that should read as the label. */
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <Clock3 size={11} />
                {timeLeft(promotion.endsAt)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/promotions/${promotion.listingId}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 transition-all shadow-sm"
        >
          <BadgeDollarSign size={14} /> Studio
        </Link>
        <button
          onClick={onPause}
          disabled={busy || promotion.status !== 'active'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
        >
          <PauseCircle size={14} /> Pause
        </button>
        <button
          onClick={onResume}
          disabled={busy || promotion.status !== 'paused'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
        >
          <PlayCircle size={14} /> Resume
        </button>
        <button
          onClick={onCancel}
          disabled={busy || promotion.status === 'cancelled'}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/70 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
        >
          <Trash2 size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

export function Promotions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const search = searchParams.get('search') ?? ''

  // The receipt for a purchase made in the studio, which redirects here once the
  // spotlight is bought. Read once into state and then stripped from history, so
  // a refresh — or a trip forward and back — doesn't replay a stale one.
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState<string | null>(
    () => (location.state as { notice?: string } | null)?.notice ?? null,
  )
  useEffect(() => {
    if (!location.state) return
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  const listingsQuery = useMyListings(`page=${page}&limit=30`)
  // Seller-wide, not page-scoped: a promotion on a listing from page 2 still
  // belongs in this list. Narrowed to live runs server-side so a long history of
  // finished ones can't fill the page and hide the campaigns being managed.
  const promotionsQuery = useMyPromotions('status=live&limit=50')
  const { data: metrics } = usePromotionMetrics()

  const pause = usePausePromotion()
  const resume = useResumePromotion()
  const cancel = useCancelPromotion()
  const busy = pause.isPending || resume.isPending || cancel.isPending

  const normalizedSearch = search.trim().toLowerCase()
  const matches = (haystack: string[]) =>
    !normalizedSearch || haystack.join(' ').toLowerCase().includes(normalizedSearch)

  const allPromotions = promotionsQuery.data?.promotions ?? []
  // A cancelled/expired run stays in history but shouldn't crowd the managed list.
  const livePromotions = allPromotions.filter((p) => p.status === 'active' || p.status === 'paused')
  const shownPromotions = livePromotions.filter((p) => matches([p.listingTitle, p.category, p.planLabel]))

  const promotedListingIds = useMemo(
    () => new Set(livePromotions.map((p) => p.listingId)),
    [livePromotions],
  )

  const eligibleListings = (listingsQuery.data?.listings ?? []).filter(
    (listing) =>
      listing.status === 'active' &&
      !promotedListingIds.has(listing.id) &&
      matches([listing.title, listing.category, listing.description ?? '', listing.short, listing.location ?? '']),
  )

  const totalPages = listingsQuery.data?.pages ?? 1
  const totalActiveListings = listingsQuery.data?.total ?? 0

  return (
    <div className="py-4 sm:py-6 space-y-6 max-w-7xl mx-auto">
      <Link to="/listings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to My Listings
      </Link>

      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shadow-sm animate-fade-in">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 p-6 sm:p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-300">
              <Sparkles size={14} /> Seller Promotions Studio
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Boost Your Listing Visibility</h1>
            <p className="text-xs sm:text-sm text-slate-200">
              Promoted listings stay pinned at the top of search results and category feeds. Boost sales with targeted exposure.
            </p>
          </div>
          <button
            onClick={() => promotionsQuery.refetch()}
            disabled={promotionsQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-all border border-white/10 shrink-0 disabled:opacity-60"
          >
            {promotionsQuery.isFetching && <Loader2 size={13} className="animate-spin" />}
            Refresh promotion status
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-4 relative z-10">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Active promotions</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{metrics?.activePromotionCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Paused promotions</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{metrics?.pausedPromotionCount ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Finished runs</p>
            <p className="mt-1 text-2xl font-bold">
              {(metrics?.expiredPromotionCount ?? 0) + (metrics?.cancelledPromotionCount ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Average priority</p>
            <p className="mt-1 text-2xl font-bold">{metrics?.averagePriority ?? 0} pts</p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Total spend</p>
            <p className="mt-1 text-2xl font-bold text-primary-300">{formatMoney(metrics?.totalSpend ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-2xl">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => updateParams({ search: event.target.value || null, page: '1' })}
              placeholder="Filter this page by title, category, description, or location…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1">{totalActiveListings} listings</span>
            {search && (
              <button onClick={() => updateParams({ search: null, page: '1' })} className="text-primary-600 dark:text-primary-400 hover:underline">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {listingsQuery.isLoading || promotionsQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {shownPromotions.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-500" /> Active &amp; Managed Promotions ({shownPromotions.length})
              </h2>
              <div className="space-y-3">
                {shownPromotions.map((promotion) => (
                  <PromotionCard
                    key={promotion.id}
                    promotion={promotion}
                    busy={busy}
                    onPause={() => pause.mutate(promotion.id)}
                    onResume={() => resume.mutate(promotion.id)}
                    onCancel={() => cancel.mutate(promotion.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Store size={18} className="text-primary-600 dark:text-primary-400" /> Select a Listing to Promote ({eligibleListings.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Only active listings can be promoted.</p>
            </div>

            {eligibleListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-10 text-center space-y-3">
                <Store size={32} className="mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No available active listings to promote</p>
                <Link
                  to="/listings/new"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700 transition-all shadow-md"
                >
                  Create a new listing
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligibleListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:border-primary-400 dark:hover:border-primary-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      <div className="h-36 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 relative">
                        {listing.image ? (
                          <img src={listing.image} alt={listing.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Store size={24} />
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{listing.category}</span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{listing.title}</h3>
                        <p className="font-display font-extrabold text-base text-slate-900 dark:text-white mt-1">
                          {formatMoney(listing.price)}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/promotions/${listing.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-xs font-bold transition-all shadow-sm"
                    >
                      <BadgeDollarSign size={14} /> Promote this listing
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => updateParams({ page: String(page - 1) })}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => updateParams({ page: String(page + 1) })}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
