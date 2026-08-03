import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  FileText,
  AlertTriangle,
  Gavel,
  Lock,
  Flag,
  Truck,
  Handshake,
  Ban,
  Pencil,
  Circle,
  Send,
} from 'lucide-react'
import {
  useAdminDisputeDetail,
  useAddDisputeNote,
  useResolveDispute,
  type AdminDisputeDetail as DisputeDetail,
  type DisputeMessage,
  type DisputeEvent,
} from '../features/admin/data/adminDisputesApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDateTime } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'

// Integer pesewas, mirroring the server's RESOLVE_* arithmetic so the preview is
// the ruling itself, not an approximation of it.
const toP = (n: number) => Math.round(n * 100)
const fromP = (p: number) => p / 100

/**
 * The three outcomes are one continuum: a refund is a split with everything to
 * the buyer, a release is a split with nothing to them. So the console is a
 * single dial over `buyerRefund`, and the endpoints map back to the dedicated
 * outcomes to keep the recorded verdict meaningful.
 *
 * Verified against the server: split with refund = fundingTotal charges no fee
 * (matching RESOLVE_REFUND), and refund = 0 leaves the seller
 * `fundingTotal - fee`, which is exactly `sellerPayout` (matching RESOLVE_RELEASE).
 */
function settlement(escrow: DisputeDetail['escrow'], buyerRefund: number) {
  const fundingTotalP = toP(escrow.fundingTotal)
  const feeP = toP(escrow.feeAmount)
  const refundP = Math.min(Math.max(toP(buyerRefund), 0), fundingTotalP)
  const remainderP = fundingTotalP - refundP
  const feeChargedP = fundingTotalP > 0 ? Math.floor((feeP * remainderP) / fundingTotalP) : 0

  return {
    buyer: fromP(refundP),
    seller: fromP(remainderP - feeChargedP),
    platform: fromP(feeChargedP),
    buyerPct: fundingTotalP > 0 ? (refundP / fundingTotalP) * 100 : 0,
    outcome: refundP === fundingTotalP ? 'refund' : refundP === 0 ? 'release' : 'split',
  } as const
}

// ---------- case record ----------

const EVENT_ICONS: Record<string, typeof Circle> = {
  created: Circle,
  joined: Handshake,
  fund: Lock,
  funded: Lock,
  deliver: Truck,
  release: CheckCircle2,
  dispute: Flag,
  cancel: Ban,
  updated: Pencil,
}

type RecordEntry =
  | { kind: 'message'; at: number; message: DisputeMessage }
  | { kind: 'event'; at: number; event: DisputeEvent }

function ChatBubble({ message, side }: { message: DisputeMessage; side: 'left' | 'right' }) {
  const mine = side === 'right'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[80%] space-y-1">
        <div className={`flex items-baseline gap-2 text-[10px] text-slate-400 ${mine ? 'justify-end' : ''}`}>
          <span className="font-bold text-slate-600 dark:text-slate-300">@{message.senderUsername}</span>
          <span>{formatDateTime(message.createdAt)}</span>
        </div>
        <div
          className={`space-y-1.5 rounded-2xl border px-3 py-2 ${
            mine
              ? 'rounded-br-sm border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/50'
              : 'rounded-bl-sm border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
          }`}
        >
          {message.body && (
            <p className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-200">{message.body}</p>
          )}
          {message.attachment &&
            (message.attachment.mime.startsWith('image/') ? (
              <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={message.attachment.url}
                  alt={message.attachment.name}
                  className="max-h-60 rounded-lg border border-slate-200 object-contain dark:border-slate-600"
                />
              </a>
            ) : (
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary-600 hover:underline dark:border-slate-600 dark:bg-slate-900 dark:text-primary-400"
              >
                <FileText size={13} /> {message.attachment.name}
              </a>
            ))}
        </div>
      </div>
    </div>
  )
}

