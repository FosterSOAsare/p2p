import { RatingStars } from '../../shared/ui/RatingStars'
import { Badge } from '../../shared/ui/Badge'

const reviews = [
  {
    name: 'Kofi Mensah',
    role: 'Verified Buyer',
    avatarImg: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    type: 'Marketplace Buyer',
    comment:
      'Buying high-value electronics online used to be stressful. Knowing my payment is held in escrow until I inspect the laptop gave me complete confidence.',
    rating: 5,
  },
  {
    name: 'Esi Ansah',
    role: 'Merchant (@esi_crafts)',
    avatarImg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    type: 'KYC Verified Vendor',
    comment:
      'The vendor KYC process was smooth and took less than 5 minutes. No fake buyers or chargebacks—funds release as soon as delivery is confirmed!',
    rating: 5,
  },
  {
    name: 'Daniel Osei',
    role: 'Freelance Developer',
    avatarImg: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    type: 'Standalone Escrow User',
    comment:
      'I use standalone escrow for my client web dev projects using USDC. Both sides agree on milestone release terms, and neither party has to worry.',
    rating: 5,
  },
]

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="text-center max-w-xl mx-auto space-y-2 mb-6 sm:mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Community Trust</p>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">What Our Users Say</h2>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm">
          Hear from buyers, verified merchants, and standalone contract users protecting their payments.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {reviews.map((rev) => (
          <div
            key={rev.name}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="success">{rev.type}</Badge>
                <RatingStars rating={rev.rating} />
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                "{rev.comment}"
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <img
                src={rev.avatarImg}
                alt={rev.name}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900"
              />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">{rev.name}</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">{rev.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
