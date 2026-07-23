import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MailCheck, ArrowRight, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useMe, useResendVerification, useVerifyEmail } from '../data/authApi'
import { apiErrorMessage } from '../../shared/libs/api'

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const { data: me } = useMe()
  const verify = useVerifyEmail()
  const resend = useResendVerification()

  // If the page was opened from the emailed link (?token=...), verify automatically.
  const attempted = useRef(false)
  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true
      verify.mutate(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // 1. Verifying the emailed link right now
  if (token && verify.isPending) {
    return (
      <div className="mx-auto max-w-md py-12 space-y-6 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 shadow-md">
          <Loader2 size={32} className="animate-spin" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Verifying your email...</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            Hold on a second while we confirm your verification link.
          </p>
        </div>
      </div>
    )
  }

  // 2. Verified — either via the link just now, or the account was already confirmed
  if ((token && verify.isSuccess) || (!token && me?.emailVerified)) {
    return (
      <div className="mx-auto max-w-md py-12 space-y-6 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shadow-md">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {token ? 'Email verified!' : 'Your email is already verified'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
            {me?.email ? (
              <>
                <strong className="text-slate-800 dark:text-slate-200">{me.email}</strong> is confirmed.{' '}
              </>
            ) : (
              'Your email address has been confirmed. '
            )}
            You'll receive order status updates and escrow release alerts.
          </p>
        </div>
        <Link
          to="/marketplace"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 px-5 text-xs font-semibold text-white hover:bg-primary-700 transition-all"
        >
          Continue to Marketplace <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  // 3. Waiting for the user to click the link (or the link failed) — offer resend
  return (
    <div className="mx-auto max-w-md py-12 space-y-6 text-center">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 shadow-md">
        <MailCheck size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Check your email</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
          We sent a verification link to{' '}
          {me?.email ? (
            <strong className="text-slate-800 dark:text-slate-200">{me.email}</strong>
          ) : (
            'your email address'
          )}
          . Please click the link to confirm your account.
        </p>
      </div>

      {token && verify.isError && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <XCircle size={16} className="shrink-0" /> {apiErrorMessage(verify.error)}
        </div>
      )}

      {resend.isError && (
        <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <XCircle size={16} className="shrink-0" />
          {me ? apiErrorMessage(resend.error) : 'You need to be signed in to resend the link. Please log in first.'}
        </div>
      )}

      {resend.isSuccess && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0" /> A fresh verification link has been sent to your inbox.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 text-xs">
        <p className="text-slate-500 dark:text-slate-400">
          Email confirmation ensures you receive order status updates and escrow release alerts. You can still browse while unverified.
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Prototype note: email delivery is simulated — the verification link is printed in the API server console.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={resend.isPending ? 'animate-spin' : ''} />
            {resend.isPending ? 'Sending...' : 'Resend Verification Link'}
          </button>

          <Link
            to="/marketplace"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 px-4 font-semibold text-white hover:bg-primary-700 transition-all"
          >
            Continue to Marketplace <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
