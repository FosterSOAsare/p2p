import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  LockKeyhole,
} from 'lucide-react'
import { loginSchema, type LoginForm } from '../data/schemas'
import { useLogin } from '../data/authApi'
import { ApiError, apiErrorMessage } from '../../shared/libs/api'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{message}</p>
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)

  // Return leg for anything that bounces a signed-out visitor here (a deal
  // invite link, say). Same-origin paths only — an absolute URL would turn this
  // into an open redirect off the back of our own login page.
  const redirectParam = searchParams.get('redirect')
  const redirectTo = redirectParam?.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/marketplace'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true },
  })

  const login = useLogin()

  const onSubmit = handleSubmit((values) => {
    login.mutate(
      { identifier: values.identifier, password: values.password },
      {
        onSuccess: () => navigate(redirectTo),
        onError: (err) => {
          // Unverified email → server re-sent the link; route to the verify screen.
          const details =
            err instanceof ApiError ? (err.details as { code?: string; email?: string } | undefined) : undefined
          if (details?.code === 'email_unverified') {
            navigate('/verify-email', { state: { email: details.email, resent: true } })
          }
        },
      },
    )
  })

  return (
    <div className="py-4 sm:py-10">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[580px] transition-colors duration-300">
        {/* Left Side: Desktop Visual Image Banner */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-emerald-50 dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&auto=format&fit=crop&q=80"
            alt="P2P Marketplace Shopping"
            className="absolute inset-0 h-full w-full object-cover opacity-15 dark:opacity-45 transition-transform duration-700 hover:scale-105"
          />

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-primary-300 border border-slate-200 dark:border-white/20 shadow-sm">
              <Sparkles size={15} className="text-emerald-600 dark:text-primary-400" />
              <span>Welcome Back</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Manage your orders and escrow payouts.
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in to track live shipments, confirm receipt to release escrow, or manage vendor listings.
            </p>
          </div>

          <div className="relative z-10 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 p-4 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <LockKeyhole size={14} /> Unified Ledger Active
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Secure Auth</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-normal">
              "Real-time dispute protection with auto-logged order chat history."
            </p>
          </div>

          <div className="relative z-10 space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Real-time shipping notifications & release alerts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Instant payouts for verified merchants</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="p-6 sm:p-10 space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-md mb-1">
                <ShieldCheck size={14} />
                Secure Login
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sign in to account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Enter your account credentials to access your buyer or vendor dashboard.
              </p>
            </div>

            {login.isError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 animate-fade-in">
                {apiErrorMessage(login.error)}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              {/* Identifier (Email / Username) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="login-id">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-id"
                    type="text"
                    {...register('identifier')}
                    placeholder="kwame_tech or email@example.com"
                    className={inputClass}
                  />
                </div>
                <FieldError message={errors.identifier?.message} />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="login-password">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError message={errors.password?.message} />
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    {...register('rememberMe')}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  Remember this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={login.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {login.isPending ? 'Signing in...' : 'Sign In'}
                {!login.isPending && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Sign up now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
