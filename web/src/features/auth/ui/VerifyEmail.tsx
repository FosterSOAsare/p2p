import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react'

export function VerifyEmail() {
  const [resent, setResent] = useState(false)

  const handleResend = () => {
    setResent(true)
    setTimeout(() => setResent(false), 4000)
  }

  return (
    <div className="mx-auto max-w-md py-12 space-y-6 text-center">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 shadow-md">
        <MailCheck size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Check your email</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
          We sent a verification link to your email address. Please click the link to confirm your account.
        </p>
      </div>

      {resent && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 animate-fade-in">
          <CheckCircle2 size={16} /> A fresh verification link has been sent to your inbox.
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-4 text-xs">
        <p className="text-slate-500 dark:text-slate-400">
          Email confirmation ensures you receive order status updates and escrow release alerts. You can still browse while unverified.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={handleResend}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={resent ? 'animate-spin' : ''} />
            Resend Verification Link
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
