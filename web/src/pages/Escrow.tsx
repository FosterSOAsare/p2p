import { Link } from 'react-router-dom'
import { Plus, Sparkles, LockKeyhole } from 'lucide-react'
import { DealsListView } from '../features/escrow/ui/DealsListView'

export function Escrow() {
  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-emerald-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-10 text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <Sparkles size={14} />
              <span>All Your Escrow Deals</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Escrow Deals & Contracts
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Every marketplace order and standalone contract you're part of — funds stay locked until the buyer confirms delivery.
            </p>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-700 dark:text-sky-400 pt-1">
              <LockKeyhole size={13} /> Manual Release Protection
            </div>
          </div>
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

      <DealsListView emptyLabel="No escrow deals yet — buy something on the marketplace or start a standalone deal." />
    </div>
  )
}
