import { ShieldCheck, Lock, Award, Users } from 'lucide-react'

export function TrustMetrics() {
  return (
    <section className="relative overflow-hidden">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-10 shadow-lg text-slate-900 dark:text-white transition-colors duration-300">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Stat 1 */}
          <div className="space-y-1.5 text-center sm:text-left sm:px-4 first:pl-0">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <ShieldCheck size={15} />
              Protected Deals
            </div>
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              2,400+
            </p>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
              Escrow deals completed with zero buyer capital loss.
            </p>
          </div>

          {/* Stat 2 */}
          <div className="space-y-1.5 text-center sm:text-left pt-4 sm:pt-0 sm:px-4">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Lock size={15} />
              Volume Locked
            </div>
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              GH₵ 1.8M+
            </p>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
              Total value held in escrow until delivery is confirmed.
            </p>
          </div>

          {/* Stat 3 */}
          <div className="space-y-1.5 text-center sm:text-left pt-4 lg:pt-0 sm:px-4">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              <Award size={15} />
              Dispute Resolution
            </div>
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              99.6%
            </p>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
              Disputes settled fairly by the admin arbitration desk.
            </p>
          </div>

          {/* Stat 4 */}
          <div className="space-y-1.5 text-center sm:text-left pt-4 lg:pt-0 sm:px-4">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <Users size={15} />
              KYC Vendors
            </div>
            <p className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              320+
            </p>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
              Verified merchants cleared through identity KYC.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
