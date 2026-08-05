import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'

interface DismissReportsDialogProps {
  open: boolean
  listingTitle: string
  reportCount: number
  isPending?: boolean
  errorMessage?: string | null
  onConfirm: (note: string | undefined) => void
  onCancel: () => void
}

/**
 * The "no violation" verdict. Not the shared ConfirmDialog because the note is
 * the point: it's what every reporter is told, and a dismissal with no reason
 * reads as nobody having looked.
 */
export function DismissReportsDialog({
  open,
  listingTitle,
  reportCount,
  isPending = false,
  errorMessage,
  onConfirm,
  onCancel,
}: DismissReportsDialogProps) {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (open) setNote('')
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={isPending ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Dismiss reports"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={20} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Dismiss {reportCount === 1 ? 'this report' : `all ${reportCount} reports`}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              "{listingTitle}" stays on the marketplace and everyone who reported it is told it was reviewed.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="dismiss-note"
            className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Note to the reporters (optional)
          </label>
          <textarea
            id="dismiss-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            maxLength={500}
            placeholder="e.g. We checked the seller's documentation and the listing is accurate."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 resize-none"
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
            onClick={() => onConfirm(note.trim() || undefined)}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            Dismiss & Keep Listing
          </button>
        </div>
      </div>
    </div>
  )
}
