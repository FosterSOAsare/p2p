import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react'
import { changePasswordSchema, type ChangePasswordForm } from '../data/schemas'
import { useChangePassword } from '../data/authApi'
import { apiErrorMessage } from '../../shared/libs/api'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all'

export function ChangePassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) })

  const changePassword = useChangePassword()

  const onSubmit = handleSubmit((values) => {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => reset() },
    )
  })

  return (
    <div className="mx-auto max-w-md py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Change Password</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Update your account password for enhanced security.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
        {changePassword.isSuccess && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} /> Password updated successfully! Other devices have been signed out.
          </div>
        )}

        {changePassword.isError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
            {apiErrorMessage(changePassword.error)}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="change-current">
              Current Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="change-current"
                type="password"
                {...register('currentPassword')}
                placeholder="••••••••••••"
                className={inputClass}
              />
            </div>
            {errors.currentPassword && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="change-new">
              New Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="change-new"
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
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="change-confirm">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="change-confirm"
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
            disabled={changePassword.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {changePassword.isPending ? 'Updating...' : 'Update Password'}
            {!changePassword.isPending && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
