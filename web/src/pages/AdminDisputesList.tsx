import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, Clock, Loader2, Scale, ArrowRight, Inbox } from 'lucide-react'
import { useAdminDisputes, type AdminDispute } from '../features/admin/data/adminDisputesApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'
import { apiErrorMessage } from '../features/shared/libs/api'

type DisputeStatusTab = 'open' | 'resolved' | 'all'

const TABS: { id: DisputeStatusTab; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

/** Rough age of a dispute — a queue is triaged by "how long has this been waiting". */
function ageLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days >= 1) return `${days}d`
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  return hours >= 1 ? `${hours}h` : 'new'
}

function DisputeRow({ dispute }: { dispute: AdminDispute }) {
  const isOpen = dispute.status === 'open'
  // Anything sitting open for over a week wants the arbitrator's eye first.
  const stale = isOpen && Date.now() - new Date(dispute.createdAt).getTime() > 7 * 86_400_000

  return (
    <Link
      to={`/admin/disputes/${dispute.id}`}
      className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center sm:gap-5 sm:px-5"
    >
      {/* Status rail */}
      <span
        className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
          isOpen
            ? 'border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
            : 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
        }`}
      >
        {isOpen ? <Clock size={11} /> : <CheckCircle2 size={11} />}
        {isOpen ? ageLabel(dispute.createdAt) : 'Ruled'}
      </span>

      {/* Deal + parties */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-primary-600 dark:text-primary-400">
            {dispute.escrow.code}
          </span>
          <h3 className="truncate text-sm font-bold text-slate-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
            {dispute.escrow.title}
          </h3>
          {stale && (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Waiting {ageLabel(dispute.createdAt)}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
          @{dispute.escrow.buyer?.username ?? 'buyer'} vs @{dispute.escrow.seller?.username ?? 'seller'} · raised by{' '}
          <strong className="text-slate-700 dark:text-slate-300">@{dispute.openedBy.username}</strong> ·{' '}
          {formatDate(dispute.createdAt)}
        </p>
        <p className="truncate text-[11px] italic text-slate-500 dark:text-slate-400">“{dispute.description}”</p>
      </div>

      {/* Reason */}
      <span className="w-fit shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:w-32 sm:text-center">
        {dispute.reason.replace(/_/g, ' ')}
      </span>

      {/* Money + action */}
      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
        <span className="font-display text-base font-bold text-slate-900 dark:text-white sm:w-28 sm:text-right">
          {formatMoney(dispute.escrow.amount)}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 transition-all group-hover:gap-2 dark:text-primary-400">
          {isOpen ? 'Rule' : 'View'} <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  )
}

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
  const disputes = disputesQuery.data ?? []

  return (
    <div className="space-y-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:border-primary-800 dark:bg-primary-950/60 dark:text-primary-400">
            <ShieldCheck size={14} /> Arbitration Console
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Disputes
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 sm:text-sm">
            Frozen deals awaiting a binding ruling. Oldest grievances first.
          </p>
        </div>
        <AdminSectionNav />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusTab(tab.id)}
            className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusTab === tab.id
                ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {disputesQuery.data && (
          <span className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
            {disputes.length} {disputes.length === 1 ? 'dispute' : 'disputes'}
          </span>
        )}
      </div>

      {disputesQuery.isLoading && (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      )}

      {disputesQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          {apiErrorMessage(disputesQuery.error)}
        </div>
      )}

      {disputesQuery.data && disputes.length === 0 && (
        <div className="space-y-2 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <Inbox size={32} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {statusTab === 'open' ? 'Nothing to arbitrate' : 'No disputes here'}
          </h3>
          <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {statusTab === 'open'
              ? 'No deals are currently frozen — every dispute has been ruled on.'
              : 'No dispute records match this filter.'}
          </p>
        </div>
      )}

      {disputes.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="hidden items-center gap-5 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950 sm:flex">
            <span className="w-[68px] shrink-0">Age</span>
            <span className="flex-1">Deal &amp; parties</span>
            <span className="w-32 shrink-0 text-center">Reason</span>
            <span className="w-28 shrink-0 text-right">Amount</span>
            <span className="w-16 shrink-0" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {disputes.map((d) => (
              <DisputeRow key={d.id} dispute={d} />
            ))}
          </div>
        </div>
      )}

      {statusTab === 'open' && disputes.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Scale size={12} /> Funds stay frozen until each of these is ruled on.
        </p>
      )}
    </div>
  )
}
