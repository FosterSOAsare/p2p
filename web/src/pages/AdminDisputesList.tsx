import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Scale,
  MessageCircle,
  X,
  RotateCcw,
} from 'lucide-react'
import {
  useAdminDisputes,
  useAdminDisputeDetail,
  useResolveDispute,
} from '../features/admin/data/adminDisputesApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

type DisputeStatusTab = 'open' | 'resolved' | 'all'

export function AdminDisputesList() {
  // Status filter lives in the URL query.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as DisputeStatusTab | null) ?? 'open'
  const setStatusTab = (tab: DisputeStatusTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'open') next.delete('status')
    else next.set('status', tab)
    setSearchParams(next)
  }
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null)

  const disputesQuery = useAdminDisputes(statusTab)
  const detailQuery = useAdminDisputeDetail(selectedDisputeId)
  const resolveMutation = useResolveDispute()

  // Resolution Form State
  const [outcome, setOutcome] = useState<'release' | 'refund' | 'split'>('refund')
  const [buyerRefundAmount, setBuyerRefundAmount] = useState('')
  const [rulingNote, setRulingNote] = useState('')
  const [resolveError, setResolveError] = useState<string | null>(null)

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDisputeId) return
    setResolveError(null)

    if (rulingNote.trim().length < 5) {
      setResolveError('Please provide a clear ruling explanation note (min 5 characters).')
      return
    }

    let numBuyerRefund: number | undefined
    if (outcome === 'split') {
      numBuyerRefund = parseFloat(buyerRefundAmount)
      const totalAmount = detailQuery.data?.escrow.amount ?? 0
      if (isNaN(numBuyerRefund) || numBuyerRefund < 0 || numBuyerRefund > totalAmount) {
        setResolveError(`Buyer refund must be a valid number between GH₵ 0 and GH₵ ${totalAmount}`)
        return
      }
    }

    resolveMutation.mutate(
      {
        id: selectedDisputeId,
        outcome,
        buyerRefund: numBuyerRefund,
        rulingNote: rulingNote.trim(),
      },
      {
        onSuccess: () => {
          setSelectedDisputeId(null)
          setRulingNote('')
          setBuyerRefundAmount('')
        },
        onError: (err) => {
          setResolveError(apiErrorMessage(err))
        },
      }
    )
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Admin Top Header Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Arbitration Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Escrow Disputes Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Review party dispute claims, inspect submitted evidence & chat logs, and issue binding arbitration rulings.
            </p>
          </div>

          {/* Section Sub-Navigation */}
          <AdminSectionNav />
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(['open', 'resolved', 'all'] as DisputeStatusTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusTab === tab
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'open' ? 'Open Disputes' : tab === 'resolved' ? 'Resolved Verdicts' : 'All Disputes'}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {disputesQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : disputesQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(disputesQuery.error)}
        </div>
      ) : (disputesQuery.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <Scale size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No disputes found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {statusTab === 'open'
              ? 'There are currently no open disputes requiring admin arbitration.'
              : 'No dispute records match the selected status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {disputesQuery.data?.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-lg space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800">
                      {d.escrow.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        d.status === 'open'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {d.status === 'open' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                      {d.status.toUpperCase()}
                    </span>
                  </div>

                  <span className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {formatMoney(d.escrow.amount)}
                  </span>
                </div>

                <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {d.escrow.title}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Buyer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      @{d.escrow.buyer?.username || 'Buyer'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Seller</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      @{d.escrow.seller?.username || 'Seller'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] uppercase tracking-wider block">
                    Reason: {d.reason.replace(/_/g, ' ')}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                    "{d.description}"
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MessageCircle size={13} /> {d.escrow.messageCount} chat messages
                </span>

                <button
                  onClick={() => setSelectedDisputeId(d.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Scale size={14} /> Review & Rule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispute Resolution Modal Drawer */}
      {selectedDisputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Scale size={20} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">
                    Arbitrate Dispute — {detailQuery.data?.escrow.code}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inspect party evidence and issue a binding financial ruling.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDisputeId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {detailQuery.isLoading ? (
              <div className="py-12 text-center">
                <Loader2 size={24} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
              </div>
            ) : detailQuery.data ? (
              <div className="space-y-6">
                {/* Deal Overview & Dispute Claim */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {detailQuery.data.escrow.title}
                    </h3>
                    <span className="font-display font-bold text-lg text-primary-600 dark:text-primary-400">
                      {formatMoney(detailQuery.data.escrow.amount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase">Buyer</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        @{detailQuery.data.escrow.buyer?.username} ({detailQuery.data.escrow.buyer?.email})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold text-[10px] uppercase">Seller</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        @{detailQuery.data.escrow.seller?.username} ({detailQuery.data.escrow.seller?.email})
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 p-3 border border-rose-200 dark:border-rose-900/60 text-xs space-y-1">
                    <span className="font-bold text-rose-700 dark:text-rose-300 block">
                      Dispute Claim by @{detailQuery.data.openedBy.username}:
                    </span>
                    <p className="text-rose-900 dark:text-rose-200 italic font-medium">
                      "{detailQuery.data.description}"
                    </p>
                  </div>
                </div>

                {/* Evidence & Chat Log Transcript */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={16} className="text-primary-600 dark:text-primary-400" />
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Party Chat & Submitted Proof Transcript ({detailQuery.data.escrow.messages.length} Messages)
                    </h4>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2 text-xs">
                    {detailQuery.data.escrow.messages.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-4">No chat messages exchanged yet.</p>
                    ) : (
                      detailQuery.data.escrow.messages.map((m) => (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              @{m.sender.username}
                            </span>
                            <span>{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dispute Resolution Form */}
                {detailQuery.data.status === 'resolved' ? (
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                      <CheckCircle2 size={18} /> Dispute Resolved
                    </div>
                    <p>
                      <strong>Outcome:</strong> {detailQuery.data.outcome?.toUpperCase()}
                    </p>
                    {detailQuery.data.rulingNote && (
                      <p className="italic">"{detailQuery.data.rulingNote}"</p>
                    )}
                    <span className="text-[11px] text-slate-400 block pt-1">
                      Ruled by @{detailQuery.data.resolvedBy?.username} on{' '}
                      {new Date(detailQuery.data.resolvedAt!).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleResolveSubmit} className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                      <Scale size={16} className="text-amber-500" /> Executive Admin Ruling Form
                    </h4>

                    {resolveError && (
                      <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300">
                        {resolveError}
                      </div>
                    )}

                    {/* Outcome Radio Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label
                        className={`p-3 rounded-2xl border cursor-pointer text-xs space-y-1 block transition-all ${
                          outcome === 'refund'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
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
                          <span>Full Refund Buyer</span>
                          <RotateCcw size={16} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Returns 100% of escrow funds to the buyer.
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border cursor-pointer text-xs space-y-1 block transition-all ${
                          outcome === 'release'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
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
                        <p className="text-[10px] text-slate-500 font-normal">
                          Pays out 100% of deal earnings to seller.
                        </p>
                      </label>

                      <label
                        className={`p-3 rounded-2xl border cursor-pointer text-xs space-y-1 block transition-all ${
                          outcome === 'split'
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 font-bold'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
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
                        <p className="text-[10px] text-slate-500 font-normal">
                          Split deal funds between buyer and seller.
                        </p>
                      </label>
                    </div>

                    {/* Split input */}
                    {outcome === 'split' && (
                      <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
                        <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
                          Buyer Refund Amount (GH₵)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={detailQuery.data.escrow.amount}
                          value={buyerRefundAmount}
                          onChange={(e) => setBuyerRefundAmount(e.target.value)}
                          placeholder={`Max: GH₵ ${detailQuery.data.escrow.amount}`}
                          required
                          className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <p className="text-[11px] text-slate-500">
                          Seller will receive remaining balance: GH₵{' '}
                          {Math.max(
                            0,
                            detailQuery.data.escrow.amount - (parseFloat(buyerRefundAmount) || 0)
                          ).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Official Ruling Explanation Note
                      </label>
                      <textarea
                        value={rulingNote}
                        onChange={(e) => setRulingNote(e.target.value)}
                        rows={3}
                        placeholder="Provide a detailed explanation for this ruling (will be sent to both parties)..."
                        required
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDisputeId(null)}
                        className="w-1/3 rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={resolveMutation.isPending}
                        className="w-2/3 rounded-xl bg-slate-900 dark:bg-slate-100 py-2.5 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {resolveMutation.isPending ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Scale size={16} />
                        )}
                        Execute Binding Admin Verdict
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