export function AdminDisputeDetail() {
  const { id = '' } = useParams()
  const disputeQuery = useAdminDisputeDetail(id)
  const resolveMutation = useResolveDispute()
  const noteMutation = useAddDisputeNote()

  const [refundInput, setRefundInput] = useState<number | null>(null)
  const [rulingNote, setRulingNote] = useState('')
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const dispute = disputeQuery.data

  // Default the dial to a full refund — the conservative starting position, since
  // it's the only outcome that can't leave a defrauded buyer out of pocket.
  const buyerRefund = refundInput ?? dispute?.escrow.fundingTotal ?? 0
  const result = dispute ? settlement(dispute.escrow, buyerRefund) : null

  /** Chat and state changes merged into one chronology — an arbitrator shouldn't
   *  have to correlate two boxes by timestamp to reconstruct what happened. */
  const record = useMemo<RecordEntry[]>(() => {
    if (!dispute) return []
    return [
      ...dispute.escrow.messages.map<RecordEntry>((m) => ({
        kind: 'message',
        at: new Date(m.createdAt).getTime(),
        message: m,
      })),
      ...dispute.escrow.events.map<RecordEntry>((e) => ({
        kind: 'event',
        at: new Date(e.createdAt).getTime(),
        event: e,
      })),
    ].sort((a, b) => a.at - b.at)
  }, [dispute])

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispute || !result) return
    setResolveError(null)

    if (rulingNote.trim().length < 5) {
      setResolveError('Give both parties a clear explanation (min 5 characters).')
      return
    }

    resolveMutation.mutate(
      {
        id,
        outcome: result.outcome,
        buyerRefund: result.outcome === 'split' ? buyerRefund : undefined,
        rulingNote: rulingNote.trim(),
      },
      {
        // No navigate — the page flips to the verdict in place, so the arbitrator
        // can read back what they just issued.
        onSuccess: () => setRulingNote(''),
        onError: (err) => setResolveError(apiErrorMessage(err)),
      },
    )
  }

  if (disputeQuery.isLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (disputeQuery.isError || !dispute || !result) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <AlertTriangle size={32} className="mx-auto text-slate-400" />
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Dispute not found</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {disputeQuery.error ? apiErrorMessage(disputeQuery.error) : 'This dispute may have been removed.'}
        </p>
        <Link
          to="/admin/disputes"
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft size={16} /> Back to Disputes
        </Link>
      </div>
    )
  }

  const isOpen = dispute.status === 'open'
  const { escrow } = dispute
  const buyerRaised = dispute.openedBy.username === escrow.buyer?.username
  const disputedAtMs = escrow.disputedAt ? new Date(escrow.disputedAt).getTime() : null
  const dividerAt = disputedAtMs ? record.findIndex((r) => r.at >= disputedAtMs) : -1

  const presets = [
    { label: 'All to buyer', value: escrow.fundingTotal },
    { label: 'Half', value: Math.round(escrow.fundingTotal * 50) / 100 },
    { label: 'All to seller', value: 0 },
  ]

  return (
    <div className="space-y-6 py-4 sm:py-6">
      <Link
        to="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={16} /> Back to Disputes
      </Link>

      {/* ---- Case banner: the two sides, and the money between them ---- */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              isOpen
                ? 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {isOpen ? <Clock size={11} /> : <CheckCircle2 size={11} />}
            {isOpen ? 'Awaiting ruling' : 'Ruled'}
          </span>
          <span className="font-mono text-[11px] font-bold text-primary-600 dark:text-primary-400">{escrow.code}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {dispute.reason.replace(/_/g, ' ')}
          </span>
          <Link
            to={`/escrow/${escrow.id}`}
            className="ml-auto text-[11px] font-semibold text-primary-600 hover:underline dark:text-primary-400"
          >
            Open the deal →
          </Link>
        </div>

        <div className="grid grid-cols-1 items-stretch divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-[1fr_auto_1fr] sm:divide-x sm:divide-y-0">
          {[
            { role: 'Buyer', user: escrow.buyer, raised: buyerRaised, align: 'sm:text-right sm:items-end' },
            { role: 'Seller', user: escrow.seller, raised: !buyerRaised, align: '' },
          ].map((side, i) => (
            <div
              key={side.role}
              className={`flex flex-col justify-center gap-0.5 p-5 ${side.align} ${i === 1 ? 'sm:order-3' : ''}`}
            >
              <div className={`flex items-center gap-1.5 ${side.align ? 'sm:flex-row-reverse' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{side.role}</span>
                {side.raised && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    Raised it
                  </span>
                )}
              </div>
              <span className="truncate text-lg font-bold text-slate-900 dark:text-white">
                @{side.user?.username ?? '—'}
              </span>
              <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{side.user?.email}</span>
            </div>
          ))}

          <div className="flex flex-col items-center justify-center bg-slate-50 px-6 py-5 dark:bg-slate-950 sm:order-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frozen</span>
            <span className="font-display text-2xl font-bold text-primary-600 dark:text-primary-400 sm:text-3xl">
              {formatMoney(escrow.fundingTotal, escrow.currency)}
            </span>
            <span className="text-[10px] text-slate-400">
              {formatMoney(escrow.amount, escrow.currency)} + {formatMoney(escrow.feeAmount, escrow.currency)} fee (
              {escrow.feeSplit})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* ---- The case ---- */}
        <div className="space-y-6 lg:col-span-7">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              {escrow.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Raised by <strong className="text-slate-700 dark:text-slate-200">@{dispute.openedBy.username}</strong> ·{' '}
              {formatDateTime(dispute.createdAt)}
            </p>
          </div>

          <blockquote className="rounded-2xl border-l-4 border-rose-400 bg-rose-50/70 p-5 dark:border-rose-700 dark:bg-rose-950/30">
            <p className="whitespace-pre-line text-sm font-medium italic leading-relaxed text-rose-900 dark:text-rose-100">
              “{dispute.description}”
            </p>
          </blockquote>

          {/* Unified case record */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-0.5">
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">Case record</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Every message and state change since the deal opened, in order. Buyer on the left, seller on the right.
              </p>
            </div>

            <div className="max-h-[36rem] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-950">
              {record.length === 0 ? (
                <p className="py-6 text-center text-xs italic text-slate-400">Nothing recorded on this deal.</p>
              ) : (
                record.map((entry, i) => (
                  <div key={`${entry.kind}-${i}`} className="space-y-3">
                    {i === dividerAt && (
                      <div className="flex items-center gap-2 py-1">
                        <span className="h-px flex-1 bg-rose-300 dark:bg-rose-900" />
                        <span className="whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                          Dispute opened — evidence below
                        </span>
                        <span className="h-px flex-1 bg-rose-300 dark:bg-rose-900" />
                      </div>
                    )}

                    {entry.kind === 'event' ? (
                      (() => {
                        const Icon = EVENT_ICONS[entry.event.event] ?? Circle
                        return (
                          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            <Icon size={11} />
                            {entry.event.event.replace(/_/g, ' ')} · {entry.event.actorRole}
                          </div>
                        )
                      })()
                    ) : entry.message.type === 'system' ? (
                      <p className="whitespace-pre-wrap px-6 text-center text-[11px] italic text-slate-500 dark:text-slate-400">
                        {entry.message.body}
                      </p>
                    ) : (
                      <ChatBubble
                        message={entry.message}
                        side={entry.message.senderId === escrow.seller?.id ? 'right' : 'left'}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Ask the parties something — lands in their thread as a platform line */}
            {isOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const body = note.trim()
                  if (body.length < 3) return
                  noteMutation.mutate({ id, body }, { onSuccess: () => setNote('') })
                }}
                className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800"
              >
                <div className="flex items-end gap-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={1000}
                    placeholder="Ask both parties a question — e.g. “Seller, can you post the courier receipt?”"
                    className="min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={noteMutation.isPending || note.trim().length < 3}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    {noteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Posted to the deal chat as an official platform message — both parties see it, and it becomes part of
                  this record.
                </p>
                {noteMutation.isError && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    {apiErrorMessage(noteMutation.error)}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* ---- The bench ---- */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-6">
            {!isOpen ? (
              <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-xs text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  <Gavel size={18} /> Ruled: {dispute.outcome?.toUpperCase()}
                </div>
                {dispute.outcome === 'split' && (
                  <p>
                    Buyer {formatMoney(dispute.ruledAmountBuyer ?? 0, escrow.currency)} · Seller{' '}
                    {formatMoney(dispute.ruledAmountSeller ?? 0, escrow.currency)}
                  </p>
                )}
                {dispute.rulingNote && <p className="italic">“{dispute.rulingNote}”</p>}
                <span className="block pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  By @{dispute.resolvedBy?.username} on {formatDateTime(dispute.resolvedAt!)}
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleResolveSubmit}
                className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-0.5">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                    <Gavel size={18} className="text-amber-500" /> The ruling
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Drag to divide the frozen funds. Binding and final.
                  </p>
                </div>

                {resolveError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                    {resolveError}
                  </div>
                )}

                {/* Outcome dial */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-500">Buyer</span>
                      <span className="font-display text-xl font-bold text-slate-900 dark:text-white">
                        {formatMoney(result.buyer, escrow.currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        Seller
                      </span>
                      <span className="font-display text-xl font-bold text-slate-900 dark:text-white">
                        {formatMoney(result.seller, escrow.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Proportion bar */}
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="bg-blue-500 transition-all" style={{ width: `${result.buyerPct}%` }} />
                    <div className="flex-1 bg-emerald-500 transition-all" />
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={escrow.fundingTotal}
                    step={0.01}
                    value={buyerRefund}
                    onChange={(e) => setRefundInput(Number(e.target.value))}
                    aria-label="Amount refunded to the buyer"
                    className="w-full cursor-pointer accent-primary-600"
                  />

                  <div className="flex gap-1.5">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setRefundInput(p.value)}
                        className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-all ${
                          Math.abs(buyerRefund - p.value) < 0.005
                            ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5 text-[11px] dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">
                      Platform keeps{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {formatMoney(result.platform, escrow.currency)}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {result.outcome === 'refund' ? (
                        <RotateCcw size={10} />
                      ) : result.outcome === 'release' ? (
                        <CheckCircle2 size={10} />
                      ) : (
                        <Scale size={10} />
                      )}
                      {result.outcome}
                    </span>
                  </div>
                </div>

                {/* Exact amount, for when the dial isn't precise enough */}
                <div className="space-y-1">
                  <label
                    htmlFor="refund-exact"
                    className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Or type the buyer&apos;s refund exactly
                  </label>
                  <input
                    id="refund-exact"
                    type="number"
                    step="0.01"
                    min={0}
                    max={escrow.fundingTotal}
                    value={buyerRefund}
                    onChange={(e) => setRefundInput(Math.min(Number(e.target.value) || 0, escrow.fundingTotal))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="ruling-note"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Ruling explanation
                  </label>
                  <textarea
                    id="ruling-note"
                    value={rulingNote}
                    onChange={(e) => setRulingNote(e.target.value)}
                    rows={4}
                    placeholder="Posted to both parties in the deal chat and emailed to them..."
                    required
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resolveMutation.isPending}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {resolveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
                  Execute binding verdict
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
