import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Loader2,
  Banknote,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import {
  useAdminWithdrawals,
  useCompleteWithdrawal,
  useRejectWithdrawal,
  type AdminWithdrawal,
  type WithdrawalStatus,
} from '../features/admin/data/adminWithdrawalsApi'
import { AdminSectionNav } from '../features/admin/ui/AdminSectionNav'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { formatDate } from '../features/shared/libs/date'

type Filter = WithdrawalStatus | 'all'

const STATUS_TABS: { id: Filter; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
]

const STATUS_CHIP: Record<WithdrawalStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: 'Awaiting review',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    icon: Clock,
  },
  completed: {
    label: 'Sent',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    icon: XCircle,
  },
}

function StatusChip({ status }: { status: WithdrawalStatus }) {
  const { label, className, icon: Icon } = STATUS_CHIP[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}
    >
      <Icon size={11} /> {label}
    </span>
  )
}

/**
 * Reject needs a reason, and the reason reaches the user, so it gets a dialog
 * rather than a bare confirm — and the money going back is stated in it, since
 * that is the part an admin most needs to be sure of before clicking.
 */
function RejectDialog({
  target,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  target: AdminWithdrawal
  onClose: () => void
  onConfirm: (reason: string) => void
  pending: boolean
  error: string | null
}) {
  const [reason, setReason] = useState('')
  const tooShort = reason.trim().length < 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <XCircle size={18} />
            </div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Reject payout</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {formatMoney(target.amount, target.currency)} will be returned to{' '}
          <strong>@{target.user.username}</strong>'s {target.currency} balance immediately. They'll see the
          reason below.
        </p>

        {error && (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reason (shown to the user)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. The mobile money number doesn't match the name on the KYC record."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onClose}
            className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={tooShort || pending}
            className="w-1/2 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
            Reject & refund
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminWithdrawalsList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const statusTab = (searchParams.get('status') as Filter | null) ?? 'pending'
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawal | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

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

  const withdrawalsQuery = useAdminWithdrawals(query)
  const complete = useCompleteWithdrawal()
  const reject = useRejectWithdrawal()

  const rows = withdrawalsQuery.data?.withdrawals ?? []
  const pages = withdrawalsQuery.data?.pages ?? 1

  const onComplete = (w: AdminWithdrawal) => {
    setActionError(null)
    complete.mutate(w.id, { onError: (err) => setActionError(apiErrorMessage(err)) })
  }

  const onReject = (reason: string) => {
    if (!rejectTarget) return
    setActionError(null)
    reject.mutate(
      { id: rejectTarget.id, reason },
      {
        onSuccess: () => setRejectTarget(null),
        onError: (err) => setActionError(apiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="py-4 sm:py-6 space-y-6">
      {/* Same header shape as every other admin list page. The section nav sits
          beside the heading inside this row rather than above it — stacked full
          width, as it was, the nav landed at a different height here than on the
          neighbouring pages and jumped as you moved between them. */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
              <ShieldCheck size={14} />
              Admin Console
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Withdrawal Queue
            </h1>
            {/* Kept to one line at this width, like the other admin pages — the
                nav is centred beside this block, so a taller heading pushes it
                out of line with them. */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Requests are already debited. Completing records the money as sent; rejecting returns it.
            </p>
          </div>

          {/* Section Sub-Navigation */}
          <AdminSectionNav />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setParams({ status: tab.id })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              statusTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Dismiss" className="shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {withdrawalsQuery.isLoading ? (
        <div className="py-16 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : withdrawalsQuery.isError ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
          {apiErrorMessage(withdrawalsQuery.error)}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 text-center space-y-2">
          <Banknote size={32} className="mx-auto text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {statusTab === 'pending' ? 'No payouts waiting' : 'Nothing here'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {statusTab === 'pending'
              ? 'Requests appear here the moment a user withdraws.'
              : 'Try another status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((w) => {
            const busy =
              (complete.isPending && complete.variables === w.id) ||
              (reject.isPending && reject.variables?.id === w.id)
            return (
              <div
                key={w.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg font-bold text-slate-900 dark:text-white">
                        {formatMoney(w.amount, w.currency)}
                      </span>
                      <StatusChip status={w.status} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <Link
                        to={`/admin/users?search=${encodeURIComponent(w.user.username)}`}
                        className="font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        @{w.user.username}
                      </Link>{' '}
                      · {w.user.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all">
                      To <span className="font-mono">{w.destination}</span>
                    </p>
                  </div>

                  {w.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onComplete(w)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Mark sent
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null)
                          setRejectTarget(w)
                        }}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-50 cursor-pointer"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-400">
                  <span className="font-mono">{w.reference}</span>
                  <span>Requested {formatDate(w.createdAt)}</span>
                  {w.reviewedAt && (
                    <span>
                      Reviewed {formatDate(w.reviewedAt)}
                      {w.reviewedBy ? ` by @${w.reviewedBy}` : ''}
                    </span>
                  )}
                </div>

                {w.reviewNote && (
                  <p className="rounded-xl bg-slate-50 dark:bg-slate-950/60 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Reason:</span> {w.reviewNote}
                  </p>
                )}
              </div>
            )
          })}

          {pages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>
                Page <strong>{page}</strong> of <strong>{pages}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setParams({ page: String(page - 1) })}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setParams({ page: String(page + 1) })}
                  disabled={page === pages}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {rejectTarget && (
        <RejectDialog
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={onReject}
          pending={reject.isPending}
          error={actionError}
        />
      )}
    </div>
  )
}
