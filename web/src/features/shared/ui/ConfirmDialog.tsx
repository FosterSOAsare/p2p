import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** What is about to happen, in plain words. */
  description?: string
  /**
   * The consequence of confirming, called out separately from `description`.
   *
   * Split out because the two answer different questions — "what am I doing"
   * and "what will that do to me" — and the second is the one worth pausing
   * over. Rendered in a tinted panel so it reads as the warning rather than
   * more prose. Mirrored in the mobile dialog.
   */
  consequence?: string
  confirmLabel?: string
  cancelLabel?: string
  /** danger = rose destructive styling (default), primary = brand styling */
  tone?: 'danger' | 'primary'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** App-styled confirmation modal — use instead of window.confirm for destructive/irreversible actions. */
export function ConfirmDialog({
  open,
  title,
  description,
  consequence,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700'
      : 'bg-primary-600 hover:bg-primary-700'

  const consequenceClass =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
      : 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-900 dark:bg-primary-950/40 dark:text-primary-300'

  const iconClass =
    tone === 'danger'
      ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
      : 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={isPending ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>}
          </div>
        </div>

        {consequence && (
          <div className={`rounded-xl border px-3 py-3 ${consequenceClass}`}>
            <p className="text-xs font-semibold leading-relaxed">{consequence}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${confirmClass}`}
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
