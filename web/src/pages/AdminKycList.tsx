import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Clock, CheckCircle2, XCircle, ArrowRight, Inbox, Loader2 } from 'lucide-react'
import { useAdminKycList } from '../features/admin/data/adminApi'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatDate } from '../features/shared/libs/date'

type StatusTab = 'pending' | 'verified' | 'rejected'

const TABS: { id: StatusTab; label: string }[] = [
  { id: 'pending', label: 'Pending Review' },
  { id: 'verified', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

function StatusBadge({ status }: { status: StatusTab }) {
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Clock size={12} /> Pending
      </span>
    )
  if (status === 'verified')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 size={12} /> Approved
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
      <XCircle size={12} /> Rejected
    </span>
  )
}

export function AdminKycList() {
  const [tab, setTab] = useState<StatusTab>('pending')
  const list = useAdminKycList(tab)

  return (
    <>
      <div className="py-4 sm:py-6 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                <ShieldCheck size={14} />
                Admin Console
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                KYC Review Queue
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Review seller identity submissions. Approving unlocks marketplace listing for the applicant.
              </p>
            </div>

            {/* Section Sub-Navigation */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <Link
                to="/admin/kyc"
                className="px-3.5 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm transition-all"
              >
                KYC Reviews
              </Link>
              <Link
                to="/admin/disputes"
                className="px-3.5 py-1.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              >
                Disputes Arbitration
              </Link>
            </div>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                tab === id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {list.isLoading && (
          <div className="py-16 text-center">
            <Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        )}

        {list.isError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
            {apiErrorMessage(list.error)}
          </div>
        )}

        {list.data && list.data.submissions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-12 text-center space-y-3">
            <Inbox size={28} className="mx-auto text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              No {tab === 'pending' ? 'pending' : tab} submissions.
            </p>
          </div>
        )}

        {list.data && list.data.submissions.length > 0 && (
          <div className="space-y-3">
            {list.data.submissions.map((kyc) => (
              <Link
                key={kyc.id}
                to={`/admin/kyc/${kyc.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {kyc.user.avatarUrl ? (
                    <img src={kyc.user.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white uppercase shrink-0">
                      {kyc.user.username.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{kyc.storeName}</span>
                      <StatusBadge status={kyc.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      @{kyc.user.username} · {kyc.legalName} · {kyc.country} · submitted {formatDate(kyc.submittedAt)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 shrink-0 group-hover:gap-2 transition-all">
                  Review <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
