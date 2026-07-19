import { Star } from 'lucide-react'

const STAR_COUNT = 5

export function RatingStars({
  rating,
  reviewCount,
  size = 16,
}: {
  rating: number
  reviewCount?: number
  size?: number
}) {
  const fillPercent = Math.max(0, Math.min(1, rating / STAR_COUNT)) * 100

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative inline-flex">
        <div className="flex gap-0.5 text-slate-200">
          {Array.from({ length: STAR_COUNT }).map((_, i) => (
            <Star key={i} size={size} fill="currentColor" stroke="none" />
          ))}
        </div>
        <div
          className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400"
          style={{ width: `${fillPercent}%` }}
        >
          {Array.from({ length: STAR_COUNT }).map((_, i) => (
            <Star key={i} size={size} fill="currentColor" stroke="none" />
          ))}
        </div>
      </div>
      {reviewCount !== undefined && (
        <span className="text-xs text-slate-500">({reviewCount})</span>
      )}
    </div>
  )
}
