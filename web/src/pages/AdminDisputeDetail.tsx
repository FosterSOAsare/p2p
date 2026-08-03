import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Scale,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  RotateCcw,
  FileText,
  Handshake,
} from 'lucide-react'
import {
  useAdminDisputeDetail,
  useResolveDispute,
  type DisputeMessage,
} from '../features/admin/data/adminDisputesApi'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDateTime } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'

/** One line of the evidence transcript. System notices read as a centred spine
 *  through the conversation rather than competing with the parties' messages. */
function TranscriptLine({ message }: { message: DisputeMessage }) {
  if (message.type === 'system') {
    return (
      <p className="py-1 text-center text-[11px] italic text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
        {message.body} · {formatDateTime(message.createdAt)}
      </p>
    )
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-bold text-slate-800 dark:text-slate-200">@{message.senderUsername}</span>
        <span>{formatDateTime(message.createdAt)}</span>
      </div>
      {message.body && (
        <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">{message.body}</p>
      )}
      {message.attachment &&
        (message.attachment.mime.startsWith('image/') ? (
          <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block">
            <img
              src={message.attachment.url}
              alt={message.attachment.name}
              className="max-h-56 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
            />
          </a>
        ) : (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            <FileText size={13} /> {message.attachment.name}
          </a>
        ))}
    </div>
  )
}

