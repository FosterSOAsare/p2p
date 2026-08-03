import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { REMOVAL_REASONS, type RemovalReason } from '../data/adminListingsApi'

interface RemoveListingDialogProps {
  open: boolean
  listingTitle: string
  isPending?: boolean
  errorMessage?: string | null
  onConfirm: (reason: RemovalReason, note: string | undefined, disputeAllowed: boolean) => void
  onCancel: () => void
}

/**
 * Takedown confirmation — the admin must pick a reason, which is what the seller
 * is told in their notification and email. Mirrors ConfirmDialog's danger tone.
 */
export function RemoveListingDialog({
  open,
  listingTitle,
  isPending = false,
  errorMessage,
  onConfirm,
  onCancel,
}: RemoveListingDialogProps) {
  const [reason, setReason] = useState<RemovalReason | null>(null)
  const [note, setNote] = useState('')
  const [disputeAllowed, setDisputeAllowed] = useState(true)

  // Fresh selection every time the dialog opens.
  useEffect(() => {
    if (open) {
      setReason(null)
      setNote('')
      setDisputeAllowed(true)
    }
  }, [open])

  if (!open) return null

  const needsNote = reason === 'other'
  const canSubmit = reason !== null && (!needsNote || note.trim().length >= 3)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={isPending ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Remove listing"
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Remove this listing?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              "{listingTitle}" will be taken off the marketplace and the seller notified.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Reason for removal
          </span>
          {REMOVAL_REASONS.map(({ id, label }) => (
            <label
              key={id}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                reason === id
                  ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/40 ring-1 ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="removal-reason"
                value={id}
                checked={reason === id}
                onChange={() => setReason(id)}
                disabled={isPending}
                className="h-3.5 w-3.5 shrink-0 accent-rose-600 cursor-pointer"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>

        {needsNote && (
          <div className="space-y-1.5">
            <label
              htmlFor="removal-note"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Specify the reason
            </label>
            <textarea
              id="removal-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              maxLength={500}
              placeholder="Explain why this listing is being removed — the seller will see this."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 disabled:opacity-50 resize-none"
            />
          </div>
        )}

        <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all">
          <input
            type="checkbox"
            checked={disputeAllowed}
            onChange={(e) => setDisputeAllowed(e.target.checked)}
            disabled={isPending}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary-600 cursor-pointer"
          />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-slate-900 dark:text-white">Allow dispute</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              The seller can correct the listing and appeal. Turn off for severe violations.
            </span>
          </span>
        </label>

        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => reason && onConfirm(reason, needsNote ? note.trim() : undefined, disputeAllowed)}
            disabled={isPending || !canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Remove Listing
          </button>
        </div>
      </div>
    </div>
  )
}
