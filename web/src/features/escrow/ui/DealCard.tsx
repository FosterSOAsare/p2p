import { Link } from 'react-router-dom'
import { ArrowRight, Wallet } from 'lucide-react'
import type { Deal } from '../data/ordersApi'
import { Badge } from '../../shared/ui/Badge'
import { formatMoney } from '../../shared/libs/currency'
import { formatDate } from '../../shared/libs/date'
import { statusBadge } from './dealStatus'

/** A single escrow deal / order row — shared by the deals list and orders/sales pages. */
export function DealCard({ deal }: { deal: Deal }) {
  const badge = statusBadge(deal.status)
  const counterparty = deal.myRole === 'buyer' ? deal.seller : deal.buyer
  const roleLabel = deal.myRole === 'buyer' ? 'Buying from' : deal.myRole === 'seller' ? 'Selling to' : 'Counterparty'

  return (
    <Link
      to={`/escrow/${deal.id}`}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5 min-w-0">
        {deal.listing?.image ? (
          <img src={deal.listing.image} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
            <Wallet size={20} />
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {deal.rail.toUpperCase()} · {deal.currency}
            </span>
          </div>
          <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {deal.title}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {counterparty ? (
              <>{roleLabel} <strong className="text-slate-700 dark:text-slate-200">@{counterparty.username}</strong></>
            ) : (
              <>Invite pending{deal.invitedUsername ? ` — @${deal.invitedUsername}` : ''} · code {deal.code}</>
            )}
            <span className="text-slate-400"> · {formatDate(deal.createdAt)}</span>
          </p>
        </div>
      </div>

      <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
        <div className="text-left md:text-right">
          <span className="text-[10px] text-slate-400 block font-medium">Escrow Amount</span>
          <span className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {formatMoney(deal.amount, deal.currency)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
          View <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}
