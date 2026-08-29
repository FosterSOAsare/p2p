import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ShieldCheck,
  Store,
  User,
  Building,
  FileCheck,
  Smartphone,
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import { useKycStatus, useSubmitKyc } from '../features/seller/data/kycApi'
import { kycSchema, type KycForm } from '../features/seller/data/schemas'
import { apiErrorMessage } from '../features/shared/libs/api'
import { formatDate } from '../features/shared/libs/date'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none'

const plainInputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none'

const selectClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none cursor-pointer'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{message}</p>
}

export function VendorKyc() {
  const { data: me } = useMe()
  const kycQuery = useKycStatus()
  const submitKyc = useSubmitKyc()

  const status = kycQuery.data?.status
  const submission = kycQuery.data?.submission

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KycForm>({
    resolver: zodResolver(kycSchema),
    defaultValues: { country: 'Ghana', idType: 'Passport' },
    // Prefill from the previous submission (rejected → refill flow)
    values: submission
      ? {
          legalName: submission.legalName,
          storeName: submission.storeName,
          taxId: submission.taxId ?? '',
          country: submission.country,
          address: submission.address,
          idType: submission.idType as KycForm['idType'],
          idNumber: submission.idNumber,
          momoNumber: submission.momoNumber ?? '',
          trxAddress: submission.trxAddress ?? '',
        }
      : undefined,
  })

  const onSubmit = handleSubmit((values) => {
    submitKyc.mutate({
      legalName: values.legalName,
      storeName: values.storeName,
      taxId: values.taxId || null,
      country: values.country,
      address: values.address,
      idType: values.idType,
      idNumber: values.idNumber,
      momoNumber: values.momoNumber || null,
      trxAddress: values.trxAddress || null,
    })
  })

  const header = (
    <>
      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Buyer Dashboard
      </Link>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
          <Store size={14} />
          Vendor Onboarding & KYC Application
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Become a Verified Vendor
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Upgrade your buyer account to start listing physical goods on VeriTrust. Identity verification ensures 100% buyer trust.
        </p>
      </div>
    </>
  )

  // Not signed in
  if (me === null) {
    return (
      <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
        {header}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 text-center space-y-4 shadow-xl">
          <p className="text-sm text-slate-600 dark:text-slate-300">Sign in to your account to start seller verification.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all"
          >
            Sign In to Continue <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  // Loading current KYC status
  if (kycQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
        {header}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 text-center space-y-3 shadow-xl">
          <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Checking your verification status...</p>
        </div>
      </div>
    )
  }

  // Already verified
  if (status === 'verified') {
    return (
      <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
        {header}
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 p-5 sm:p-10 text-center space-y-5 animate-fade-in shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <ShieldCheck size={14} /> Verified Seller
            </span>
            <h2 className="font-display text-2xl font-bold text-emerald-950 dark:text-white">
              Congratulations{submission?.storeName ? `, ${submission.storeName}` : ''}!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Your vendor KYC application has been verified. You can now post listings to the marketplace, manage inventory, and receive escrow payouts to your payout accounts.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/listings"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
            >
              Create Your First Listing <ArrowRight size={16} />
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-5 py-3 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-800"
            >
              Go to Seller Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Under review
  if (status === 'pending') {
    return (
      <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
        {header}
        <div className="rounded-3xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 p-5 sm:p-10 text-center space-y-5 animate-fade-in shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
            <Clock size={32} />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 dark:bg-amber-900/60 px-3 py-1 text-xs font-bold text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              <Clock size={14} /> Application Under Review
            </span>
            <h2 className="font-display text-2xl font-bold text-amber-950 dark:text-white">We're reviewing your application</h2>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              Your KYC submission
              {kycQuery.data?.submittedAt ? ` from ${formatDate(kycQuery.data.submittedAt)}` : ''} is with our
              review team. You'll be able to list on the marketplace once it's approved. You can keep buying and using escrow
              deals in the meantime.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition-all"
          >
            Return to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  // Fresh application (unverified) or resubmission (rejected)
  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
      {header}

      {status === 'rejected' && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-4 sm:p-5 space-y-2 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
            <XCircle size={16} /> Your previous application was rejected
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            {kycQuery.data?.rejectionReason || 'No reason was provided. Please review your details and submit again.'}
          </p>
          <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
            Your previous answers are prefilled below — correct them and resubmit.
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-10 shadow-xl space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
            <ShieldCheck size={18} className="text-primary-600 dark:text-primary-400" />
            Seller KYC Verification Form
          </span>
        </div>

        {submitKyc.isError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 animate-fade-in">
            {apiErrorMessage(submitKyc.error)}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-8" noValidate>
          {/* Step 1: Business & Store Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                1
              </span>
              Store & Legal Info
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-fullname">
                  Legal Full Name
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-fullname" type="text" {...register('legalName')} className={inputClass} />
                </div>
                <FieldError message={errors.legalName?.message} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-store">
                  Public Store / Brand Name
                </label>
                <div className="relative">
                  <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-store" type="text" {...register('storeName')} className={inputClass} />
                </div>
                <FieldError message={errors.storeName?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-tax">
                  Tax ID / Business Reg Number <span className="text-slate-400 normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Building size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-tax" type="text" {...register('taxId')} className={inputClass} />
                </div>
                <FieldError message={errors.taxId?.message} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-country">
                  Operating Country
                </label>
                <select id="kyc-country" {...register('country')} className={selectClass}>
                  <option value="Ghana">Ghana</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                </select>
                <FieldError message={errors.country?.message} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-address">
                Business Street Address
              </label>
              <input id="kyc-address" type="text" {...register('address')} className={plainInputClass} />
              <FieldError message={errors.address?.message} />
            </div>
          </div>

          {/* Step 2: Government ID */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                2
              </span>
              Government Identity
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-idtype">
                  Document Type
                </label>
                <select id="kyc-idtype" {...register('idType')} className={selectClass}>
                  <option value="Passport">International Passport</option>
                  <option value="National ID">National ID Card (Ghana Card)</option>
                  <option value="Drivers License">Driver's License</option>
                </select>
                <FieldError message={errors.idType?.message} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-idnum">
                  Document Number
                </label>
                <div className="relative">
                  <FileCheck size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-idnum" type="text" {...register('idNumber')} className={inputClass} />
                </div>
                <FieldError message={errors.idNumber?.message} />
              </div>
            </div>
          </div>

          {/* Step 3: Payout Accounts — both at once, each optional (min. one) */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                3
              </span>
              Escrow Payout Accounts
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Provide at least one. GH₵ deals pay out to your mobile money; TRX deals pay out to your TRX address.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-momo">
                  Mobile Money Number <span className="text-slate-400 normal-case">(GH₵ · simulated)</span>
                </label>
                <div className="relative">
                  <Smartphone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-momo" type="text" {...register('momoNumber')} placeholder="+233 24 000 0000" className={inputClass} />
                </div>
                <FieldError message={errors.momoNumber?.message} />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-trx">
                  TRX Address <span className="text-slate-400 normal-case">(TRON Shasta testnet)</span>
                </label>
                <div className="relative">
                  <Wallet size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="kyc-trx" type="text" {...register('trxAddress')} placeholder="T..." className={`${inputClass} font-mono`} />
                </div>
                <FieldError message={errors.trxAddress?.message} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitKyc.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 px-6 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {submitKyc.isPending
              ? 'Submitting KYC Application...'
              : status === 'rejected'
                ? 'Resubmit Vendor KYC Application'
                : 'Submit Vendor KYC Application'}
            {!submitKyc.isPending && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
