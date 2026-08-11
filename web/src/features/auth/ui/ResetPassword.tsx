import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { resetPasswordSchema, type ResetPasswordForm } from '../data/schemas'
import { useResetPassword } from '../data/authApi'
import { apiErrorMessage } from '../../shared/libs/api'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all'

export function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  const reset = useResetPassword()

  useEffect(() => {
    if (reset.isSuccess) {
      const timer = setTimeout(() => navigate('/login'), 1500)
      return () => clearTimeout(timer)
    }
  }, [reset.isSuccess, navigate])

  const onSubmit = handleSubmit((values) => reset.mutate({ token, newPassword: values.newPassword }))

  return (
    <div className="mx-auto max-w-md py-4 sm:py-10 space-y-6 sm:space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Set new password</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your new password must be at least 8 characters long.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-xl space-y-6">
        {!token ? (
          <div className="space-y-3 text-center py-4">
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Invalid reset link</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This link is missing its reset token. Request a new one from the forgot-password page.
            </p>
            <Link to="/forgot-password" className="inline-block text-xs font-semibold text-primary-600 dark:text-primary-400 underline pt-2">
              Request new reset link
            </Link>
          </div>
        ) : reset.isSuccess ? (
          <div className="space-y-3 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Password reset successful!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Redirecting to login page...</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {reset.isError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {apiErrorMessage(reset.error)}
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
                  {...register('newPassword')}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </div>
              {errors.newPassword && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{errors.newPassword.message}</p>
              )}
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
                  {...register('confirmPassword')}
                  placeholder="••••••••••••"
                  className={inputClass}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={reset.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {reset.isPending ? 'Resetting...' : 'Reset Password'}
              {!reset.isPending && <ArrowRight size={16} />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
