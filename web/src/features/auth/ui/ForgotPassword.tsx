import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../data/schemas'
import { useForgotPassword } from '../data/authApi'
import { apiErrorMessage } from '../../shared/libs/api'

export function ForgotPassword() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })

  const forgot = useForgotPassword()

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email))

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
        {forgot.isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white">Reset link sent!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              If an account associated with <strong className="text-slate-800 dark:text-slate-200">{getValues('email')}</strong> exists, you will receive password reset instructions shortly.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
              Prototype note: email delivery is simulated — the reset link is printed in the API server console.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {forgot.isError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
                {apiErrorMessage(forgot.error)}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="forgot-email">
                Account Email
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="forgot-email"
                  type="email"
                  {...register('email')}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={forgot.isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {forgot.isPending ? 'Sending link...' : 'Send Reset Link'}
              {!forgot.isPending && <ArrowRight size={16} />}
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
