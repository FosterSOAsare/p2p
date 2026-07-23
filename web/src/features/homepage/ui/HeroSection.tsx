import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Store, Lock, CheckCircle2, RefreshCw } from 'lucide-react'
import { Badge } from '../../shared/ui/Badge'

export function HeroSection() {
  const [dealState, setDealState] = useState<'funded' | 'shipped' | 'released'>('funded')

  return (
    <section className="relative overflow-hidden w-full pt-6 pb-10 sm:pt-12 sm:pb-16 lg:py-20 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      {/* Full-Width Edge-to-Edge Background Photography Image */}
      <img
        src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&auto=format&fit=crop&q=80"
        alt="P2P Escrow Commerce Hero Background"
        className="absolute inset-0 h-full w-full object-cover opacity-35 dark:opacity-45 transition-opacity duration-500 pointer-events-none"
      />

      {/* Light & Dark Ambient Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-white/70 dark:bg-slate-950/75" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Copy & Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-slate-800 bg-primary-100/80 dark:bg-slate-900/80 px-3.5 py-1.5 backdrop-blur-md">
            <ShieldCheck size={16} className="text-primary-700 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-primary-900 dark:text-primary-300 tracking-wide uppercase">
              Dual Fiat & Crypto Protection
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            The <span className="text-primary-600 dark:text-primary-400">Trust-First</span> P2P Marketplace & Escrow Engine.
          </h1>

          <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed font-normal">
            Buy physical goods safely with held-in-escrow payments from KYC-verified sellers, or open standalone escrow contracts for any off-platform transaction with zero friction.
          </p>

          {/* Action CTAs: Full-width on mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
            <Link
              to="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all duration-200 cursor-pointer"
            >
              <Store size={18} />
              Browse Marketplace
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/escrow/new"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900 px-6 py-3.5 text-base font-semibold text-slate-800 dark:text-white backdrop-blur-md shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
            >
              <ShieldCheck size={18} className="text-primary-600 dark:text-emerald-400" />
              Start Escrow Deal
            </Link>
          </div>

          {/* Micro trust indicators */}
          <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300 border-t border-slate-300/80 dark:border-slate-800">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              100% KYC Verified Vendors
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              Rail-Agnostic Single Ledger
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              Admin Moderated Disputes
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Escrow Simulator Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-colors duration-300">
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Live Escrow Simulator</span>
              </div>
              <Badge tone={dealState === 'released' ? 'success' : dealState === 'shipped' ? 'warning' : 'info'}>
                {dealState === 'funded' && 'Escrow Funded'}
                {dealState === 'shipped' && 'Item Shipped'}
                {dealState === 'released' && 'Funds Released'}
              </Badge>
            </div>

            {/* Deal Content Card: Compact Mobile Padding */}
            <div className="my-3 sm:my-4 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm sm:text-base">MacBook Pro 16" M3 Max</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Order #84920 • Seller: <span className="font-semibold text-slate-700 dark:text-slate-200">@kwame_tech</span> (KYC Verified)</p>
                </div>
                <span className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white shrink-0">$2,450.00</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs">
                  <Lock size={13} className="text-primary-600 dark:text-primary-400" />
                  Rail: Fiat (Stripe Hold)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] sm:text-xs">Protected in Escrow</span>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Simulate Deal Lifecycle:</p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <button
                  onClick={() => setDealState('funded')}
                  className={`rounded-xl px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${
                    dealState === 'funded'
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  1. Funded
                </button>
                <button
                  onClick={() => setDealState('shipped')}
                  className={`rounded-xl px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${
                    dealState === 'shipped'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  2. Shipped
                </button>
                <button
                  onClick={() => setDealState('released')}
                  className={`rounded-xl px-2 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer ${
                    dealState === 'released'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  3. Confirmed
                </button>
              </div>
            </div>

            {/* Dynamic Status Callout with vibrant state-based themes */}
            <div
              className={`mt-3 sm:mt-4 rounded-2xl p-3 text-[11px] sm:text-xs font-semibold border flex items-center justify-between transition-all duration-300 ${
                dealState === 'funded'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-700/80'
                  : dealState === 'shipped'
                  ? 'bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-700/80'
                  : 'bg-sky-50 text-sky-950 border-sky-200 dark:bg-sky-950/90 dark:text-sky-300 dark:border-sky-700/80'
              }`}
            >
              <span className="leading-snug">
                {dealState === 'funded' && 'Buyer payment locked safely. Vendor notified to ship.'}
                {dealState === 'shipped' && 'Tracking info uploaded. Awaiting buyer confirmation.'}
                {dealState === 'released' && 'Buyer confirmed receipt! Escrow released to seller account.'}
              </span>
              <RefreshCw
                size={15}
                className={`shrink-0 ml-2 animate-spin ${
                  dealState === 'funded'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : dealState === 'shipped'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-sky-600 dark:text-sky-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
