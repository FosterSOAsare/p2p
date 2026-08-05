import { useEffect, useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { REMOVAL_REASONS, type RemovalReason } from '../../shared/libs/removalReasons'

interface ReportListingDialogProps {
  open: boolean
  listingTitle: string
  isPending?: boolean
  errorMessage?: string | null
  onConfirm: (reason: RemovalReason, note: string | undefined) => void
  onCancel: () => void
}

/**
 * Buyer-side report. Structurally the admin's RemoveListingDialog — same reason
 * list, same note rule — but amber rather than rose: the buyer is submitting
 * evidence, not carrying out a takedown, and nothing here is irreversible.
 */
export function ReportListingDialog({
  open,
  listingTitle,
  isPending = false,
  errorMessage,
  onConfirm,
  onCancel,
}: ReportListingDialogProps) {
  const [reason, setReason] = useState<RemovalReason | null>(null)
  const [note, setNote] = useState('')

  // Fresh selection every time the dialog opens.
  useEffect(() => {
    if (open) {
      setReason(null)
      setNote('')
    }
  }, [open])

  if (!open) return null

  // The label for `other` says nothing on its own, so the note has to.
  const needsNote = reason === 'other'
  const canSubmit = reason !== null && (!needsNote || note.trim().length >= 3)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={isPending ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Report listing"
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
            <Flag size={20} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Report this listing</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              "{listingTitle}" will be sent to our moderators for review. The seller isn't told who reported it.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            What's wrong with it?
          </span>
          {REMOVAL_REASONS.map(({ id, label }) => (
            <label
              key={id}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-all ${
                reason === id
                  ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={id}
                checked={reason === id}
                onChange={() => setReason(id)}
                disabled={isPending}
                className="h-3.5 w-3.5 shrink-0 accent-amber-600 cursor-pointer"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="report-note"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            {needsNote ? 'Tell us what happened' : 'Anything to add? (optional)'}
          </label>
          <textarea
            id="report-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            maxLength={500}
            placeholder="Details help a moderator decide — what you saw, what doesn't add up."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 resize-none"
          />
        </div>

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
            onClick={() => reason && onConfirm(reason, note.trim() || undefined)}
            disabled={isPending || !canSubmit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-amber-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Submit Report
          </button>
        </div>
      </div>
    </div>
  )
}
