import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Loader2,
  PauseCircle,
  PlayCircle,
  Sparkles,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { useListing } from '../features/marketplace/data/marketplaceApi'
import { useMe } from '../features/auth/data/authApi'
import { apiErrorMessage } from '../features/shared/libs/api'
import { useInitDeposit, pendingAction } from '../features/escrow/data/paymentsApi'
import { useWallet } from '../features/escrow/data/walletApi'
import {
  MAX_PRIORITY,
  PRIORITY_STEP,
  PROMOTION_PLANS,
  getPromotionPlanDetails,
  getPromotionStatusLabel,
  promotionPrice,
  useCancelPromotion,
  useLaunchPromotion,
  usePausePromotion,
  usePromotionMetrics,
  usePromotionQuote,
  useResumePromotion,
  type PromotionPlanId,
  type PromotionStatus,
} from '../features/seller/data/promotions'

function StatusBadge({ status }: { status: PromotionStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${classes}`}>
      {getPromotionStatusLabel(status)}
    </span>
  )
}

function getBoostTier(score: number) {
  if (score >= 80) return { label: 'Maximum Exposure', text: 'text-purple-600 dark:text-purple-400' }
  if (score >= 50) return { label: 'Turbo Boost', text: 'text-amber-600 dark:text-amber-400' }
  if (score >= 20) return { label: 'Enhanced Visibility', text: 'text-emerald-600 dark:text-emerald-400' }
  return { label: 'Standard Boost', text: 'text-blue-600 dark:text-blue-400' }
}

export function PromotionDetail() {
  const { listingId = '' } = useParams()

  const listingQuery = useListing(listingId)
  const { data: me } = useMe()
  const { data: metrics } = usePromotionMetrics()

  const [planId, setPlanId] = useState<PromotionPlanId>('14d')
  const [priority, setPriority] = useState<number>(10)
  const [redirecting, setRedirecting] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Same source the deals pages use. Deliberately not read off the quote: a
  // pricing call that fails would then render a real balance as GH₵0.00.
  const walletQuery = useWallet()
  const quoteQuery = usePromotionQuote(listingId, planId, priority, Boolean(listingId))
  const launch = useLaunchPromotion()
  const pause = usePausePromotion()
  const resume = useResumePromotion()
  const cancel = useCancelPromotion()
  const initDeposit = useInitDeposit()

  const currentPromotion = quoteQuery.data?.current ?? null

  // Adopt the live run's settings once, when the studio first learns about it —
  // keyed on the promotion id so it doesn't stomp the seller's edits on every
  // refetch of the quote.
  const adoptedId = currentPromotion?.id ?? null
  useEffect(() => {
    if (!currentPromotion) return
    setPlanId(currentPromotion.planId)
    setPriority(currentPromotion.priority)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adoptedId])

  if (!listingId) return <Navigate to="/promotions" replace />

  if (listingQuery.isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 size={32} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading promotion studio…</p>
      </div>
    )
  }

  const listing = listingQuery.data
  if (!listing) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          <Store size={28} />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Listing not found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">The product listing you are trying to promote could not be retrieved.</p>
        <Link
          to="/promotions"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-all shadow-md"
        >
          <ArrowLeft size={16} /> Return to Promotions Hub
        </Link>
      </div>
    )
  }

  const plans = metrics?.plans ?? PROMOTION_PLANS
  const maxPriority = metrics?.maxPriority ?? MAX_PRIORITY
  // The seller pays from their own wallet, so only the owner can buy — admins
  // included. The server enforces the same rule.
  const isOwner = Boolean(me && me.username === listing.seller.username)
  const isActive = listing.status === 'active'
  const boostTier = getBoostTier(priority)

  const quote = quoteQuery.data
  // Preview from the mirrored formula until the server's quote lands, so the
  // slider stays responsive; the charge itself always comes from the server.
  const previewTotal = promotionPrice(planId, priority, plans)
  const total = quote?.total ?? previewTotal
  const charge = quote?.charge ?? previewTotal
  const mode = quote?.mode ?? 'new'
  const addedDays = quote?.addedDays ?? 0
  const walletBalance = walletQuery.data?.balance ?? 0
  const endsAt = quote?.endsAt ?? null

  const busy = launch.isPending || initDeposit.isPending || redirecting
  const mutationError =
    launch.error ?? initDeposit.error ?? pause.error ?? resume.error ?? cancel.error ?? null
  const errorMessage = mutationError ? apiErrorMessage(mutationError) : null

  const onLaunched = (charged: number) => {
    setSuccessNotice(
      charged > 0
        ? `Spotlight live — ${formatMoney(charged)} debited from your wallet.`
        : 'Spotlight updated — no extra charge for this change.',
    )
    setTimeout(() => setSuccessNotice(null), 5000)
  }

  const submitLaunch = () => {
    launch.mutate({ listingId, planId, priority }, { onSuccess: ({ charged }) => onLaunched(charged) })
  }

  /**
   * Wallet first, Paystack for the rest — and nothing to choose, so no picker:
   * a balance that covers the spotlight pays for it outright, and a short one
   * is topped up by exactly the difference. The top-up lands in the wallet, then
   * the launch debits the full price from it, so the seller pays their shortfall
   * once and the balance is spent rather than stranded.
   */
  const startPurchase = () => {
    if (charge <= 0 || charge <= walletBalance) return submitLaunch()

    const shortfall = Math.round((charge - walletBalance) * 100) / 100
    setRedirecting(true)
    initDeposit.mutate(
      { amount: shortfall },
      {
        onSuccess: ({ authorizationUrl, reference }) => {
          pendingAction.save({
            kind: 'promotion',
            listingId,
            planId,
            priority,
            reference,
            returnTo: `/promotions/${listingId}`,
          })
          window.location.href = authorizationUrl
        },
        onError: () => setRedirecting(false),
      },
    )
  }

  const shortfall = Math.round(Math.max(0, charge - walletBalance) * 100) / 100
  const ctaLabel =
    charge <= 0
      ? 'Update Promotion'
      : shortfall > 0
        ? `Continue to Paystack — ${formatMoney(shortfall)}`
        : mode === 'extend'
          ? `Add ${addedDays} days for ${formatMoney(charge)}`
          : mode === 'priority'
            ? `Raise rank for ${formatMoney(charge)}`
            : `Launch for ${formatMoney(charge)}`

  return (
    <div className="py-4 sm:py-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/promotions"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Promotions Hub
        </Link>
        <Link
          to={`/marketplace/${listing.id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
        >
          View Live Listing <ExternalLink size={13} />
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-primary-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-white/20 bg-slate-800 shadow-md">
              {listing.images[0] ? (
                <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                  <Store size={24} />
                </div>
              )}
            </div>
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/20 border border-primary-400/30 px-2.5 py-0.5 text-[11px] font-bold text-primary-300">
                  <Sparkles size={12} /> Promotion Studio
                </span>
                {/* Only once there's a real run — a listing that was never
                    promoted used to render a red "Cancelled" pill. */}
                {currentPromotion && <StatusBadge status={currentPromotion.status} />}
              </div>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white truncate">
                {listing.title}
              </h1>
              <p className="text-xs text-slate-300">
                {formatMoney(listing.price, listing.currency)} · {listing.category} · {listing.condition ?? 'Standard condition'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 text-center min-w-[110px]">
              <span className="block text-[10px] font-semibold uppercase text-slate-300">Wallet</span>
              <span className="font-display text-lg font-bold text-emerald-400">{formatMoney(walletBalance)}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-3.5 text-center min-w-[110px]">
              <span className="block text-[10px] font-semibold uppercase text-slate-300">Boost Score</span>
              <span className="font-display text-lg font-bold text-amber-300">{priority} pts</span>
            </div>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/60 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2 shadow-sm animate-fade-in">
          <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Plan Selector + Priority Slider + Live Preview */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Select Plan Tier */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-xs font-extrabold text-primary-700 dark:text-primary-300">1</span>
                Select Promotion Duration
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Spotlight Placement</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const isSelected = planId === plan.id
                const isPopular = plan.id === '14d'
                const dailyRate = plan.price / plan.days

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setPlanId(plan.id)}
                    aria-pressed={isSelected}
                    className={`relative rounded-2xl border p-4 text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-950/40 shadow-md shadow-primary-500/10 ring-2 ring-primary-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:-translate-y-0.5 hover:border-primary-400 hover:bg-white hover:shadow-md dark:hover:border-primary-700 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
                        <Flame size={10} /> Popular Choice
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-white">{plan.label}</span>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 dark:border-slate-700'}`}>
                        {isSelected && <Check size={10} />}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mb-3">
                      {plan.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-baseline justify-between">
                      <div>
                        <span className="font-display text-lg font-bold text-slate-900 dark:text-white">{formatMoney(plan.price)}</span>
                        <span className="text-[10px] text-slate-400 block">{formatMoney(dailyRate)}/day</span>
                      </div>
                      <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 bg-primary-100/60 dark:bg-primary-950 px-2 py-0.5 rounded-md">
                        {plan.days} Days
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Listed prices are at boost 0. Raising the priority rank adds a surcharge — up to double at rank {maxPriority}.
            </p>
          </div>

          {/* Step 2: Priority Boost Score Controller */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-xs font-extrabold text-primary-700 dark:text-primary-300">2</span>
                Priority Rank Controller
              </h2>
              <span className={`text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 ${boostTier.text}`}>
                {boostTier.label} ({priority} pts)
              </span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Priority Boost Level</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{priority} / {maxPriority} points</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxPriority}
                  step={PRIORITY_STEP}
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                  <span>Standard (0)</span>
                  <span>Enhanced (25)</span>
                  <span>Turbo (50)</span>
                  <span>Maximum ({maxPriority})</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Price at this rank</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatMoney(total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Surcharge over list price</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    +{Math.round((priority / maxPriority) * 100)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                  Higher priority scores break ties when multiple sellers promote listings in the same category.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Live Marketplace Card Mockup Preview */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-xs font-extrabold text-primary-700 dark:text-primary-300">3</span>
                Live Marketplace Card Preview
              </h2>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Search Feed Appearance
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Here is how your promoted product will appear to buyers browsing search results and category feeds:
            </p>

            {/* Mock Card */}
            <div className="mx-auto max-w-sm rounded-2xl border border-primary-500/40 bg-white dark:bg-slate-900 p-4 shadow-xl shadow-primary-500/5 relative overflow-hidden ring-2 ring-primary-500/20">
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-black tracking-wider text-white shadow-md uppercase">
                  <Flame size={12} /> Promoted
                </span>
              </div>
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/20">
                  Boost {priority}
                </span>
              </div>

              <div className="h-44 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 relative">
                {listing.images[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Store size={32} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{listing.category}</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{listing.title}</h3>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                    {formatMoney(listing.price, listing.currency)}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                    Verified Seller
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary & CTA Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6">
            <div className="space-y-1 border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                Campaign Overview
              </span>
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Investment Summary
              </h3>
            </div>

            {/* Line items */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Selected Plan</span>
                <span className="font-bold text-slate-900 dark:text-white">{getPromotionPlanDetails(planId, plans).label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Price at boost {priority}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(total)}</span>
              </div>
              {currentPromotion && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Spent on this run so far</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatMoney(currentPromotion.amount)}</span>
                </div>
              )}
              {mode === 'extend' && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Adds to your run</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+{addedDays} days</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Wallet balance</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(walletBalance)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(currentPromotion?.startsAt ?? new Date().toISOString())}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Expiration Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {endsAt ? formatDate(endsAt) : '—'}
                </span>
              </div>
            </div>

            {/* Total Box */}
            <div className="rounded-2xl bg-slate-900 dark:bg-slate-950 p-4 text-white space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {mode === 'extend' ? 'Due now (extension)' : mode === 'priority' ? 'Due now (rank change)' : 'Total campaign cost'}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-bold text-emerald-400">{formatMoney(charge)}</span>
                <span className="text-[11px] text-slate-300 font-medium">GHS Fiat</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {charge <= 0
                  ? 'Lowering the rank costs nothing — and refunds nothing.'
                  : shortfall <= 0
                    ? 'Debited from your wallet balance.'
                    : `${formatMoney(walletBalance)} comes from your wallet — Paystack collects the remaining ${formatMoney(shortfall)}.`}
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={startPurchase}
                disabled={!isActive || !isOwner || busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-primary-600/25 hover:from-primary-700 hover:to-indigo-700 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : shortfall > 0 ? <Wallet size={16} /> : <BadgeDollarSign size={16} />}
                {busy ? 'Processing…' : ctaLabel}
              </button>

              {currentPromotion?.status === 'active' && (
                <button
                  onClick={() => pause.mutate(currentPromotion.id)}
                  disabled={pause.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <PauseCircle size={15} /> Pause Promotion
                </button>
              )}

              {currentPromotion?.status === 'paused' && (
                <button
                  onClick={() => resume.mutate(currentPromotion.id)}
                  disabled={resume.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <PlayCircle size={15} /> Resume Promotion
                </button>
              )}

              {currentPromotion && (
                <button
                  onClick={() => cancel.mutate(currentPromotion.id)}
                  disabled={cancel.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/40 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  <Trash2 size={14} /> Cancel Promotion
                </button>
              )}
            </div>

            {!isOwner && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 p-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info size={14} /> Not your listing
                </p>
                <p className="text-[11px] leading-relaxed">
                  A spotlight is charged to the seller's own wallet, so only the owner can buy one.
                </p>
              </div>
            )}

            {!isActive && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info size={14} /> Inactive Listing
                </p>
                <p className="text-[11px] leading-relaxed">
                  This listing must be active before it can be promoted. Update its status first from My Listings.
                </p>
              </div>
            )}

            {/* Ranking Guide */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <HelpCircle size={14} className="text-primary-600 dark:text-primary-400" /> Promotion Ranking Rules
              </h4>
              <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <li>• Promoted listings stay pinned above organic search results.</li>
                <li>• Higher priority scores win tie-breakers between items.</li>
                <li>• Paused or cancelled promotions stop affecting search rank.</li>
                <li>• Pausing banks the time left; resuming picks up where you stopped.</li>
                <li>• Switching plan buys that term and adds it to the days you have left — you never lose paid time.</li>
                <li>• Changing only the rank costs the price difference; lowering it is free and isn't refunded.</li>
                <li>• Cancelling ends the run — the term is bought up front and isn't refunded.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