export function AdminDisputeDetail() {
  const { id = '' } = useParams()
  const disputeQuery = useAdminDisputeDetail(id)
  const resolveMutation = useResolveDispute()

  const [outcome, setOutcome] = useState<'release' | 'refund' | 'split'>('refund')
  const [buyerRefundAmount, setBuyerRefundAmount] = useState('')
  const [rulingNote, setRulingNote] = useState('')
  const [resolveError, setResolveError] = useState<string | null>(null)

  const dispute = disputeQuery.data

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dispute) return
    setResolveError(null)

    if (rulingNote.trim().length < 5) {
      setResolveError('Please provide a clear ruling explanation note (min 5 characters).')
      return
    }

    let numBuyerRefund: number | undefined
    if (outcome === 'split') {
      numBuyerRefund = parseFloat(buyerRefundAmount)
      if (isNaN(numBuyerRefund) || numBuyerRefund < 0 || numBuyerRefund > dispute.escrow.amount) {
        setResolveError(`Buyer refund must be a valid number between GH₵ 0 and GH₵ ${dispute.escrow.amount}`)
        return
      }
    }

    resolveMutation.mutate(
      { id, outcome, buyerRefund: numBuyerRefund, rulingNote: rulingNote.trim() },
      {
        // No navigate on success — the page flips to the verdict panel in place,
        // so the admin can read back the ruling they just issued.
        onSuccess: () => {
          setRulingNote('')
          setBuyerRefundAmount('')
        },
        onError: (err) => setResolveError(apiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      <Link
        to="/admin/disputes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Disputes Queue
      </Link>

      {disputeQuery.isLoading && (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {disputeQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          {apiErrorMessage(disputeQuery.error)}
        </div>
      )}

      {dispute && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 font-mono text-xs font-bold text-primary-600 dark:border-primary-800 dark:bg-primary-950/60 dark:text-primary-400">
                  {dispute.escrow.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    dispute.status === 'open'
                      ? 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {dispute.status === 'open' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                  {dispute.status.toUpperCase()}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {dispute.reason.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="truncate font-display text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                {dispute.escrow.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Opened by <strong className="text-slate-700 dark:text-slate-200">@{dispute.openedBy.username}</strong> ·{' '}
                {formatDateTime(dispute.createdAt)}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-4 md:text-right">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">In Escrow</span>
              <span className="font-display text-2xl font-bold text-primary-600 dark:text-primary-400 sm:text-3xl">
                {formatMoney(dispute.escrow.amount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Left: parties, claim, transcript, timeline */}
            <div className="space-y-6 lg:col-span-7">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  <Handshake size={18} className="text-primary-600 dark:text-primary-400" /> The Parties
                </h3>
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">Buyer</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      @{dispute.escrow.buyer?.username ?? '—'}
                    </span>
                    <span className="block break-all text-[11px] text-slate-500 dark:text-slate-400">
                      {dispute.escrow.buyer?.email}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    <span className="block text-[10px] font-semibold uppercase text-slate-400">Seller</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      @{dispute.escrow.seller?.username ?? '—'}
                    </span>
                    <span className="block break-all text-[11px] text-slate-500 dark:text-slate-400">
                      {dispute.escrow.seller?.email}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/escrow/${dispute.escrow.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                >
                  View the full deal <ArrowLeft size={13} className="rotate-180" />
                </Link>

                <div className="space-y-1 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs dark:border-rose-900/60 dark:bg-rose-950/40">
                  <span className="block font-bold text-rose-700 dark:text-rose-300">
                    Dispute claim by @{dispute.openedBy.username}
                  </span>
                  <p className="whitespace-pre-line font-medium italic text-rose-900 dark:text-rose-200">
                    “{dispute.description}”
                  </p>
                </div>
              </div>

              {/* Evidence transcript */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                    <MessageCircle size={18} className="text-primary-600 dark:text-primary-400" /> Evidence Transcript
                    <span className="text-xs font-semibold text-slate-400">({dispute.escrow.messages.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Everything the two parties exchanged since this deal was created, with the escrow&apos;s own notices
                    interleaved.
                  </p>
                </div>

                <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                  {dispute.escrow.messages.length === 0 ? (
                    <p className="py-6 text-center text-xs italic text-slate-400">
                      Neither party has said anything since this deal opened.
                    </p>
                  ) : (
                    dispute.escrow.messages.map((m) => <TranscriptLine key={m.id} message={m} />)
                  )}
                </div>
              </div>

              {/* Deal timeline */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Deal Timeline</h3>
                <div className="space-y-4 border-l-2 border-slate-200 pl-4 text-xs dark:border-slate-800">
                  {dispute.escrow.events.map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary-500" />
                      <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                        {ev.event.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {ev.actorRole} · {formatDateTime(ev.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: the ruling */}
            <div className="lg:col-span-5">
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-6">
                {dispute.status === 'resolved' ? (
                  <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 size={18} /> Dispute Resolved
                    </div>
                    <p>
                      <strong>Outcome:</strong> {dispute.outcome?.toUpperCase()}
                    </p>
                    {dispute.outcome === 'split' && (
                      <p>
                        Buyer {formatMoney(dispute.ruledAmountBuyer ?? 0)} · Seller{' '}
                        {formatMoney(dispute.ruledAmountSeller ?? 0)}
                      </p>
                    )}
                    {dispute.rulingNote && <p className="italic">“{dispute.rulingNote}”</p>}
                    <span className="block pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Ruled by @{dispute.resolvedBy?.username} on {formatDateTime(dispute.resolvedAt!)}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleResolveSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                        <Scale size={18} className="text-amber-500" /> Issue a Ruling
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Binding and final — it moves the money and closes the deal.
                      </p>
                    </div>

                    {resolveError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        {resolveError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label
                        className={`block cursor-pointer space-y-1 rounded-2xl border p-3 text-xs transition-all ${
                          outcome === 'refund'
                            ? 'border-blue-500 bg-blue-50 font-bold dark:bg-blue-950/60'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                        }`}
                      >
                        <input
                          type="radio"
                          name="outcome"
                          value="refund"
                          checked={outcome === 'refund'}
                          onChange={() => setOutcome('refund')}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                          <span>Full Refund to Buyer</span>
                          <RotateCcw size={16} />
                        </div>
                        <p className="text-[10px] font-normal text-slate-500">
                          Returns 100% of escrow funds to the buyer.
                        </p>
                      </label>

                      <label
                        className={`block cursor-pointer space-y-1 rounded-2xl border p-3 text-xs transition-all ${
                          outcome === 'release'
                            ? 'border-emerald-500 bg-emerald-50 font-bold dark:bg-emerald-950/60'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                        }`}
                      >
                        <input
                          type="radio"
                          name="outcome"
                          value="release"
                          checked={outcome === 'release'}
                          onChange={() => setOutcome('release')}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                          <span>Release to Seller</span>
                          <CheckCircle2 size={16} />
                        </div>
                        <p className="text-[10px] font-normal text-slate-500">
                          Pays out 100% of deal earnings to the seller.
                        </p>
                      </label>

                      <label
                        className={`block cursor-pointer space-y-1 rounded-2xl border p-3 text-xs transition-all ${
                          outcome === 'split'
                            ? 'border-amber-500 bg-amber-50 font-bold dark:bg-amber-950/60'
                            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
                        }`}
                      >
                        <input
                          type="radio"
                          name="outcome"
                          value="split"
                          checked={outcome === 'split'}
                          onChange={() => setOutcome('split')}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                          <span>Partial Split Ruling</span>
                          <Scale size={16} />
                        </div>
                        <p className="text-[10px] font-normal text-slate-500">
                          Split the deal funds between both parties.
                        </p>
                      </label>
                    </div>

                    {outcome === 'split' && (
                      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                        <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Buyer Refund Amount (GH₵)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={dispute.escrow.amount}
                          value={buyerRefundAmount}
                          onChange={(e) => setBuyerRefundAmount(e.target.value)}
                          placeholder={`Max: GH₵ ${dispute.escrow.amount}`}
                          required
                          className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 dark:border-amber-800 dark:bg-slate-950 dark:text-white"
                        />
                        <p className="text-[11px] text-slate-500">
                          Seller receives the remaining balance: GH₵{' '}
                          {Math.max(0, dispute.escrow.amount - (parseFloat(buyerRefundAmount) || 0)).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Official Ruling Explanation
                      </label>
                      <textarea
                        value={rulingNote}
                        onChange={(e) => setRulingNote(e.target.value)}
                        rows={4}
                        placeholder="Explain this ruling — it is posted to both parties in the deal chat and emailed to them..."
                        required
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={resolveMutation.isPending}
                      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {resolveMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Scale size={16} />
                      )}
                      Execute Binding Verdict
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
