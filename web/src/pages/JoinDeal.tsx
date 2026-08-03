import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Handshake,
  Lock,
  LogIn,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { usePublicDeal, useAcceptDealByCode } from '../features/escrow/data/ordersApi'
import { useMe } from '../features/auth/data/authApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDateTime } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'

/**
 * The landing page for a deal's share link / QR. Public — the terms are visible
 * before signing in, because asking someone to log in before they can see what
 * they'd be agreeing to is a poor trade.
 */
export function JoinDeal() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const previewQuery = usePublicDeal(code)
  const { data: me, isLoading: meLoading } = useMe()
  const accept = useAcceptDealByCode()

  const deal = previewQuery.data

  if (previewQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (previewQuery.isError || !deal) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto text-slate-400" />
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Deal not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {previewQuery.error ? apiErrorMessage(previewQuery.error) : 'This share code doesn’t match any deal.'}
        </p>
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={16} /> Go to Marketplace
        </Link>
      </div>
    )
  }

  // You take whichever side the creator didn't.
  const myRole = deal.creatorIsBuyer ? 'seller' : 'buyer'
  const isCreator = Boolean(me && me.username === deal.creator.username)
  // What this side actually pays or receives, given the fee split the creator set.
  const myFigure = myRole === 'buyer' ? deal.fundingTotal : deal.sellerPayout

  const joinUrl = `/join/${code}`

  return (
    <div className="mx-auto max-w-lg space-y-6 py-6 sm:py-10">
      <div className="space-y-2 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:border-primary-800 dark:bg-primary-950/60 dark:text-primary-400">
          <Handshake size={14} /> Escrow Deal Invite
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {deal.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Created by <strong className="text-slate-700 dark:text-slate-200">@{deal.creator.username}</strong> ·{' '}
          {formatDateTime(deal.createdAt)}
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        {deal.description && (
          <p className="whitespace-pre-line rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {deal.description}
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-950">
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Escrow Amount</span>
          <span className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(deal.amount, deal.currency)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="mb-0.5 block font-medium text-slate-400">You would be the</span>
            <span className="font-bold capitalize text-slate-900 dark:text-white">{myRole}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="mb-0.5 block font-medium text-slate-400">
              {myRole === 'buyer' ? 'You would pay' : 'You would receive'}
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{formatMoney(myFigure, deal.currency)}</span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Platform fee{' '}
          {deal.feeSplit === 'split'
            ? 'is split evenly between both sides'
            : deal.feeSplit === 'buyer'
              ? 'is paid by the buyer'
              : 'is paid by the seller'}
          . These are the terms you accept by joining.
        </p>

        {accept.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {apiErrorMessage(accept.error)}
          </div>
        )}

        {!deal.joinable ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            This deal isn’t open to join — it already has both parties, or it has moved past the invite stage.
          </div>
        ) : isCreator ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              This is your own deal — send this link to the other party instead.
            </div>
            <Link
              to="/deals"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to my deals <ArrowRight size={14} />
            </Link>
          </div>
        ) : meLoading ? (
          <div className="py-4 text-center">
            <Loader2 size={20} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        ) : me ? (
          <button
            onClick={() =>
              accept.mutate(code, {
                onSuccess: ({ deal: joined }) => navigate(`/escrow/${joined.id}`, { replace: true }),
              })
            }
            disabled={accept.isPending}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 disabled:opacity-50"
          >
            {accept.isPending ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
            Join this deal as {myRole}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <p className="mb-0.5 font-bold text-slate-900 dark:text-white">Sign in to join</p>
              You need a P2P Market account to take a side in an escrow deal. We&apos;ll bring you straight back here.
            </div>
            <Link
              to={`/login?redirect=${encodeURIComponent(joinUrl)}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700"
            >
              <LogIn size={16} /> Log in to continue
            </Link>
            <Link
              to="/signup"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Create an account <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <Lock size={12} className="text-emerald-600 dark:text-emerald-400" />
        Funds stay locked in escrow until the buyer confirms receipt.
        <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
      </div>
    </div>
  )
}
