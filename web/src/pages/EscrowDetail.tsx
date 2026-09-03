import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  QrCode,
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
  Scale,
  ShieldCheck,
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
import { PaymentModal } from '../features/escrow/ui/PaymentModal'
import { CryptoDepositPanel } from '../features/escrow/ui/CryptoDepositPanel'
import { useWallet } from '../features/escrow/data/walletApi'
import { useInitDeposit, pendingAction, type PayMethod } from '../features/escrow/data/paymentsApi'
import { useCryptoDeposit, useStartCryptoDeposit, useCheckCryptoDeposit } from '../features/escrow/data/cryptoApi'

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
  const walletQuery = useWallet()
  const initDeposit = useInitDeposit()

  // Crypto rail. The deposit query is only meaningful for a TRX deal, so it
  // stays disabled everywhere else rather than 400-ing on every fiat deal.
  const isCryptoDeal = dealQuery.data?.rail === 'crypto'
  const depositQuery = useCryptoDeposit(id, isCryptoDeal)
  const startCrypto = useStartCryptoDeposit()
  const checkCrypto = useCheckCryptoDeposit()

  const [payOpen, setPayOpen] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  /** Which sensitive action is waiting on its confirmation dialog. */
  const [pending, setPending] = useState<'deliver' | 'cancel' | 'dispute' | null>(null)
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
  const [inviteCopied, setInviteCopied] = useState(false)
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
  const canInvite = deal.status === 'created' && (!deal.buyer || !deal.seller)
  const actions = deal.availableActions
  const has = (a: EscrowAction) => actions.includes(a)
  /**
   * Whether the seller has actually ticked "delivered", which decides how hard
   * the release confirmation pushes back.
   *
   * Read off the timestamp rather than `status === 'delivered'`: the buyer can
   * now release straight from `funded`, so status alone cannot distinguish
   * "seller said it shipped" from "nobody has said anything".
   */
  const sellerMarkedDelivered = Boolean(deal.deliveredAt)
  const sellerName = deal.seller?.username ?? 'the seller'
  const busy = fund.isPending || deliver.isPending || release.isPending || cancelDeal.isPending || dispute.isPending
  const actionError = fund.error ?? deliver.error ?? release.error ?? cancelDeal.error ?? dispute.error
  const counterparty = deal.myRole === 'buyer' ? deal.seller : deal.buyer

  const isCancelled = deal.status === 'cancelled'
  // Pre-funding cancels move no money, so the copy has to drop every refund claim.
  const cancelRefunds = Boolean(deal.fundedAt)
  const currentStepIndex = HAPPY_PATH.findIndex((s) => s.status === deal.status)
  const isDisputed = deal.status === 'disputed'
  const isAdmin = deal.myRole === 'admin'

  // Balance covers the whole funding total — the server debits it directly.
  const payFromWallet = () => {
    fund.mutate(id, { onSuccess: () => setPayOpen(false) })
  }

  // Short by some amount: top up only the difference on the hosted page, then
  // the callback funds this deal on the way back (pendingAction kind 'fund').
  const payWithProvider = (walletAmount: number, method: PayMethod) => {
    const shortfall = Math.round((deal.fundingTotal - walletAmount) * 100) / 100
    setRedirecting(true)
    initDeposit.mutate(
      { amount: shortfall, method },
      {
        onSuccess: ({ authorizationUrl, reference }) => {
          pendingAction.save({ kind: 'fund', escrowId: id, reference, returnTo: `/escrow/${id}` })
          window.location.href = authorizationUrl
        },
        onError: () => setRedirecting(false),
      },
    )
  }

  // TRX deals never touch the wallet — the buyer pays the provider directly and
  // the server funds the deal when the deposit confirms. Opening the invoice is
  // re-entrant, so a buyer who comes back gets the same one rather than a second.
  const payWithCrypto = () => {
    setRedirecting(true)
    startCrypto.mutate(id, {
      onSuccess: (deposit) => {
        setPayOpen(false)
        setRedirecting(false)
        if (deposit.invoiceUrl) window.location.href = deposit.invoiceUrl
      },
      onError: () => setRedirecting(false),
    })
  }

  const copyCode = () => {
    navigator.clipboard.writeText(deal.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // The absolute joinUrl, not the in-app path — this one gets pasted elsewhere.
  const copyInvite = () => {
    if (!deal.share) return
    navigator.clipboard.writeText(deal.share.joinUrl).then(
      () => {
        setInviteCopied(true)
        setTimeout(() => setInviteCopied(false), 1800)
      },
      () => {
        /* clipboard blocked — the code and link are both on screen */
      },
    )
  }

  /*
    Each of these opens a confirmation rather than firing.

    The forms above them collect detail — a tracking number, a cancellation
    reason — but filling a form is not the same as deciding, and all three of
    these move money or freeze it. `runPending` below is the only path to the
    mutation.
  */
  const submitDeliver = () => setPending('deliver')

  const submitDispute = () => {
    if (disputeDesc.trim().length < 10) return
    setPending('dispute')
  }

  const runPending = () => {
    if (pending === 'deliver') {
      deliver.mutate(
        { id, carrier: carrier || undefined, trackingNumber: tracking || undefined, note: note || undefined },
        { onSuccess: () => setDeliverOpen(false), onSettled: () => setPending(null) },
      )
    } else if (pending === 'dispute') {
      dispute.mutate(
        { id, reason: disputeReason, description: disputeDesc.trim() },
        { onSuccess: () => setDisputeOpen(false), onSettled: () => setPending(null) },
      )
    } else if (pending === 'cancel') {
      cancelDeal.mutate(
        { id, reason: cancelReason.trim() || undefined },
        { onSuccess: () => setCancelOpen(false), onSettled: () => setPending(null) },
      )
    }
  }

  /** Copy per pending action, so the dialog says what this specific step does. */
  const pendingCopy = {
    deliver: {
      title: 'Mark this as delivered?',
      description: `This tells @${deal.buyer?.username ?? 'the buyer'} the item is on its way.`,
      consequence:
        'It starts the auto-release countdown: if the buyer does not respond, the funds release to you automatically.',
      confirmLabel: 'Mark Delivered',
      tone: 'primary' as const,
    },
    cancel: {
      title: cancelRefunds ? 'Cancel and refund this deal?' : 'Cancel this deal?',
      description: cancelRefunds
        ? `${formatMoney(deal.fundingTotal, deal.currency)} goes back to @${deal.buyer?.username ?? 'the buyer'}, fees included.`
        : 'Nothing has been paid yet, so no money moves.',
      consequence: 'The deal closes for good. It cannot be reopened — a new one would have to be created.',
      confirmLabel: cancelRefunds ? 'Cancel & Refund' : 'Cancel Deal',
      tone: 'danger' as const,
    },
    dispute: {
      title: 'Open a dispute?',
      description: 'An administrator will review this deal and decide the outcome.',
      consequence:
        'The money is frozen until they rule. Neither side can release, cancel or refund it in the meantime.',
      confirmLabel: 'Open Dispute',
      tone: 'danger' as const,
    },
  }[pending ?? 'deliver']

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <Link
        to="/deals"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> {isAdmin ? 'Back to Deals Oversight' : 'Back to Deals'}
      </Link>

      {/* Admin Oversight Banner */}
      {isAdmin && (
        <div className="rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/80 dark:bg-purple-950/50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-purple-950 dark:text-purple-200 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <span>
              <strong>Admin Oversight View:</strong> You are inspecting this deal in read-only administrative mode.
            </span>
          </div>
          {deal.status === 'disputed' && (
            <Link
              to={`/admin/disputes/${deal.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <Scale size={14} /> Open Dispute Console
            </Link>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <button onClick={copyCode} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">
              {deal.code} {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{deal.rail.toUpperCase()} · {deal.currency}</span>
            {/* A status tag, not a control — the QR and join link live in the
                invite panel in the right column now. */}
            {canInvite && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 px-2 py-0.5 rounded-full">
                <QrCode size={11} /> Awaiting counterparty
              </span>
            )}
          </div>
          <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white leading-tight truncate">{deal.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAdmin ? (
              <>
                Platform Admin Oversight · Buyer: <strong className="text-slate-700 dark:text-slate-200">@{deal.buyer?.username ?? 'Unassigned'}</strong> · Seller: <strong className="text-slate-700 dark:text-slate-200">@{deal.seller?.username ?? 'Unassigned'}</strong>
              </>
            ) : (
              <>
                You are the <strong className="text-slate-700 dark:text-slate-200">{deal.myRole}</strong>
                {counterparty && <> · with <Link to={`/seller/${counterparty.username}`} className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">@{counterparty.username}</Link></>}
              </>
            )}
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3 shadow-sm">
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
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
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
          {/* Invite panel — the server sends `share` only while a side is still
              empty, so its presence is the condition. Inline rather than behind
              the header chip: on a one-sided deal, getting someone to join is
              the only thing left to do here. */}
          {deal.share && (
            <div className="rounded-2xl border border-primary-200 dark:border-primary-900 bg-primary-50/40 dark:bg-primary-950/20 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <QrCode size={16} className="text-primary-600 dark:text-primary-400" />
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Invite the other party
                </h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                They scan this or open the link to join. The deal can't be funded until they do.
              </p>

              <div className="flex justify-center">
                <img
                  src={deal.share.dataUrl}
                  alt={`QR code for deal ${deal.share.code}`}
                  className="h-44 w-44 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2"
                />
              </div>

              <div className="text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Deal code
                </span>
                <p className="font-display text-lg font-bold tracking-widest text-slate-900 dark:text-white">
                  {deal.share.code}
                </p>
              </div>

              <Link
                to={`/join/${deal.share.code}`}
                className="block text-center text-[11px] font-semibold text-primary-700 dark:text-primary-400 hover:underline break-all"
              >
                Open the join page →
              </Link>

              {!isAdmin && (
                <button
                  onClick={copyInvite}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {inviteCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  {inviteCopied ? 'Link copied' : 'Copy invite link'}
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Actions</h3>

            {isAdmin && (
              <div className="rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 p-4 text-xs text-purple-900 dark:text-purple-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-purple-950 dark:text-purple-200">
                  <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400" />
                  Read-Only Admin Oversight
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Transaction lifecycle actions (Funding, Delivery, Release) are restricted to the buyer and seller counterparties.
                </p>
                {deal.status === 'disputed' && (
                  <Link
                    to={`/admin/disputes/${deal.id}`}
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-purple-700 hover:bg-purple-800 text-white py-2.5 px-3 text-xs font-bold transition-all shadow-sm"
                  >
                    <Scale size={14} /> Resolve Dispute in Admin Console
                  </Link>
                )}
              </div>
            )}

            {actionError != null && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {apiErrorMessage(actionError)}
              </div>
            )}

            {deal.status === 'created' && !isAdmin && (
              <button
                onClick={openEditModal}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              >
                <Pencil size={15} /> Edit Deal Terms
              </button>
            )}

            {/* Crypto rail: once an invoice exists the panel IS the funding UI —
                the deal moves itself when the deposit confirms, so a "Fund
                Escrow" button on top of it would promise something it can't do. */}
            {isCryptoDeal && depositQuery.data?.invoiceUrl && (
              <CryptoDepositPanel
                deposit={depositQuery.data}
                isChecking={checkCrypto.isPending}
                isReopening={startCrypto.isPending || redirecting}
                errorMessage={
                  checkCrypto.isError
                    ? apiErrorMessage(checkCrypto.error)
                    : startCrypto.isError
                      ? apiErrorMessage(startCrypto.error)
                      : null
                }
                onCheck={() => checkCrypto.mutate({ escrowId: id })}
                onReopen={payWithCrypto}
              />
            )}

            {has('FUND') && !(isCryptoDeal && depositQuery.data?.invoiceUrl) && (
              <button onClick={() => setPayOpen(true)} disabled={busy || redirecting} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50">
                {fund.isPending || redirecting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Fund Escrow
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

            {/* Destructive and irreversible — coloured like the confirm step it
                opens, not like the neutral secondary actions above it. */}
            {has('CANCEL') && !cancelOpen && (
              <button onClick={() => setCancelOpen(true)} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 py-3 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-all cursor-pointer shadow-sm disabled:opacity-50">
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
                    onClick={() => setPending('cancel')}
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

            {counterparty && !isAdmin && (
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
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4">
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

      {/*
        Two different questions, so two different dialogs — the same split the
        mobile deal screen makes.

        Once the seller has marked delivery, confirming receipt agrees with a
        claim already on the record. Before that, the buyer is asserting
        something no one else has — that the goods arrived — and releasing the
        money on the strength of it. The second is a bigger step and is worded
        as one.
      */}
      <ConfirmDialog
        open={confirmRelease}
        tone={sellerMarkedDelivered ? 'primary' : 'danger'}
        title={sellerMarkedDelivered ? 'Release funds to the seller?' : 'Release without a delivery update?'}
        description={
          sellerMarkedDelivered
            ? `@${sellerName} has marked this as delivered. Confirming says you received it.`
            : `@${sellerName} has not marked this as delivered. You are confirming, on your own, that the item reached you.`
        }
        consequence={
          sellerMarkedDelivered
            ? `${formatMoney(deal.sellerPayout, deal.currency)} is released to @${sellerName}. This cannot be undone.`
            : `${formatMoney(deal.sellerPayout, deal.currency)} is released to @${sellerName} even though delivery is still pending. Only continue if you actually have the item — this cannot be undone.`
        }
        confirmLabel="Release Funds"
        cancelLabel="Not yet"
        isPending={release.isPending}
        onConfirm={() => release.mutate(id, { onSettled: () => setConfirmRelease(false) })}
        onCancel={() => setConfirmRelease(false)}
      />

      {/* Deliver / cancel / dispute all share one dialog — see `pendingCopy`. */}
      <ConfirmDialog
        open={pending !== null}
        tone={pendingCopy.tone}
        title={pendingCopy.title}
        description={pendingCopy.description}
        consequence={pendingCopy.consequence}
        confirmLabel={pendingCopy.confirmLabel}
        cancelLabel="Go back"
        isPending={deliver.isPending || cancelDeal.isPending || dispute.isPending}
        onCancel={() => setPending(null)}
        onConfirm={runPending}
      />

      <PaymentModal
        open={payOpen}
        total={deal.fundingTotal}
        balance={walletQuery.data?.balance ?? 0}
        rail={deal.rail}
        currency={deal.currency}
        isPending={fund.isPending || initDeposit.isPending || startCrypto.isPending || redirecting}
        errorMessage={
          fund.isError
            ? apiErrorMessage(fund.error)
            : initDeposit.isError
              ? apiErrorMessage(initDeposit.error)
              : startCrypto.isError
                ? apiErrorMessage(startCrypto.error)
                : null
        }
        onClose={() => setPayOpen(false)}
        onPayFromWallet={payFromWallet}
        onPayWithProvider={payWithProvider}
        onPayWithCrypto={payWithCrypto}
      />
    </div>
  )
}
