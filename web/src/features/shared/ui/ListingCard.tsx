import { Link } from 'react-router-dom'
import { Image as ImageIcon, ShieldCheck } from 'lucide-react'
import { RatingStars } from './RatingStars'

export interface ListingCardProps {
  id?: string
  title: string
  price: string
  location: string
  vendorName: string
  vendorVerified: boolean
  rating: number
  reviewCount: number
  imageUrl?: string
}

export function ListingCard({
  id = '1',
  title,
  price,
  location,
  vendorName,
  vendorVerified,
  rating,
  reviewCount,
  imageUrl,
}: ListingCardProps) {
  return (
    <Link
      to={`/marketplace/${id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200"
    >
      {/* Sleek Compact Image Container */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <ImageIcon size={20} />
          </div>
        )}
      </div>

      {/* Compact Content */}
      <div className="space-y-1 p-2.5 sm:p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 truncate max-w-[65%]">
            @{vendorName}
            {vendorVerified && (
              <span title="KYC Verified" className="flex shrink-0">
                <ShieldCheck size={12} className="text-primary-600 dark:text-primary-400" />
              </span>
            )}
          </span>
          <span className="truncate max-w-[35%] text-slate-400 dark:text-slate-500 text-[10px]">{location.split('•')[0]}</span>
        </div>

        <h3 className="font-display text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {title}
        </h3>

        <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <p className="font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{price}</p>
          <RatingStars rating={rating} reviewCount={reviewCount} size={10} />
        </div>
      </div>
    </Link>
  )
}
