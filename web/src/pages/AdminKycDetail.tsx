import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  User,
  Store,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { AdminGuard } from '../features/admin/ui/AdminGuard'
import { useAdminKyc, useApproveKyc, useRejectKyc } from '../features/admin/data/adminApi'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatDate, formatDateTime } from '../features/shared/libs/date'

function Field({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</div>
      <div className={`text-xs sm:text-sm font-semibold text-slate-900 dark:text-white break-all ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </div>
    </div>
  )
}

export function AdminKycDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const kycQuery = useAdminKyc(id)
  const approve = useApproveKyc()
  const reject = useRejectKyc()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const kyc = kycQuery.data
  const deciding = approve.isPending || reject.isPending
  const decisionError = approve.error ?? reject.error

  const handleApprove = () => {
    approve.mutate({ id }, { onSuccess: () => navigate('/admin/kyc') })
  }

  const handleReject = () => {
    if (reason.trim().length < 5) {
      setReasonError('Give the applicant a clear rejection reason (min 5 chars)')
      return
    }
    setReasonError('')
    reject.mutate({ id, reason: reason.trim() }, { onSuccess: () => navigate('/admin/kyc') })
  }

  return (
    <AdminGuard>
      <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
        <Link
          to="/admin/kyc"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Review Queue
        </Link>

        {kycQuery.isLoading && (
          <div className="py-16 text-center">
            <Loader2 size={26} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        )}

        {kycQuery.isError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
            {apiErrorMessage(kycQuery.error)}
          </div>
        )}

        {kyc && (
          <>
            {/* Applicant header */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3.5">
                  {kyc.user.avatarUrl ? (
                    <img src={kyc.user.avatarUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-base font-bold text-white uppercase">
                      {kyc.user.username.charAt(0)}
                    </span>
                  )}
                  <div>
                    <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{kyc.storeName}</h1>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      @{kyc.user.username} · {kyc.user.email} · joined {formatDate(kyc.user.joinedAt)}
                    </p>
                  </div>
                </div>
                {kyc.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <Clock size={13} /> Pending Review
                  </span>
                )}
                {kyc.status === 'verified' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={13} /> Approved {kyc.reviewedAt ? formatDate(kyc.reviewedAt) : ''}
                  </span>
                )}
                {kyc.status === 'rejected' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-3 py-1 text-xs font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <XCircle size={13} /> Rejected {kyc.reviewedAt ? formatDate(kyc.reviewedAt) : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Submitted {formatDateTime(kyc.submittedAt)}</p>
              {kyc.status === 'rejected' && kyc.rejectionReason && (
                <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Rejection reason:</span> {kyc.rejectionReason}
                </div>
              )}
            </div>

            {/* Submission details */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <User size={16} className="text-primary-600 dark:text-primary-400" /> Legal & Identity
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Legal Full Name" value={kyc.legalName} />
                <Field label="Operating Country" value={kyc.country} />
                <Field label="ID Document Type" value={kyc.idType} />
                <Field label="ID Document Number" value={kyc.idNumber} mono />
                <Field label="Tax ID / Business Reg" value={kyc.taxId} />
                <Field label="Business Address" value={kyc.address} />
              </div>

              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 pt-2">
                <Store size={16} className="text-primary-600 dark:text-primary-400" /> Payout Accounts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5">
                  <Smartphone size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <Field label="Mobile Money (GH₵ · simulated)" value={kyc.momoNumber} />
                </div>
                <div className="flex items-start gap-2.5">
                  <Wallet size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <Field label="TRX Address (Shasta)" value={kyc.trxAddress} mono />
                </div>
              </div>
            </div>

            {/* Decision actions — pending only */}
            {kyc.status === 'pending' && (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-slate-900 dark:text-white">
                  <ShieldCheck size={16} className="text-primary-600 dark:text-primary-400" /> Decision
                </h3>

                {decisionError != null && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                    {apiErrorMessage(decisionError)}
                  </div>
                )}

                {rejectOpen ? (
                  <div className="space-y-3">
                    <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="reject-reason">
                      Rejection reason (shown to the applicant)
                    </label>
                    <textarea
                      id="reject-reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. The ID document number doesn't match the legal name provided..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none resize-none"
                    />
                    {reasonError && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{reasonError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReject}
                        disabled={deciding}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <XCircle size={15} /> {reject.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => setRejectOpen(false)}
                        disabled={deciding}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={deciding}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      <CheckCircle2 size={15} /> {approve.isPending ? 'Approving...' : 'Approve as Verified Seller'}
                    </button>
                    <button
                      onClick={() => setRejectOpen(true)}
                      disabled={deciding}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                    >
                      <XCircle size={15} /> Reject...
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminGuard>
  )
}
