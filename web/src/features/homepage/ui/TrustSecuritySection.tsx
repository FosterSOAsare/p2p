import { ShieldCheck, Lock, Scale, CheckCircle2 } from 'lucide-react'

export function TrustSecuritySection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-12 text-slate-900 dark:text-white shadow-xl transition-colors duration-300">
      {/* Background glow */}
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-[350px] w-[350px] rounded-full bg-primary-500/10 dark:bg-primary-600/20 blur-3xl" />

      <div className="max-w-2xl space-y-2.5 mb-6 sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Security Architecture</span>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Engineered for Maximum Safety Across Both Fiat & Crypto
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          Every escrow deal, whether for a $20 marketplace purchase or a $50,000 crypto contract, operates under strict protection protocols.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        {/* Card 1 */}
        <div className="space-y-3.5 rounded-2xl bg-white dark:bg-slate-950 p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800">
            <ShieldCheck size={22} />
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">Third-Party Vendor KYC</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Marketplace sellers undergo government ID and selfie verification via trusted KYC providers. Unverified users cannot list or withdraw payouts.
          </p>
          <div className="pt-1 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={14} /> Zero PII stored locally
          </div>
        </div>

        {/* Card 2 */}
        <div className="space-y-3.5 rounded-2xl bg-white dark:bg-slate-950 p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <Lock size={22} />
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">Append-Only Ledger</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All escrow movements—holds, releases, refunds, and gas logs—are recorded in an immutable ledger normalized across both fiat and crypto rails.
          </p>
          <div className="pt-1 flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 font-semibold">
            <CheckCircle2 size={14} /> Unified audit trail
          </div>
        </div>

        {/* Card 3 */}
        <div className="space-y-3.5 rounded-2xl bg-white dark:bg-slate-950 p-4 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Scale size={22} />
          </div>
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">Senior Admin Dispute Desk</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            If a dispute arises, transaction chat logs and evidence are auto-attached. Admin resolutions support full refund, release, or partial splits.
          </p>
          <div className="pt-1 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 size={14} /> Fair appeal process
          </div>
        </div>
      </div>
    </section>
  )
}
