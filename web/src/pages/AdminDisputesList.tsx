import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, Clock, Loader2, Scale, MessageCircle } from 'lucide-react'
import { useAdminDisputes } from '../features/admin/data/adminDisputesApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

type DisputeStatusTab = 'open' | 'resolved' | 'all'

/** The queue. Reviewing and ruling happen on `/admin/disputes/:id`, which gives
 *  the evidence transcript room to breathe and survives a page refresh. */
export function AdminDisputesList() {
  // Status filter lives in the URL query.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as DisputeStatusTab | null) ?? 'open'
  const setStatusTab = (tab: DisputeStatusTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'open') next.delete('status')
    else next.set('status', tab)
    setSearchParams(next)
  }

  const disputesQuery = useAdminDisputes(statusTab)

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Admin Top Header Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Arbitration Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Escrow Disputes Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Review party dispute claims, inspect submitted evidence & chat logs, and issue binding arbitration rulings.
            </p>
          </div>

          {/* Section Sub-Navigation */}
          <AdminSectionNav />
        </div>
      </div>

      {/* Filter Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {(['open', 'resolved', 'all'] as DisputeStatusTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              statusTab === tab
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab === 'open' ? 'Open Disputes' : tab === 'resolved' ? 'Resolved Verdicts' : 'All Disputes'}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {disputesQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : disputesQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(disputesQuery.error)}
        </div>
      ) : (disputesQuery.data ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <Scale size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No disputes found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {statusTab === 'open'
              ? 'There are currently no open disputes requiring admin arbitration.'
              : 'No dispute records match the selected status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {disputesQuery.data?.map((d) => (
            <div
              key={d.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-lg space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800">
                      {d.escrow.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        d.status === 'open'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {d.status === 'open' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                      {d.status.toUpperCase()}
                    </span>
                  </div>

                  <span className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {formatMoney(d.escrow.amount)}
                  </span>
                </div>

                <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                  {d.escrow.title}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Buyer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      @{d.escrow.buyer?.username || 'Buyer'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Seller</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      @{d.escrow.seller?.username || 'Seller'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] uppercase tracking-wider block">
                    Reason: {d.reason.replace(/_/g, ' ')}
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                    "{d.description}"
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MessageCircle size={13} /> {d.escrow.noticeCount} deal notices
                </span>

                <Link
                  to={`/admin/disputes/${d.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Scale size={14} /> {d.status === 'open' ? 'Review & Rule' : 'View Verdict'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
