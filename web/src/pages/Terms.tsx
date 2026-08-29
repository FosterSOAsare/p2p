import { Link } from 'react-router-dom'
import { ShieldCheck, FileText, ArrowLeft } from 'lucide-react'

export function Terms() {
  return (
    <div className="py-4 sm:py-6 space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Back link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>

      <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
          <FileText size={14} />
          Legal Agreement
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Terms of Service & Escrow Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Last updated: July 21, 2026 • Effective for all buyer purchases and standalone escrow contracts.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 lg:p-10 shadow-xl space-y-6 sm:space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
        {/* Key Highlights Banner */}
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs sm:text-sm">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            Core Escrow Guarantee
          </div>
          <p className="text-emerald-800 dark:text-emerald-300 text-xs leading-normal">
            Payments deposited into VeriTrust are held securely in non-custodial smart contracts (or Stripe hold rails) until the buyer confirms physical item receipt or 14-day auto-release timer expires without dispute.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Escrow Engine Overview
          </h2>
          <p>
            VeriTrust acts as a decentralized software intermediary facilitating two types of financial protection:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li><strong>Marketplace Escrow:</strong> Orders made through listed vendor items auto-lock payment until seller submits valid tracking and buyer confirms receipt.</li>
            <li><strong>Standalone Escrow:</strong> Off-platform custom deals initiated between two independent parties with pre-agreed terms and dispute resolution rules.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Buyer & Seller Obligations
          </h2>
          <p>
            Sellers agree to ship physical items strictly using tracked insured carriers (DHL, FedEx, UPS) within 72 hours of escrow funding. Buyers agree to inspect received items and mark release within 48 hours of carrier delivery confirmation.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            3. Dispute Resolution & Arbitration SLA
          </h2>
          <p>
            If an item is damaged, non-functional, or different from description, either party may raise a formal dispute. VeriTrust dispute administrators review carrier proof of delivery, order chat logs, and unboxing video evidence. Final rulings are executed programmatically to refund the buyer or release funds to the seller within 5 business days.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            4. Level 2 Vendor KYC Compliance
          </h2>
          <p>
            To sell goods or receive payouts exceeding $1,000 USD, merchants must complete Level 2 KYC verification, providing valid government identification and business registration documentation.
          </p>
        </div>

        {/* Footer Contact */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Questions about our terms? Contact legal@veritrust.app</span>
          <Link to="/privacy" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            View Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  )
}
