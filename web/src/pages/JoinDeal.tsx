import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Lock, ShieldCheck, Handshake, AlertTriangle } from 'lucide-react'
import { useCodePreview, useAcceptByCode } from '../features/escrow/data/ordersApi'
import { useMe } from '../features/auth/data/authApi'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

/**
 * Landing page for a share link / scanned QR (`/join/:code`). Shows a public
 * preview of the deal, then lets the invited party take the open side.
 */
export function JoinDeal() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { data: me } = useMe()
  const previewQuery = useCodePreview(code)
  const accept = useAcceptByCode()

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
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <AlertTriangle size={28} className="mx-auto text-slate-400" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Deal not found</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {previewQuery.error ? apiErrorMessage(previewQuery.error) : 'This share code is invalid or expired.'}
        </p>
        <Link
          to="/deals"
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={14} /> My Deals
        </Link>
      </div>
    )
  }

  // The joiner takes whichever side the creator didn't.
  const yourRole = deal.creatorIsBuyer ? 'seller' : 'buyer'

  return (
    <div className="mx-auto max-w-lg py-6 space-y-5">
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          <Lock size={14} /> Escrow Invitation
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          You've been invited to a deal
        </h1>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          {deal.creator.avatarUrl ? (
            <img src={deal.creator.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white uppercase">
              {deal.creator.username.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{deal.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              @{deal.creator.username} · joining as the <strong>{yourRole}</strong>
            </p>
          </div>
        </div>

        {deal.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{deal.description}</p>
        )}

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Amount</span>
            <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {deal.currency === 'GHS' ? formatMoney(deal.amount) : `${deal.amount} TRX`}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Deal code</span>
            <span className="font-semibold text-slate-900 dark:text-white">{deal.code}</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          Funds are held in escrow and only released when the buyer confirms delivery.
        </div>

        {accept.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {apiErrorMessage(accept.error)}
          </div>
        )}

        {!deal.joinable ? (
          <p className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            This deal is no longer open to join — it's already {deal.status}.
          </p>
        ) : me === null ? (
          <Link
            to={`/login?redirect=/join/${deal.code}`}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all"
          >
            Sign in to join
          </Link>
        ) : (
          <button
            onClick={() => accept.mutate(deal.code, { onSuccess: (d) => navigate(`/escrow/${d.id}`, { replace: true }) })}
            disabled={accept.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {accept.isPending ? <Loader2 size={16} className="animate-spin" /> : <Handshake size={16} />}
            Join as {yourRole}
          </button>
        )}
      </div>
    </div>
  )
}
