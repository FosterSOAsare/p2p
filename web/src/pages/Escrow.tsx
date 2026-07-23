import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Wallet,
  FileText,
  ArrowRight,
  Sparkles,
  LockKeyhole,
} from 'lucide-react'
import { initialDeals, type EscrowDeal } from '../features/escrow/data/deals'
import { Badge } from '../features/shared/ui/Badge'
import { formatMoney } from '../features/shared/libs/currency'

export function Escrow() {
  const [deals] = useState<EscrowDeal[]>(initialDeals)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'disbursed' | 'disputed'>('all')

  const filteredDeals = deals.filter((deal) => {
    if (activeTab === 'active') return deal.status === 'created' || deal.status === 'funded' || deal.status === 'delivered'
    if (activeTab === 'disbursed') return deal.status === 'disbursed'
    if (activeTab === 'disputed') return deal.status === 'disputed'
    return true
  })

  // Summary statistics
  const totalVolume = deals.reduce((acc, curr) => acc + curr.amount, 0)
  const activeCount = deals.filter((d) => d.status === 'created' || d.status === 'funded' || d.status === 'delivered').length

  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Hero Header Banner with Light & Dark Mode adaptation */}
      <div className="relative overflow-hidden rounded-3xl bg-emerald-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-10 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <Sparkles size={14} />
              <span>Standalone Off-Platform Contracts</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Escrow Deals & Contracts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Initiate independent 3rd-party escrow contracts for freelance services, off-market purchases, or domain transfers with 100% manual release protection.
            </p>

            {/* Quick Metrics Bar */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Total Contract Volume</span>
                <span className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">{formatMoney(totalVolume)}</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Active Locked Contracts</span>
                <span className="font-display text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">{activeCount} Active</span>
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">Release Protocol</span>
                <span className="font-display text-xs sm:text-sm font-semibold text-primary-700 dark:text-sky-400 flex items-center gap-1">
                  <LockKeyhole size={13} /> Manual Confirmation
                </span>
              </div>
            </div>
          </div>

          {/* New Deal CTA */}
          <div className="shrink-0">
            <Link
              to="/escrow/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-white dark:text-slate-950 shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Plus size={18} />
              Start New Escrow Deal
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Deals' },
            { id: 'active', label: 'Active Locked' },
            { id: 'disbursed', label: 'Completed & Disbursed' },
            { id: 'disputed', label: 'Disputed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-3.5 py-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong className="text-slate-900 dark:text-white">{filteredDeals.length}</strong> contracts
        </span>
      </div>

      {/* Deals List */}
      <div className="space-y-4">
        {filteredDeals.length > 0 ? (
          filteredDeals.map((deal) => (
            <div
              key={deal.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    tone={
                      deal.status === 'disbursed'
                        ? 'success'
                        : deal.status === 'funded'
                        ? 'info'
                        : deal.status === 'disputed'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {deal.status === 'delivered' ? 'DELIVERED / UNDER REVIEW' : deal.status.replace('_', ' ').toUpperCase()}
                  </Badge>

                  <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-[11px]">
                    <Wallet size={12} /> {deal.rail.toUpperCase()} ({deal.currency})
                  </span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                    Manual Release Protection
                  </span>
                </div>

                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base sm:text-lg group-hover:text-emerald-600 transition-colors">
                  {deal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 sm:line-clamp-1 leading-relaxed">{deal.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 pt-1 font-medium">
                  <span>Creator: <strong className="text-slate-800 dark:text-slate-200">@{deal.creatorUsername}</strong></span>
                  <span>Counterparty: <strong className="text-slate-800 dark:text-slate-200">@{deal.counterpartyUsername}</strong></span>
                  <span className="text-slate-400">Created: {deal.createdAt}</span>
                </div>
              </div>

              {/* Amount & Action Link */}
              <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                <div className="text-left md:text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Escrow Amount</span>
                  <span className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {formatMoney(deal.amount, deal.currency)}
                  </span>
                </div>

                <Link
                  to={`/escrow/${deal.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white shadow-sm transition-all"
                >
                  View Contract Details <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 sm:p-12 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <FileText size={24} />
            </div>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">No escrow contracts found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Initiate an independent escrow deal for any transaction. Manual buyer confirmation guarantees full fund safety.
            </p>
            <Link
              to="/escrow/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-md"
            >
              <Plus size={16} /> Create Escrow Deal
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
