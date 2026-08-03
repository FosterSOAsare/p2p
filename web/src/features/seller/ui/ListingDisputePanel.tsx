import { useState } from 'react'
import { Gavel, Loader2, Ban, CheckCircle2, Clock } from 'lucide-react'
import { useSubmitListingDispute } from '../data/listingsApi'
import { apiErrorMessage } from '../../shared/libs/api'

export interface ListingRemovalInfo {
  reasonText: string
  disputeAllowed: boolean
  dispute: {
    id: string
    status: 'open' | 'approved' | 'rejected'
    explanation: string
    reviewNote: string | null
    createdAt: string
  } | null
}

/**
 * Shown on a seller's own removed listing: the takedown reason, and — when the
 * admin allowed it — the form to appeal.
 *
 * The appeal is an argument, not a resubmission: a removed listing is frozen, so
 * the admin rules on exactly what they took down.
 */
export function ListingDisputePanel({ listingId, removal }: { listingId: string; removal: ListingRemovalInfo }) {
  const submit = useSubmitListingDispute()
  const [explanation, setExplanation] = useState('')

  const dispute = removal.dispute
  const canSubmit = explanation.trim().length >= 10

  return (
    <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
          <Ban size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Removed by an administrator
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">{removal.reasonText}</p>
        </div>
      </div>

      {/* Already appealed — show where it stands */}
      {dispute ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
          <div className="flex items-center gap-2">
            {dispute.status === 'open' ? (
              <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            ) : dispute.status === 'approved' ? (
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Ban size={14} className="text-slate-500" />
            )}
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {dispute.status === 'open'
                ? 'Dispute under review'
                : dispute.status === 'approved'
                  ? 'Dispute approved'
                  : 'Dispute rejected'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{dispute.explanation}</p>
          {dispute.reviewNote && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span className="font-semibold">Reviewer:</span> {dispute.reviewNote}
            </p>
          )}
        </div>
      ) : removal.disputeAllowed ? (
        /* Appeal form */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="dispute-explanation"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Why should this listing be reinstated?
            </label>
            <textarea
              id="dispute-explanation"
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              disabled={submit.isPending}
              maxLength={2000}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 resize-none"
            />
          </div>

          {submit.isError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {apiErrorMessage(submit.error)}
            </div>
          )}

          <button
            onClick={() => submit.mutate({ id: listingId, explanation: explanation.trim() })}
            disabled={submit.isPending || !canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3 text-xs font-bold text-white shadow-md hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {submit.isPending ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
            Submit dispute
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-600 dark:text-slate-400">This removal can't be disputed.</p>
      )}
    </div>
  )
}
