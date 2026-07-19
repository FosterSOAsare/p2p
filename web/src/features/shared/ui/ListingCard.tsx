import { Image as ImageIcon, ShieldCheck } from 'lucide-react'
import { RatingStars } from './RatingStars'

export interface ListingCardProps {
  title: string
  price: string
  location: string
  vendorName: string
  vendorVerified: boolean
  rating: number
  reviewCount: number
}

export function ListingCard({
  title,
  price,
  location,
  vendorName,
  vendorVerified,
  rating,
  reviewCount,
}: ListingCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-300">
        <ImageIcon size={32} />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
        <p className="font-display text-lg font-semibold text-primary-700">{price}</p>
        <p className="text-xs text-slate-500">{location}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
            {vendorName}
            {vendorVerified && <ShieldCheck size={14} className="text-primary-600" />}
          </span>
          <RatingStars rating={rating} reviewCount={reviewCount} size={12} />
        </div>
      </div>
    </div>
  )
}
