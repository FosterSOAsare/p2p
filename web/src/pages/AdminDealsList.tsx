import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Search, Loader2, Handshake, AlertTriangle, Scale } from 'lucide-react'
import { useAdminDeals, type AdminDealStatus } from '../features/admin/data/adminDealsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { useDebouncedValue } from '../features/shared/libs/useDebouncedValue'

type StatusTab = 'all' | AdminDealStatus

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'created', label: 'Created' },
  { id: 'funded', label: 'Funded' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'disbursed', label: 'Completed' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'cancelled', label: 'Cancelled' },
]

const STATUS_STYLES: Record<AdminDealStatus, string> = {
  created: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  funded: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  delivered: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  disbursed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  disputed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-600',
}

export function AdminDealsList() {
  // Filters live in the URL query, not component state.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = (searchParams.get('status') as StatusTab | null) ?? 'all'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const searchQ = searchParams.get('search') ?? ''

  const [searchInput, setSearchInput] = useState(searchQ)
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 400)

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page') // any filter change resets to page 1
    setSearchParams(next)
  }

  // Push the debounced search box into the URL (which drives the query).
  useEffect(() => {
    if (debouncedSearch !== searchQ) setParams({ search: debouncedSearch || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (searchQ) params.set('search', searchQ)
    if (statusParam !== 'all') params.set('status', statusParam)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [searchQ, statusParam, page])

  const dealsQuery = useAdminDeals(query)
  const data = dealsQuery.data

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Escrow Deals Oversight
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Read-only view of every escrow deal on the platform. Disputed deals link to the arbitration console.
            </p>
          </div>
          <AdminSectionNav />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setParams({ status: tab.id === 'all' ? null : tab.id })}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusParam === tab.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search code or title…"
            className="w-56 max-w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* List */}
      {dealsQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : dealsQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(dealsQuery.error)}
        </div>
      ) : (data?.deals ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <Handshake size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">No deals found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">No escrow deals match the current filters.</p>
        </div>
      ) : (
        <div className={`space-y-3 transition-opacity ${dealsQuery.isFetching ? 'opacity-60' : ''}`}>
          {data?.deals.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-wrap items-center gap-4 justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800">
                    {d.code}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border capitalize ${STATUS_STYLES[d.status]}`}
                  >
                    {d.status}
                  </span>
                  {d.hasOpenDispute && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                      <AlertTriangle size={11} /> Open dispute
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">{d.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Buyer <span className="font-semibold text-slate-700 dark:text-slate-300">@{d.buyer?.username ?? '—'}</span>
                  {' · '}
                  Seller <span className="font-semibold text-slate-700 dark:text-slate-300">@{d.seller?.username ?? '—'}</span>
                  {' · '}
                  {formatDate(d.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                    {formatMoney(d.amount, d.currency)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    fee {formatMoney(d.feeAmount, d.currency)} · {d.rail}
                  </p>
                </div>
                {d.hasOpenDispute && (
                  <Link
                    to="/admin/disputes"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 px-3.5 py-2 text-xs font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
                  >
                    <Scale size={13} /> Review
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setParams({ page: page - 1 <= 1 ? null : String(page - 1) })}
            disabled={page <= 1}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {data.page} of {data.pages} · {data.total} deals
          </span>
          <button
            onClick={() => setParams({ page: String(Math.min(data.pages, page + 1)) })}
            disabled={page >= data.pages}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
