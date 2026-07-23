import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  LockKeyhole,
} from 'lucide-react'

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function Signup() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignup = () => {
    setGoogleLoading(true)
    setTimeout(() => {
      setGoogleLoading(false)
      navigate('/verify-email')
    }, 800)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !username || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!agreed) {
      setError('You must agree to the Terms of Service and Escrow Rules.')
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/verify-email')
    }, 600)
  }

  return (
    <div className="py-4 sm:py-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl grid grid-cols-1 lg:grid-cols-12 min-h-[660px] transition-colors duration-300">
        {/* Left Side: Visual Panel with Light & Dark Mode adaptation */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 bg-emerald-50 dark:bg-slate-950 text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1000&auto=format&fit=crop&q=80"
            alt="P2P Escrow Protection"
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
          <div className="p-6 sm:p-10 space-y-5">
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

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300 animate-fade-in">
                {error}
              </div>
            )}

            {/* Google Sign Up Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting to Google...' : 'Sign up with Google'}
            </button>

            {/* OR Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              <span className="absolute bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                or fill form
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Kofi Mensah"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
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
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kwame_tech"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                </div>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
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
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
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
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  I agree to the <span className="font-semibold text-slate-800 dark:text-white">Terms of Service</span> &{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">Escrow Rules</span>.
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 px-4 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Account & Verify'}
                {!loading && <ArrowRight size={16} />}
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
