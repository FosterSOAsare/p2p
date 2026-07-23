import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Truck,
  MessageCircle,
  Loader2,
  Copy,
  Check,
  Star,
} from 'lucide-react'
import {
  useDeal,
  useFundDeal,
  useDeliverDeal,
  useReleaseDeal,
  useDisputeDeal,
  useReviewDeal,
  type EscrowAction,
} from '../features/escrow/data/ordersApi'
import { Badge } from '../features/shared/ui/Badge'
import { ConfirmDialog } from '../features/shared/ui/ConfirmDialog'
import { StarRatingInput } from '../features/shared/ui/StarRatingInput'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDateTime } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'
import { statusBadge, HAPPY_PATH } from '../features/escrow/ui/dealStatus'

const DISPUTE_REASONS = [
  { value: 'not_delivered', label: 'Item was never delivered' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'service_not_done', label: 'Service not completed' },
  { value: 'other', label: 'Other' },
]

export function EscrowDetail() {
  const { id = '' } = useParams()
  const dealQuery = useDeal(id)

  const fund = useFundDeal()
  const deliver = useDeliverDeal()
  const release = useReleaseDeal()
  const dispute = useDisputeDeal()
  const review = useReviewDeal()

  const [confirmRelease, setConfirmRelease] = useState(false)
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('not_delivered')
  const [disputeDesc, setDisputeDesc] = useState('')
  const [copied, setCopied] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')

  if (dealQuery.isLoading) {
    return <div className="py-20 text-center"><Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" /></div>
  }

  const deal = dealQuery.data
  if (dealQuery.isError || !deal) {
    return (
      <div className="py-12 text-center space-y-4">
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Deal not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {dealQuery.error ? apiErrorMessage(dealQuery.error) : "This deal may not exist or you're not a party to it."}
        </p>
        <Link to="/escrow" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700">
          <ArrowLeft size={16} /> Back to Deals
        </Link>
      </div>
    )
  }

  const badge = statusBadge(deal.status)
  const actions = deal.availableActions
  const has = (a: EscrowAction) => actions.includes(a)
  const busy = fund.isPending || deliver.isPending || release.isPending || dispute.isPending
  const actionError = fund.error ?? deliver.error ?? release.error ?? dispute.error
  const counterparty = deal.myRole === 'buyer' ? deal.seller : deal.buyer

  const currentStepIndex = HAPPY_PATH.findIndex((s) => s.status === deal.status)
  const isDisputed = deal.status === 'disputed'

  const copyCode = () => {
    navigator.clipboard.writeText(deal.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const submitDeliver = () => {
    deliver.mutate(
      { id, carrier: carrier || undefined, trackingNumber: tracking || undefined },
      { onSuccess: () => setDeliverOpen(false) },
    )
  }

  const submitDispute = () => {
    if (disputeDesc.trim().length < 10) return
    dispute.mutate(
      { id, reason: disputeReason, description: disputeDesc.trim() },
      { onSuccess: () => setDisputeOpen(false) },
    )
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <Link to="/escrow" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft size={16} /> Back to Deals
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <button onClick={copyCode} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              {deal.code} {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{deal.rail.toUpperCase()} · {deal.currency}</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight truncate">{deal.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You are the <strong className="text-slate-700 dark:text-slate-200">{deal.myRole}</strong>
            {counterparty && <> · with <Link to={`/seller/${counterparty.username}`} className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">@{counterparty.username}</Link></>}
          </p>
        </div>
        <div className="text-left md:text-right bg-slate-50 dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Escrow Amount</span>
          <span className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(deal.amount, deal.currency)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12">
        {/* Left: stepper + terms + timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stepper */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              {HAPPY_PATH.map((step, i) => {
                const done = !isDisputed && i <= currentStepIndex
                const isLast = i === HAPPY_PATH.length - 1
                return (
                  <div key={step.status} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        {done ? <Check size={15} /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-semibold ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{step.label}</span>
                    </div>
                    {!isLast && <div className={`h-0.5 flex-1 mx-1 -mt-5 ${i < currentStepIndex && !isDisputed ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
                  </div>
                )
              })}
            </div>
            {isDisputed && (
              <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-[11px] font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle size={13} /> This deal is disputed — funds are frozen pending admin review.
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400" /> Deal Details
            </h3>
            {deal.description && (
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">{deal.description}</p>
            )}
            {deal.trackingNumber && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <Truck size={15} className="text-slate-400" />
                <span><strong className="text-slate-800 dark:text-slate-200">{deal.carrier ?? 'Tracking'}:</strong> {deal.trackingNumber}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-medium mb-0.5">Item Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(deal.amount, deal.currency)}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block font-medium mb-0.5">{deal.myRole === 'seller' ? 'Your Payout' : 'You Paid'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatMoney(deal.myRole === 'seller' ? deal.sellerPayout : deal.fundingTotal, deal.currency)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Audit Timeline</h3>
            <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 text-xs">
              {deal.events.map((ev) => (
                <div key={ev.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{ev.event.replace('_', ' ')}</span>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">{ev.actorRole} · {formatDateTime(ev.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Actions</h3>

            {actionError != null && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {apiErrorMessage(actionError)}
              </div>
            )}

            {has('FUND') && (
              <button onClick={() => fund.mutate(id)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50">
                {fund.isPending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Fund Escrow
              </button>
            )}

            {has('DELIVER') && !deliverOpen && (
              <button onClick={() => setDeliverOpen(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50">
                <Truck size={16} /> Mark as Delivered
              </button>
            )}

            {has('DELIVER') && deliverOpen && (
              <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
                <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Delivery details (optional)</p>
                <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (e.g. DHL Express)" className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none" />
                <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={submitDeliver} disabled={deliver.isPending} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 cursor-pointer disabled:opacity-50">
                    {deliver.isPending ? <Loader2 size={13} className="animate-spin" /> : <Truck size={14} />} Confirm Delivery
                  </button>
                  <button onClick={() => setDeliverOpen(false)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                </div>
              </div>
            )}

            {has('RELEASE') && (
              <button onClick={() => setConfirmRelease(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50">
                <CheckCircle2 size={16} /> Confirm Receipt & Release
              </button>
            )}

            {has('DISPUTE') && !disputeOpen && (
              <button onClick={() => setDisputeOpen(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all cursor-pointer disabled:opacity-50">
                <AlertTriangle size={15} /> Open Dispute
              </button>
            )}

            {has('DISPUTE') && disputeOpen && (
              <div className="space-y-2.5 rounded-xl border border-rose-200 dark:border-rose-800 p-3.5">
                <p className="text-[11px] font-semibold uppercase text-rose-600 dark:text-rose-400">Open a dispute</p>
                <select value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none cursor-pointer">
                  {DISPUTE_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} rows={3} placeholder="Explain the problem (min 10 chars)..." className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={submitDispute} disabled={dispute.isPending || disputeDesc.trim().length < 10} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50">
                    {dispute.isPending ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={14} />} Submit Dispute
                  </button>
                  <button onClick={() => setDisputeOpen(false)} className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                </div>
              </div>
            )}

            {deal.status === 'disbursed' && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {deal.myRole === 'seller' ? 'Payout released to your wallet.' : 'Completed — funds released to the seller.'}
              </div>
            )}

            {/* Review — available after completion, one per party */}
            {deal.status === 'disbursed' && counterparty && (
              deal.myReview ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Your review</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={15} className={n <= deal.myReview!.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} fill={n <= deal.myReview!.rating ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                  {deal.myReview.comment && <p className="text-xs text-slate-600 dark:text-slate-300">{deal.myReview.comment}</p>}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                  <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Rate @{counterparty.username}
                  </p>
                  <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={2}
                    placeholder="Share how the deal went (optional)..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                  />
                  {review.isError && (
                    <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{apiErrorMessage(review.error)}</p>
                  )}
                  <button
                    onClick={() => review.mutate({ id, rating: reviewRating, comment: reviewComment || undefined })}
                    disabled={review.isPending || reviewRating < 1}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {review.isPending ? <Loader2 size={13} className="animate-spin" /> : <Star size={14} />} Submit Review
                  </button>
                </div>
              )
            )}

            {counterparty && (
              <Link to={`/messages/${counterparty.username}?redirect=/escrow/${id}`} className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                <MessageCircle size={15} /> Message @{counterparty.username}
              </Link>
            )}

            {/* Policy note */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <Lock size={13} className="text-emerald-600 dark:text-emerald-400" /> Manual Release Protocol
              </div>
              Funds stay locked until the buyer confirms receipt. Neither party can withdraw unilaterally.
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRelease}
        tone="primary"
        title="Release funds to the seller?"
        description={`${formatMoney(deal.sellerPayout, deal.currency)} will be paid to @${deal.seller?.username ?? 'the seller'}. This confirms you received the item and can't be undone.`}
        confirmLabel="Release Funds"
        isPending={release.isPending}
        onConfirm={() => release.mutate(id, { onSettled: () => setConfirmRelease(false) })}
        onCancel={() => setConfirmRelease(false)}
      />
    </div>
  )
}
