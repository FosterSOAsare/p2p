import { RatingStars } from '../../shared/ui/RatingStars'
import { Badge } from '../../shared/ui/Badge'
import type { Review } from '../data/products'

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews || reviews.length === 0) {
    return <div className="text-xs text-slate-500 dark:text-slate-400 italic">No reviews left for this item yet.</div>
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id || r.name} className="rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">{r.name}</span>
              {r.verifiedPurchase && <Badge tone="success">Verified Purchase</Badge>}
            </div>
            <RatingStars rating={r.rating} />
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{r.comment}</p>
          {r.date && <p className="text-[11px] text-slate-400 dark:text-slate-500">{r.date}</p>}
        </div>
      ))}
    </div>
  )
}
