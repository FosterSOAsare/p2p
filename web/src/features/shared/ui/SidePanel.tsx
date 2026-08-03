import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Must match --animate-slide-out-right / --animate-fade-out in index.css. */
const EXIT_MS = 200

interface SidePanelProps {
  open: boolean
  title: string
  /** Rendered in the sticky header, right of the title — e.g. "Mark all read". */
  action?: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * Right-anchored slide-in panel.
 *
 * The counterpart to ConfirmDialog: that one is a centered modal for a decision,
 * this one is a tall surface for a list. Full-width on mobile, ~26rem above it,
 * so a single component serves both breakpoints.
 */
export function SidePanel({ open, title, action, onClose, children }: SidePanelProps) {
  // Stays mounted for the length of the exit animation — unmounting on `open`
  // alone would make closing snap instead of slide.
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), EXIT_MS)
    return () => clearTimeout(timer)
  }, [open])

  // Escape closes. Bound only while genuinely open, not on the way out.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Held until the panel is fully gone, so the scrollbar doesn't pop back
  // mid-slide.
  useEffect(() => {
    if (!mounted) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mounted])

  if (!mounted) return null

  const closing = !open

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/60 ${
        closing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`flex h-full w-full max-w-full sm:max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 motion-reduce:animate-none ${
          closing ? 'animate-slide-out-right' : 'animate-slide-in-right'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <h2 className="font-display flex-1 text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
          {action}
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* The panel body is the only thing that scrolls. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
