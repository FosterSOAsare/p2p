import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileText,
  Truck,
  MessageCircle,
  Loader2,
  Copy,
  Check,
  Star,
  Pencil,
  X,
  Ban,
  RotateCcw,
} from 'lucide-react'
import {
  useDeal,
  useFundDeal,
  useDeliverDeal,
  useReleaseDeal,
  useCancelDeal,
  useDisputeDeal,
  useReviewDeal,
  useUpdateEscrow,
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
  const cancelDeal = useCancelDeal()
  const dispute = useDisputeDeal()
  const review = useReviewDeal()
  const updateEscrow = useUpdateEscrow()

  const [confirmRelease, setConfirmRelease] = useState(false)
  const [deliverOpen, setDeliverOpen] = useState(false)
  const [carrier, setCarrier] = useState('')
  const [tracking, setTracking] = useState('')
  const [note, setNote] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('not_delivered')
  const [disputeDesc, setDisputeDesc] = useState('')

  // Edit deal state
  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editAmount, setEditAmount] = useState(0)
  const [editCurrency, setEditCurrency] = useState<'GHS' | 'TRX'>('GHS')
  const [editRole, setEditRole] = useState<'buyer' | 'seller'>('buyer')
  const [editCounterparty, setEditCounterparty] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const openEditModal = () => {
    if (!deal) return
    setEditTitle(deal.title)
    setEditAmount(deal.amount)
    setEditCurrency(deal.currency)
    setEditRole(deal.myRole === 'seller' ? 'seller' : 'buyer')
    setEditCounterparty(deal.invitedUsername || deal.buyer?.username || deal.seller?.username || '')
    setEditDesc(deal.description || '')
    setEditOpen(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !editTitle.trim() || editAmount <= 0) return
    updateEscrow.mutate(
      {
        id,
        title: editTitle.trim(),
        amount: editAmount,
        currency: editCurrency,
        role: editRole,
        invitedUsername: editCounterparty.trim() || undefined,
        description: editDesc.trim() || undefined,
      },
      {
        onSuccess: () => setEditOpen(false),
      },
    )
  }

  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
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
        <Link to="/deals" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700">
          <ArrowLeft size={16} /> Back to Deals
        </Link>
      </div>
    )
  }

  const badge = statusBadge(deal.status)
  const actions = deal.availableActions
  const has = (a: EscrowAction) => actions.includes(a)
  const busy = fund.isPending || deliver.isPending || release.isPending || cancelDeal.isPending || dispute.isPending
  const actionError = fund.error ?? deliver.error ?? release.error ?? cancelDeal.error ?? dispute.error
  const counterparty = deal.myRole === 'buyer' ? deal.seller : deal.buyer

  const isCancelled = deal.status === 'cancelled'
  // Pre-funding cancels move no money, so the copy has to drop every refund claim.
  const cancelRefunds = Boolean(deal.fundedAt)
  const currentStepIndex = HAPPY_PATH.findIndex((s) => s.status === deal.status)
  const isDisputed = deal.status === 'disputed'

  const copyCode = () => {
    navigator.clipboard.writeText(deal.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const copyJoinUrl = () => {
    if (!deal.share) return
    navigator.clipboard.writeText(deal.share.joinUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 1500)
    })
  }

  const submitDeliver = () => {
    deliver.mutate(
      { id, carrier: carrier || undefined, trackingNumber: tracking || undefined, note: note || undefined },
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
      <Link to="/deals" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
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
                const done = !isDisputed && !isCancelled && i <= currentStepIndex
                const isLast = i === HAPPY_PATH.length - 1
                return (
                  <div key={step.status} className={`flex items-center ${isLast ? '' : 'flex-1'}`}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        {done ? <Check size={15} /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-semibold ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{step.label}</span>
                    </div>
                    {!isLast && <div className={`h-0.5 flex-1 mx-1 -mt-5 ${i < currentStepIndex && !isDisputed && !isCancelled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />}
                  </div>
                )
              })}
            </div>
            {isCancelled && (
              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  <Ban size={18} className="text-slate-500 dark:text-slate-400" />
                  {cancelRefunds ? 'Order cancelled by the seller' : 'Deal cancelled before funding'}
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  {cancelRefunds
                    ? `Nothing was delivered, so the escrow was refunded in full — ${formatMoney(deal.fundingTotal, deal.currency)} back to the buyer’s wallet, no platform fee charged. `
                    : 'No money was ever funded into this escrow, so nothing changed hands. '}
                  Cancelled {formatDateTime(deal.cancelledAt!)}.
                </p>
                {deal.cancelReason && (
                  <p className="whitespace-pre-line rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white">Seller&apos;s reason: </span>
                    {deal.cancelReason}
                  </p>
                )}
              </div>
            )}

            {isDisputed && (
              <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 p-4 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                    Formal Dispute Under Active Admin Review
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 dark:bg-amber-900/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-100">
                    <Clock size={11} /> Admin Arbitrating
                  </span>
                </div>
                <p className="text-slate-700 dark:text-amber-300/90 leading-relaxed text-[11px]">
                  Escrow funds are frozen safely. Both <strong>buyer and seller</strong> should submit evidence, delivery receipts, photos, or explanations in the deal chat below for the admin to inspect before ruling.
                </p>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400" /> Deal Details
            </h3>
            {deal.description && (
              <p className="whitespace-pre-line text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                {deal.description}
              </p>
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

            {/* Only present while a side is unfilled — nobody was invited by
                username, so this is the only way to hand the deal over. */}
            {deal.share && (
              <div className="space-y-3 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 p-4">
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700 dark:text-primary-400">
                    Waiting for the other party
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Share this link or code. Whoever opens it takes the {deal.myRole === 'buyer' ? 'seller' : 'buyer'} side
                    of the deal.
                  </p>
                </div>

                <img
                  src={deal.share.dataUrl}
                  alt={`QR code to join deal ${deal.share.code}`}
                  className="mx-auto h-40 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white p-1.5"
                />

                <div className="flex items-center gap-1.5">
                  <input
                    readOnly
                    value={deal.share.joinUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
                  />
                  <button
                    onClick={copyJoinUrl}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {linkCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {deal.status === 'created' && (
              <button
                onClick={openEditModal}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              >
                <Pencil size={15} /> Edit Deal Terms
              </button>
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
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                <p className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Dispatch & Delivery Details</p>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Shipping Carrier / Method</label>
                  <input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. DHL Express, FedEx, Local Rider, Online"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Tracking Code / Phone Number</label>
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="e.g. DHL-GH-99201 or Courier Phone"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Delivery Note & Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Courier contact name, rider phone number, or digital item instructions"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2 pt-1">
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

            {has('CANCEL') && !cancelOpen && (
              <button onClick={() => setCancelOpen(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm disabled:opacity-50">
                <Ban size={15} /> {cancelRefunds ? 'Cancel Order & Refund Buyer' : 'Cancel Deal'}
              </button>
            )}

            {has('CANCEL') && cancelOpen && (
              <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  {cancelRefunds ? 'Cancel this order' : 'Cancel this deal'}
                </p>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                  <RotateCcw size={16} className="text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {cancelRefunds
                        ? `${formatMoney(deal.fundingTotal, deal.currency)} goes back to @${deal.buyer?.username ?? 'the buyer'}`
                        : 'Nothing has been funded yet'}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {cancelRefunds
                        ? 'A full refund including the platform fee — you earn nothing on this deal. Stock is returned to the listing. This can’t be undone.'
                        : 'No money has moved, so there is nothing to refund. The deal closes for both sides and can’t be reopened — you’d need to create a new one.'}
                    </p>
                  </div>
                </div>

                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder={
                    cancelRefunds
                      ? 'Why are you cancelling? (optional — shared with the buyer)'
                      : 'Why are you cancelling? (optional — shared with the other party)'
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                />

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() =>
                      cancelDeal.mutate(
                        { id, reason: cancelReason.trim() || undefined },
                        { onSuccess: () => setCancelOpen(false) },
                      )
                    }
                    disabled={cancelDeal.isPending}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {cancelDeal.isPending ? <Loader2 size={13} className="animate-spin" /> : <Ban size={14} />}
                    {cancelRefunds ? 'Cancel & Refund' : 'Cancel Deal'}
                  </button>
                  <button
                    onClick={() => setCancelOpen(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {cancelRefunds ? 'Keep Order' : 'Keep Deal'}
                  </button>
                </div>
              </div>
            )}

            {has('DISPUTE') && !disputeOpen && (
              <button onClick={() => setDisputeOpen(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-all cursor-pointer disabled:opacity-50">
                <AlertTriangle size={15} /> Open Dispute
              </button>
            )}

            {has('DISPUTE') && disputeOpen && (
              <div className="space-y-3 rounded-xl border border-rose-200 dark:border-rose-800 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Open a Formal Dispute
                </p>

                {/* Pre-Dispute Communication Warning Notice */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-bold">Contact Counterparty First</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90">
                      Please make sure you have attempted to message the other party via the deal chat below. Submit a formal dispute only if they are uncooperative, unresponsive, or refusing to resolve the issue.
                    </p>
                  </div>
                </div>

                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none cursor-pointer"
                >
                  {DISPUTE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <div className="space-y-1.5">
                  <textarea
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    rows={3}
                    placeholder="Explain the problem clearly (min 10 chars)..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none resize-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Photos and receipts belong in the deal chat — the admin reviewing this case sees every attachment
                    you&apos;ve sent since the deal opened.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={submitDispute}
                    disabled={dispute.isPending || disputeDesc.trim().length < 10}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {dispute.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    Submit Dispute
                  </button>
                  <button
                    onClick={() => setDisputeOpen(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Ban size={18} className="text-slate-500 dark:text-slate-400 shrink-0" />
                {!cancelRefunds
                  ? 'This deal was cancelled before funding. No money changed hands.'
                  : deal.myRole === 'seller'
                    ? 'You cancelled this order — the buyer was refunded in full.'
                    : `Cancelled by the seller — ${formatMoney(deal.fundingTotal, deal.currency)} refunded to your wallet.`}
              </div>
            )}

            {deal.status === 'disbursed' && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                {deal.myRole === 'seller' ? 'Payout released to your wallet.' : 'Completed — funds released to counterparty.'}
              </div>
            )}

            {/* Review — available after a normal completion, one per party. Admin-resolved
                (disputed) and cancelled deals don't get reviews — nothing was traded. */}
            {deal.status === 'disbursed' && counterparty && !deal.dispute && (
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
              <Link
                to={`/messages?u=${counterparty.username}`}
                className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold transition-all cursor-pointer ${
                  deal.status === 'disputed'
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20'
                    : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MessageCircle size={15} />
                {deal.status === 'disputed'
                  ? 'Open Dispute Chat & Submit Evidence'
                  : `Message @${counterparty.username}`}
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

      {/* Edit Deal Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-primary-600" />
                Edit Deal Terms
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {updateEscrow.isError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {apiErrorMessage(updateEscrow.error)}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">My Role in this Contract</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditRole('buyer')}
                    className={`rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                      editRole === 'buyer'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    🛒 I am Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('seller')}
                    className={`rounded-xl py-2 px-3 text-xs font-bold border transition-all cursor-pointer ${
                      editRole === 'seller'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    📦 I am Seller
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Amount</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Currency</label>
                  <select
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none cursor-pointer"
                  >
                    <option value="GHS">GH₵ (Fiat)</option>
                    <option value="TRX">TRX (Crypto)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Invited Counterparty</label>
                <input
                  type="text"
                  value={editCounterparty}
                  onChange={(e) => setEditCounterparty(e.target.value)}
                  placeholder="Username of other party..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Deliverables & Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={updateEscrow.isPending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {updateEscrow.isPending && <Loader2 size={14} className="animate-spin" />} Save Terms
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
