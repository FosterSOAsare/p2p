import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock, Minus, Plus, ShieldCheck, Loader2, AlertTriangle, Wallet } from 'lucide-react'
import { useListing } from '../features/marketplace/data/marketplaceApi'
import { useCheckout } from '../features/escrow/data/ordersApi'
import { useMe } from '../features/auth/data/authApi'
import { useWallet } from '../features/escrow/data/walletApi'
import { useInitDeposit, pendingOrder, type PayMethod } from '../features/escrow/data/paymentsApi'
import { PaymentModal } from '../features/escrow/ui/PaymentModal'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

// Fee mirror of the server (fiat 1.5%, min GH₵2, cap GH₵150) for a live preview.
function computeFee(amount: number): number {
  let raw = Math.floor(amount * 100 * 0.015) / 100
  if (raw < 2) raw = 2
  if (raw > 150) raw = 150
  return raw
}

export function Checkout() {
  const [searchParams] = useSearchParams()
  const listingId = searchParams.get('listing') ?? ''
  const navigate = useNavigate()

  const { data: me } = useMe()
  const listingQuery = useListing(listingId)
  const walletQuery = useWallet()
  const checkout = useCheckout()
  const initDeposit = useInitDeposit()

  const [quantity, setQuantity] = useState(1)
  const [payOpen, setPayOpen] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const listing = listingQuery.data
  const walletBalance = walletQuery.data?.balance ?? 0

  const totals = useMemo(() => {
    if (!listing) return null
    const amount = listing.price * quantity
    const fee = computeFee(amount)
    const buyerFee = Math.floor((fee / 2) * 100) / 100
    const sellerFee = fee - buyerFee
    const fundingTotal = amount + buyerFee
    const sellerPayout = amount - sellerFee
    return { amount, fee, buyerFee, fundingTotal, sellerPayout }
  }, [listing, quantity])

  if (listingQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (listingQuery.isError || !listing || !totals) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Listing unavailable</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {listingQuery.error ? apiErrorMessage(listingQuery.error) : 'This item may have sold out or been removed.'}
        </p>
        <Link to="/marketplace" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700">
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>
      </div>
    )
  }

  // Not signed in → send to login
  if (me === null) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <Lock size={28} className="mx-auto text-slate-400" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Sign in to buy</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">You need an account to fund escrow and place an order.</p>
        <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700">
          Sign In
        </Link>
      </div>
    )
  }

  const isOwnListing = me?.username === listing.seller.username
  const maxQty = listing.quantity

  // Wallet covers the whole order — fund straight from the balance.
  const payFromWallet = () => {
    checkout.mutate(
      { listingId, quantity, paymentMethod: 'momo' },
      { onSuccess: ({ deal }) => navigate(`/escrow/${deal.id}`, { replace: true }) },
    )
  }

  // Wallet covers part (or none) — collect the rest on the hosted page, then the
  // callback route credits the wallet and places this order.
  const payWithProvider = (walletAmount: number, method: PayMethod) => {
    const shortfall = Math.round((totals.fundingTotal - walletAmount) * 100) / 100
    setRedirecting(true)
    initDeposit.mutate(
      { amount: shortfall, method },
      {
        onSuccess: ({ authorizationUrl, reference }) => {
          pendingOrder.save({
            listingId,
            quantity,
            paymentMethod: method,
            reference,
            returnTo: `/checkout?listing=${listingId}`,
          })
          window.location.href = authorizationUrl
        },
        onError: () => setRedirecting(false),
      },
    )
  }

  const payError = checkout.isError
    ? apiErrorMessage(checkout.error)
    : initDeposit.isError
      ? apiErrorMessage(initDeposit.error)
      : null

  const busy = checkout.isPending || initDeposit.isPending || redirecting

  return (
    <div className="mx-auto max-w-4xl py-4 sm:py-6 space-y-6">
      <Link
        to={`/marketplace/${listingId}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Listing
      </Link>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          <Lock size={14} /> Secure Escrow Checkout
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Review Your Order</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Your payment is held in escrow — the seller is only paid after you confirm delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: item + quantity + payment method */}
        <div className="lg:col-span-7 space-y-4">
          {/* Item */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
              {listing.images[0] ? (
                <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm truncate">{listing.title}</h3>
              <Link to={`/seller/${listing.seller.username}`} className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400">
                @{listing.seller.username}{listing.seller.verified ? ' · Verified' : ''}
              </Link>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{formatMoney(listing.price)} <span className="text-[11px] font-normal text-slate-400">each</span></p>
            </div>
          </div>

          {/* Quantity */}
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">Quantity</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{maxQty} available</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center font-bold text-slate-900 dark:text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                  disabled={quantity >= maxQty}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Wallet balance — the buyer picks how much of it to spend at payment time */}
          {walletBalance > 0 && (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                <Wallet size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  {formatMoney(walletBalance)} in your wallet
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {walletBalance >= totals.fundingTotal
                    ? 'Enough to cover this order — or pay another way.'
                    : 'Use it toward this order and pay the rest at checkout.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 lg:sticky lg:top-20">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{formatMoney(listing.price)} × {quantity}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(totals.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">Escrow fee (your half)</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(totals.buyerFee)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                <span className="font-bold text-slate-900 dark:text-white">You pay</span>
                <span className="font-display text-lg font-bold text-slate-900 dark:text-white">{formatMoney(totals.fundingTotal)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <ShieldCheck size={14} className="shrink-0 mt-0.5" />
              Held in escrow until you confirm delivery. Seller receives {formatMoney(totals.sellerPayout)} on release.
            </div>

            {isOwnListing && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-3 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={13} /> This is your own listing — you can't buy it.
              </div>
            )}

            <button
              onClick={() => setPayOpen(true)}
              disabled={isOwnListing || busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {busy ? 'Processing…' : `Pay ${formatMoney(totals.fundingTotal)}`}
            </button>

            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
              Mobile money or card · Protected by escrow
            </p>
          </div>
        </div>
      </div>

      <PaymentModal
        open={payOpen}
        total={totals.fundingTotal}
        balance={walletBalance}
        isPending={busy}
        errorMessage={payError}
        onClose={() => setPayOpen(false)}
        onPayFromWallet={payFromWallet}
        onPayWithProvider={payWithProvider}
      />
    </div>
  )
}
