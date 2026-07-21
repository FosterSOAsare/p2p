import { Link } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'

export function Privacy() {
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
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          <Lock size={14} />
          Data Protection & Privacy Policy
        </div>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Privacy & Encrypted Ledger Policy
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Last updated: July 21, 2026 • Learn how we protect your personal identity, chat history, and payment transactions.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 lg:p-10 shadow-xl space-y-6 sm:space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
        {/* Highlight Banner */}
        <div className="rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 p-4 sm:p-5 space-y-2">
          <div className="flex items-center gap-2 text-primary-900 dark:text-primary-300 font-bold text-xs sm:text-sm">
            <Lock size={18} className="text-primary-600 dark:text-primary-400 shrink-0" />
            Zero Data Monetization Guarantee
          </div>
          <p className="text-primary-800 dark:text-primary-300 text-xs leading-normal">
            P2P Trust Market never sells or shares your personal identity, delivery addresses, or purchase history with third-party advertisers. All transaction data is strictly restricted to deal resolution.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Information We Collect
          </h2>
          <p>
            To provide safe escrow services and prevent fraudulent activity, we collect:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            <li><strong>Account Credentials:</strong> Email address, username, encrypted password, and optional phone number.</li>
            <li><strong>KYC Identity Data:</strong> Government ID scans and business tax documentation stored in encrypted AES-256 vaults.</li>
            <li><strong>Transaction & Shipping Logs:</strong> Escrow contract terms, tracking numbers, and order evidence chat messages.</li>
          </ul>
        </div>

        {/* Section 2 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            2. How Information is Used
          </h2>
          <p>
            Collected data is strictly used for order tracking, payment release verification, and resolving buyer/seller disputes. Carrier tracking information is automatically updated and shared only between buyer and seller.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            3. On-Chain Anonymity & Encryption
          </h2>
          <p>
            Crypto wallet payments interact with audited smart contracts on public blockchains (Polygon / Ethereum). Personal buyer/seller addresses remain off-chain, ensuring high privacy while maintaining verifiable cryptographic ledger proof.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-2.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            4. Data Retention & Account Deletion
          </h2>
          <p>
            Users may request full deletion of their account profile and unverified documents at any time. Active escrow transaction records are retained for 90 days following deal resolution for audit compliance.
          </p>
        </div>

        {/* Footer Link */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span>Privacy inquiries: privacy@p2ptrust.market</span>
          <Link to="/terms" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  )
}
