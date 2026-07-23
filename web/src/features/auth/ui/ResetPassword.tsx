import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react'

export function ResetPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setSuccess(true)
    setTimeout(() => {
      navigate('/login')
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-md py-10 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Set new password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your new password must be at least 8 characters long.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl space-y-6">
        {success ? (
          <div className="space-y-3 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Password reset successful!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Redirecting to login page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="reset-new">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reset-new"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="reset-confirm">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="reset-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all cursor-pointer"
            >
              Reset Password
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
