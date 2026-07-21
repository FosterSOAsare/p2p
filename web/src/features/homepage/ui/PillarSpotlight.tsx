import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Store, ShieldCheck, Check, ArrowRight, Wallet, BadgeCheck, FileText } from 'lucide-react'

export function PillarSpotlight() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'standalone'>('marketplace')

  return (
    <section className="relative overflow-hidden">
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-6 sm:mb-8">
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          Built for Both Marketplace Buyers & Standalone Contracts
        </h2>
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          Whether buying physical goods from verified vendors or locking funds for a custom contract, our rail-agnostic escrow protects every penny.
        </p>

        {/* Tab Toggle Selection - PERFECTLY CENTERED IN THE MIDDLE */}
        <div className="pt-2 flex items-center justify-center w-full">
          <div className="inline-flex items-center justify-center p-1 sm:p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm mx-auto">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'marketplace'
                  ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store size={16} className={activeTab === 'marketplace' ? 'text-primary-600 dark:text-primary-400' : ''} />
              Marketplace Pillar
            </button>
            <button
              onClick={() => setActiveTab('standalone')}
              className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'standalone'
                  ? 'bg-white text-slate-900 dark:bg-slate-900 dark:text-white shadow-md font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck size={16} className={activeTab === 'standalone' ? 'text-emerald-600 dark:text-emerald-400' : ''} />
              Standalone Escrow Pillar
            </button>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 lg:p-10 shadow-sm transition-colors duration-300">
        {activeTab === 'marketplace' ? (
          <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                <Store size={14} />
                Physical Goods Marketplace
              </div>
              <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                Buy with Confidence from Verified Merchants
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                Discover electronics, collectibles, merchandise, and local goods listed by identity-verified vendors. Your payment is held securely in escrow until you receive and confirm the package.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 shrink-0">
                    <Check size={13} />
                  </span>
                  Strict Vendor KYC Verification before any listing is published.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 shrink-0">
                    <Check size={13} />
                  </span>
                  Fiat Payment Default with Stripe hold/capture protection.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 shrink-0">
                    <Check size={13} />
                  </span>
                  Auto-attached buyer/vendor chat for seamless evidence logging.
                </li>
              </ul>
              <div className="pt-1">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center gap-2 font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 text-xs sm:text-sm"
                >
                  Explore Marketplace Listings <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck size={18} className="text-primary-600 dark:text-primary-400 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">Marketplace Order Lifecycle</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-800 dark:text-primary-300 bg-primary-100/80 dark:bg-primary-950 px-2.5 py-1 rounded-full border border-primary-200 dark:border-primary-800 shrink-0">
                    Fiat Default
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">1. Buyer Places Order</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Payment pre-authorized via Stripe</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-semibold text-[11px] shrink-0">Authorized</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">2. Vendor Ships Item</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Tracking code uploaded to order timeline</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold text-[11px] shrink-0">Shipped</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">3. Delivery Confirmed</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Escrow releases payout to seller account</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] shrink-0">Released</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck size={14} />
                Standalone Off-Platform Escrow
              </div>
              <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
                Secure Any 3rd-Party Agreement or Contract
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                Need to hire a freelance developer, buy a domain, or execute a high-value transaction outside our marketplace? Open a standalone deal specifying custom terms and counterparties.
              </p>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <Check size={13} />
                  </span>
                  No Vendor KYC Required for counterparties — standard login only.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <Check size={13} />
                  </span>
                  Crypto-First Rail Support (USDC / USDT) & self-custody wallets.
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <Check size={13} />
                  </span>
                  Manual Buyer Release Confirmation Protocol for 100% fund safety.
                </li>
              </ul>
              <div className="pt-1">
                <Link
                  to="/escrow/new"
                  className="inline-flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 text-xs sm:text-sm"
                >
                  Create Standalone Escrow Contract <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">Standalone Contract Flow</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <Wallet size={13} /> Crypto / USDC Default
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">1. Creator Inits Deal</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Specifies amount, counterparty, & terms</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px] shrink-0">Draft</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">2. Counterparty Accepts & Funds</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Stablecoins locked into custody ledger</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-semibold text-[11px] shrink-0">Funded</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">3. Manual Release Confirmed</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Funds transferred directly to recipient wallet</p>
                    </div>
                    <span className="self-start sm:self-auto px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] shrink-0">Released</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
