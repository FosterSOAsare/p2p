import { Link } from 'react-router-dom'
import { Store, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function SellerCtaBanner() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-10 text-slate-900 dark:text-white shadow-xl transition-colors duration-300">
        <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8 space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={14} />
              Verified Merchant Network
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Are you a merchant? Sell with 100% payout protection.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Complete your vendor KYC verification to post physical goods to thousands of protected buyers. Get instant payouts released directly to your account.
            </p>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                Zero Listing Fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                Integrated Dispatch Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                Senior Dispute Protection
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex justify-start lg:justify-end">
            <Link
              to="/sell"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-white dark:text-slate-950 shadow-lg hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <Store size={18} />
              Apply for Vendor KYC
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
