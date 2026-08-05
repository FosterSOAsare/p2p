import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ShieldCheck, Loader2, Flag, Trash2, ChevronDown, ChevronRight, ShieldOff } from 'lucide-react'
import {
  useAdminReports,
  useDismissListingReports,
  type AdminReportGroup,
  type ReportFilter,
} from '../features/admin/data/adminReportsApi'
import { useRemoveListing, type RemovalReason } from '../features/admin/data/adminListingsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { RemoveListingDialog } from '../features/admin/ui/RemoveListingDialog'
import { DismissReportsDialog } from '../features/admin/ui/DismissReportsDialog'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'

const STATUS_TABS: { id: ReportFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'actioned', label: 'Actioned' },
  { id: 'dismissed', label: 'Dismissed' },
  { id: 'all', label: 'All' },
]

/** "fraud ×2 · misleading ×1" — the shape of the complaint at a glance. */
function tallyText(group: AdminReportGroup) {
  return group.reasonCounts.map((r) => `${r.reasonText}${r.count > 1 ? ` ×${r.count}` : ''}`).join(' · ')
}

export function AdminReportsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as ReportFilter | null) ?? 'open'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [expanded, setExpanded] = useState<string | null>(null)
  const [dismissTarget, setDismissTarget] = useState<AdminReportGroup | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AdminReportGroup | null>(null)

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k)
      else next.set(k, v)
    }
    if (!('page' in patch)) next.delete('page') // any filter change resets to page 1
    setSearchParams(next)
  }

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('status', statusTab)
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [statusTab, page])

  const reportsQuery = useAdminReports(query)
  const dismissReports = useDismissListingReports()
  const removeListing = useRemoveListing()

  const data = reportsQuery.data
  const groups = data?.groups ?? []

  const confirmDismiss = (note: string | undefined) => {
    if (!dismissTarget) return
    dismissReports.mutate(
      { listingId: dismissTarget.listing.id, note },
      { onSuccess: () => setDismissTarget(null) },
    )
  }

  const confirmRemove = (reason: RemovalReason, note: string | undefined, disputeAllowed: boolean) => {
    if (!removeTarget) return
    removeListing.mutate(
      { id: removeTarget.listing.id, reason, note, disputeAllowed },
      { onSuccess: () => setRemoveTarget(null) },
    )
  }

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
              Buyer Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Listings buyers have flagged, grouped one card per listing. Removing a listing settles its reports;
              dismissing keeps it up and tells everyone who reported it.
            </p>
          </div>
          <AdminSectionNav />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams({ status: tab.id === 'open' ? null : tab.id })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusTab === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(removeListing.isError && !removeTarget) || (dismissReports.isError && !dismissTarget) ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(removeListing.error ?? dismissReports.error)}
        </div>
      ) : null}

      {/* Queue */}
      {reportsQuery.isLoading ? (
        <div className="py-20 text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : reportsQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(reportsQuery.error)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center space-y-2">
          <Flag size={36} className="mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            {statusTab === 'open' ? 'Nothing to review' : 'No reports here'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {statusTab === 'open'
              ? 'No listing is currently flagged by a buyer.'
              : 'Nothing matches this filter yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const isOpen = expanded === g.listing.id
            const removed = g.listing.status === 'removed'
            return (
              <div
                key={g.listing.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
              >
                <div className="p-4 flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                      {g.listing.image ? (
                        <img src={g.listing.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {removed ? (
                          <span className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {g.listing.title}
                          </span>
                        ) : (
                          <Link
                            to={`/marketplace/${g.listing.id}`}
                            className="font-bold text-slate-900 dark:text-white text-sm truncate hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {g.listing.title}
                          </Link>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Flag size={10} />
                          {g.reportCount} {g.reportCount === 1 ? 'report' : 'reports'}
                        </span>
                        {removed && (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            removed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {formatMoney(g.listing.price)} · {g.listing.category} · @{g.listing.seller.username}
                      </p>
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 truncate">
                        {tallyText(g)} · latest {formatDate(g.lastReportedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(isOpen ? null : g.listing.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      {g.reportCount === 1 ? 'Report' : 'Reports'}
                    </button>

                    {/* Both verdicts need something still open to rule on. */}
                    {g.openCount > 0 && (
                      <>
                        <button
                          onClick={() => setDismissTarget(g)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ShieldOff size={13} /> Dismiss
                        </button>
                        {!removed && (
                          <button
                            onClick={() => setRemoveTarget(g)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* What the reporters actually said */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 divide-y divide-slate-100 dark:divide-slate-800">
                    {g.reports.map((r) => (
                      <div key={r.id} className="px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">@{r.reporter.username}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">{r.reasonText}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[10px] text-slate-400">{formatDate(r.createdAt)}</span>
                          {r.status !== 'open' && (
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                              {r.status}
                              {r.reviewedBy ? ` by @${r.reviewedBy}` : ''}
                            </span>
                          )}
                        </div>
                        {r.note && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">"{r.note}"</p>
                        )}
                        {r.reviewNote && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Moderator note: {r.reviewNote}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
            Page {data.page} of {data.pages} · {data.total} listings
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

      <DismissReportsDialog
        open={dismissTarget !== null}
        listingTitle={dismissTarget?.listing.title ?? ''}
        reportCount={dismissTarget?.openCount ?? 0}
        isPending={dismissReports.isPending}
        errorMessage={dismissReports.isError ? apiErrorMessage(dismissReports.error) : null}
        onConfirm={confirmDismiss}
        onCancel={() => setDismissTarget(null)}
      />

      <RemoveListingDialog
        open={removeTarget !== null}
        listingTitle={removeTarget?.listing.title ?? ''}
        defaultReason={removeTarget?.topReason ?? null}
        context={removeTarget ? `${removeTarget.reportCount} buyer reports: ${tallyText(removeTarget)}` : null}
        isPending={removeListing.isPending}
        errorMessage={removeListing.isError ? apiErrorMessage(removeListing.error) : null}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
