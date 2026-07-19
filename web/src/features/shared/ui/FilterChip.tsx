import { X } from 'lucide-react'

export function FilterChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label} filter`}
          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}
