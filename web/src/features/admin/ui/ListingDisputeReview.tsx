import { useState } from 'react'
import { X, Loader2, Check, Ban, ArrowRight } from 'lucide-react'
import {
  useResolveListingDispute,
  type AdminListingDispute,
  type ListingSnapshot,
} from '../data/adminListingsApi'
import { apiErrorMessage } from '../../shared/libs/api'
import { formatMoney } from '../../shared/libs/currency'
import { formatDate } from '../../shared/libs/date'

const FIELD_LABELS: Record<keyof ListingSnapshot, string> = {
  title: 'Title',
  description: 'Description',
  price: 'Price',
  category: 'Category',
  condition: 'Condition',
  quantity: 'Quantity',
  images: 'Images',
  location: 'Location',
}

function renderValue(field: keyof ListingSnapshot, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (field === 'price') return formatMoney(Number(value))
  if (field === 'images') return `${(value as string[]).length} image(s)`
  return String(value)
}

/** Side-by-side review of a seller's appeal: why it was removed, what they say, what changed. */
export function ListingDisputeReview({
  dispute,
  onClose,
}: {
  dispute: AdminListingDispute
  onClose: () => void
}) {
  const resolve = useResolveListingDispute()
  const [note, setNote] = useState('')

  const decide = (decision: 'approve' | 'reject') => {
    resolve.mutate({ id: dispute.id, decision, note: note.trim() || undefined }, { onSuccess: onClose })
  }

  const isOpen = dispute.status === 'open'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={resolve.isPending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Review listing dispute"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg">Listing Dispute</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Who + what */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            {dispute.listing.image ? (
              <img src={dispute.listing.image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{dispute.after.title}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              @{dispute.seller.username} · submitted {formatDate(dispute.createdAt)}
            </p>
          </div>
        </div>

        {/* Original removal reason */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/40 p-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Removed for
          </span>
          <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{dispute.listing.removalReasonText}</p>
        </div>

        {/* Seller's case */}
        <div className="space-y-3">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seller's explanation
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
              {dispute.explanation}
            </p>
          </div>
          {dispute.corrections && (
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Corrections made
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap leading-relaxed">
                {dispute.corrections}
              </p>
            </div>
          )}
        </div>

        {/* What actually changed */}
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Changes since removal
          </span>
          {dispute.changedFields.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">The listing hasn't been edited.</p>
          ) : (
            <div className="space-y-2">
              {dispute.changedFields.map((f) => {
                const field = f as keyof ListingSnapshot
                return (
                  <div key={f} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
                    <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {FIELD_LABELS[field] ?? f}
                    </span>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="flex-1 min-w-0 truncate text-rose-600 dark:text-rose-400 line-through">
                        {renderValue(field, dispute.before?.[field])}
                      </span>
                      <ArrowRight size={12} className="shrink-0 text-slate-400" />
                      <span className="flex-1 min-w-0 truncate font-semibold text-emerald-700 dark:text-emerald-400">
                        {renderValue(field, dispute.after[field])}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {resolve.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {apiErrorMessage(resolve.error)}
          </div>
        )}

        {isOpen ? (
          <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={resolve.isPending}
              maxLength={1000}
              placeholder="Note to the seller (optional)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => decide('reject')}
                disabled={resolve.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                <Ban size={13} /> Reject
              </button>
              <button
                onClick={() => decide('approve')}
                disabled={resolve.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                {resolve.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Approve & Reinstate
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-600 dark:text-slate-300">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                dispute.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {dispute.status}
            </span>
            <span className="ml-2">
              by @{dispute.reviewedBy} · {dispute.reviewedAt ? formatDate(dispute.reviewedAt) : ''}
            </span>
            {dispute.reviewNote && <p className="mt-1.5 text-slate-500 dark:text-slate-400">{dispute.reviewNote}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
