import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  LockKeyhole,
} from 'lucide-react'
import { signupSchema, type SignupForm } from '../data/schemas'
import { useSignup, useUsernameAvailable } from '../data/authApi'
import { apiErrorMessage } from '../../shared/libs/api'
import { useDebouncedValue } from '../../shared/libs/useDebouncedValue'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{message}</p>
}

export function Signup() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onBlur',
    defaultValues: { agreed: false },
  })

  const signup = useSignup()

  // Live username availability check (debounced)
  const username = useDebouncedValue(watch('username')?.trim().toLowerCase() ?? '')
  const availability = useUsernameAvailable(username)

  const onSubmit = handleSubmit((values) => {
    signup.mutate(
      {
        username: values.username,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
      },
      { onSuccess: () => navigate('/verify-email', { state: { email: values.email } }) },
    )
  })

  return (
    <div className="py-4 sm:py-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[660px] transition-colors duration-300">
        {/* Left Side: Visual Panel with Light & Dark Mode adaptation */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-emerald-50 dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1000&auto=format&fit=crop&q=80"
            alt="VeriTrust escrow protection"
            className="absolute inset-0 h-full w-full object-cover opacity-15 dark:opacity-45 transition-transform duration-700 hover:scale-105"
          />

          {/* Top Brand Pill */}
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-primary-300 border border-slate-200 dark:border-white/20 shadow-sm">
              <Sparkles size={15} className="text-emerald-600 dark:text-primary-400" />
              <span>Smart Escrow Ledger</span>
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Join thousands trading with 100% deposit safety.
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Create a free buyer account to shop verified physical listings or initiate custom standalone escrow deals.
            </p>
          </div>

          {/* Floating Live Card Preview */}
          <div className="relative z-10 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-slate-200 dark:border-white/20 p-4 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <LockKeyhole size={14} /> Escrow Protection Active
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Fiat & Crypto</span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-normal">
              "Escrow payments remain securely locked until the buyer inspects and approves the item."
            </p>
          </div>

          {/* Bottom Trust Indicators */}
          <div className="relative z-10 space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Identity-verified sellers (KYC provider integration)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Senior admin moderation & single-appeal protection</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="p-4 sm:p-10 space-y-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-md mb-1">
                <ShieldCheck size={14} />
                Free Registration
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Create your account
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Get started in seconds. No credit card required.
              </p>
            </div>

            {signup.isError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 animate-fade-in">
                {apiErrorMessage(signup.error)}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
              {/* 1. Full Name */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="signup-fullname">
                  Full Name
                </label>
                <div className="relative">
                  <UserCheck size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-fullname"
                    type="text"
                    {...register('fullName')}
                    placeholder="Kofi Mensah"
                    className={inputClass}
                  />
                </div>
                <FieldError message={errors.fullName?.message} />
              </div>

              {/* 2. Username */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="signup-username">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-username"
                    type="text"
                    {...register('username')}
                    placeholder="kwame_tech"
                    className={inputClass}
                  />
                </div>
                <FieldError message={errors.username?.message} />
                {!errors.username && availability.data && (
                  availability.data.available ? (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} /> @{username} is available
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      <XCircle size={12} /> @{username} is already taken
                    </p>
                  )
                )}
              </div>

              {/* 3. Email Address */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="signup-email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-email"
                    type="email"
                    {...register('email')}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <FieldError message={errors.email?.message} />
              </div>

              {/* 4. Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-password"
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

              {/* 5. Confirm Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="signup-confirm-password">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    placeholder="••••••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError message={errors.confirmPassword?.message} />
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  {...register('agreed')}
                  className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  I agree to the <span className="font-semibold text-slate-800 dark:text-white">Terms of Service</span> &{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">Escrow Rules</span>.
                </span>
              </label>
              <FieldError message={errors.agreed?.message} />

              {/* Submit Button */}
              <button
                type="submit"
                disabled={signup.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {signup.isPending ? 'Creating Account...' : 'Create Account & Verify'}
                {!signup.isPending && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
