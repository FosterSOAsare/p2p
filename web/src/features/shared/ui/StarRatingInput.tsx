import { useState } from 'react'
import { Star } from 'lucide-react'

/** Interactive 1–5 star picker. */
export function StarRatingInput({ value, onChange, size = 24 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="cursor-pointer transition-transform hover:scale-110"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              size={size}
              className={filled ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
              fill={filled ? 'currentColor' : 'none'}
            />
          </button>
        )
      })}
    </div>
  )
}
