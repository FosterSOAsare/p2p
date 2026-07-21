import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 700)
  }

  return (
    <div className="mx-auto max-w-md py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20 mb-2">
          <KeyRound size={24} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reset your password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Enter your registered account email to receive a password reset link.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6">
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Reset link sent!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If an account associated with <strong className="text-slate-800 dark:text-slate-200">{email}</strong> exists, you will receive password reset instructions shortly.
            </p>
            <Link
              to="/reset-password?token=demo123"
              className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400 underline pt-2"
            >
              Demo: Simulate clicking reset link in email
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="forgot-email">
                Account Email
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
