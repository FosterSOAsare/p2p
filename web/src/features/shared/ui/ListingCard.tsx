import { Link } from 'react-router-dom'
import { Flame, Image as ImageIcon, ShieldCheck } from 'lucide-react'
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
  /** Paid spotlight — disclosed to shoppers, as ad placements have to be. */
  promoted?: boolean
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
  promoted = false,
}: ListingCardProps) {
  return (
    /* A row on a phone, the stacked card from `sm` up — the same shape the
       marketplace grid uses, so a listing looks the same wherever it appears. */
    <Link
      to={`/marketplace/${id}`}
      className="group flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200 sm:block"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-32 sm:w-full">
        {promoted && (
          <span className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md sm:left-2 sm:top-2">
            <Flame size={9} /> Promoted
          </span>
        )}
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

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex min-w-0 items-center gap-1 truncate font-medium text-slate-700 dark:text-slate-300">
            @{vendorName}
            {vendorVerified && (
              <span title="KYC Verified" className="flex shrink-0">
                <ShieldCheck size={12} className="text-primary-600 dark:text-primary-400" />
              </span>
            )}
          </span>
          <span className="shrink-0 truncate max-w-[45%] text-slate-400 dark:text-slate-500 text-[10px]">
            {location.split('•')[0]}
          </span>
        </div>

        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors sm:text-xs sm:line-clamp-1">
          {title}
        </h3>

        <div className="mt-auto flex items-baseline justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white sm:text-xs md:text-sm">{price}</p>
          <RatingStars rating={rating} reviewCount={reviewCount} size={10} />
        </div>
      </div>
    </Link>
  )
}
