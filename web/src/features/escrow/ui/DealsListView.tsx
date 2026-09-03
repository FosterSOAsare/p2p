import { useSearchParams } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { useDeals, type EscrowStatus } from '../data/ordersApi'
import { apiErrorMessage } from '../../shared/libs/api'
import { DealCard } from './DealCard'

const TABS: { id: string; label: string; status?: EscrowStatus }[] = [
  { id: 'all', label: 'All' },
  { id: 'funded', label: 'Active', status: 'funded' },
  { id: 'delivered', label: 'To Confirm', status: 'delivered' },
  { id: 'disbursed', label: 'Completed', status: 'disbursed' },
  { id: 'disputed', label: 'Disputed', status: 'disputed' },
  { id: 'cancelled', label: 'Cancelled', status: 'cancelled' },
]

/**
 * Where a deal came from. Marketplace deals were checked out from a listing;
 * custom ones are standalone escrows two people agreed between themselves.
 *
 * Kept separate from the status tabs rather than folded in with them: the two
 * are independent questions, and combining them would need a row per pairing.
 */
const SOURCES: { id: string; label: string; source?: 'marketplace' | 'custom' }[] = [
  { id: 'all', label: 'All types' },
  { id: 'marketplace', label: 'Marketplace', source: 'marketplace' },
  { id: 'custom', label: 'Custom', source: 'custom' },
]

/** Shared filter+paginate+render body for the deals / orders / sales lists. */
export function DealsListView({ role, emptyLabel }: { role?: 'buyer' | 'seller'; emptyLabel: string }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'all'
  const sourceTab = searchParams.get('source') ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page')
    setSearchParams(next)
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]
  const activeSource = SOURCES.find((s) => s.id === sourceTab) ?? SOURCES[0]
  const apiQuery = new URLSearchParams()
  if (role) apiQuery.set('role', role)
  if (active.status) apiQuery.set('status', active.status)
  // Server-side: the total and the pager below come from the same query, so
  // filtering here rather than in the rendered list keeps them agreeing.
  if (activeSource.source) apiQuery.set('source', activeSource.source)
  apiQuery.set('page', String(page))
  apiQuery.set('limit', '10')

  const dealsQuery = useDeals(apiQuery.toString())
  const data = dealsQuery.data

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id === 'all' ? null : t.id })}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              tab === t.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
        {data && <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">{data.total} total</span>}
      </div>

      {/* Source filter — independent of the status tabs above. */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {SOURCES.map((sOpt) => (
          <button
            key={sOpt.id}
            onClick={() => setParams({ source: sOpt.id === 'all' ? null : sOpt.id })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              sourceTab === sOpt.id
                ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950 dark:text-primary-300'
                : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            {sOpt.label}
          </button>
        ))}
      </div>

      {dealsQuery.isLoading && (
        <div className="py-16 text-center"><Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" /></div>
      )}

      {dealsQuery.isError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(dealsQuery.error)}
        </div>
      )}

      {data && data.deals.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-3">
          <Inbox size={28} className="mx-auto text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{emptyLabel}</p>
        </div>
      )}

      {data && data.deals.length > 0 && (
        <div className={`space-y-3 transition-opacity ${dealsQuery.isFetching ? 'opacity-60' : ''}`}>
          {data.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setParams({ page: n === 1 ? null : String(n) })}
              className={`h-8 min-w-8 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                n === page ? 'bg-primary-600 text-white shadow-sm' : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= data.pages}
            onClick={() => setParams({ page: String(page + 1) })}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
