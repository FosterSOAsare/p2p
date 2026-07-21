import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Store,
  User,
  Building,
  FileCheck,
  CreditCard,
  Wallet,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  AlertCircle,
} from 'lucide-react'

export function VendorKyc() {
  const navigate = useNavigate()

  // Prefilled mock data for instant vendor application
  const [legalName, setLegalName] = useState('Kwaku Bonsu')
  const [storeName, setStoreName] = useState('TechHub Ghana Electronics')
  const [taxId, setTaxId] = useState('GH-TAX-99201948')
  const [country, setCountry] = useState('Ghana')
  const [address, setAddress] = useState('Plot 42 Independence Avenue, Accra')
  const [idType, setIdType] = useState('Passport')
  const [idNumber, setIdNumber] = useState('GHA-8829104')
  const [payoutRail, setPayoutRail] = useState<'crypto' | 'fiat'>('crypto')
  const [walletAddress, setWalletAddress] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
  const [bankAccount, setBankAccount] = useState('GTBank • Account ending in 4920')

  const [idUploaded, setIdUploaded] = useState(true) // prefilled mock attachment
  const [proofUploaded, setProofUploaded] = useState(true) // prefilled mock attachment
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 900)
  }

  return (
    <div className="mx-auto max-w-3xl py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <Link
        to="/user/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Buyer Dashboard
      </Link>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
          <Store size={14} />
          Vendor Onboarding & KYC Application
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Become a Verified Vendor
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Upgrade your buyer account to start listing physical goods on P2P Trust Market. Identity verification ensures 100% buyer trust.
        </p>
      </div>

      {submitted ? (
        /* Application Submitted Success State */
        <div className="rounded-3xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 p-8 sm:p-10 text-center space-y-5 animate-fade-in shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              <ShieldCheck size={14} /> KYC Level 2 Approved
            </span>
            <h2 className="font-display text-2xl font-bold text-emerald-950 dark:text-white">
              Congratulations, {storeName}!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Your vendor KYC application has been verified. You can now post listings to the marketplace, manage inventory, and receive escrow payouts directly to your payout account.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition-all"
            >
              Browse Marketplace as Vendor <ArrowRight size={16} />
            </Link>
            <Link
              to="/user/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-5 py-3 text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-800"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* KYC Application Form */
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-xl space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
              <ShieldCheck size={18} className="text-primary-600 dark:text-primary-400" />
              KYC Level 2 Verification Form
            </span>
            <span className="bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-md font-bold border border-primary-200 dark:border-primary-800">
              Prefilled Demo Data
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Step 1: Business & Store Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                  1
                </span>
                Store & Legal Info
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Legal Full Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-fullname">
                    Legal Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="kyc-fullname"
                      type="text"
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Store Name */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-store">
                    Public Store / Brand Name
                  </label>
                  <div className="relative">
                    <Store size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="kyc-store"
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Registration / Tax ID */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-tax">
                    Tax ID / Business Reg Number
                  </label>
                  <div className="relative">
                    <Building size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="kyc-tax"
                      type="text"
                      required
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Operating Country */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-country">
                    Operating Country
                  </label>
                  <select
                    id="kyc-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Ghana">Ghana</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Kenya">Kenya</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-address">
                  Business Street Address
                </label>
                <input
                  id="kyc-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Step 2: Government ID & Verification Documents */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                  2
                </span>
                Government Identity Documents
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID Type */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-idtype">
                    Document Type
                  </label>
                  <select
                    id="kyc-idtype"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Passport">International Passport</option>
                    <option value="National ID">National ID Card (Ghana Card)</option>
                    <option value="Drivers License">Driver's License</option>
                  </select>
                </div>

                {/* ID Number */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-idnum">
                    Document Number
                  </label>
                  <div className="relative">
                    <FileCheck size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="kyc-idnum"
                      type="text"
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Mock Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center space-y-2">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">passport_scan_front.pdf</div>
                  <span className="inline-block text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                    ID Document Attached
                  </span>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-center space-y-2">
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">utility_bill_proof.pdf</div>
                  <span className="inline-block text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                    Proof of Address Attached
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Payout Account Setup */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold">
                  3
                </span>
                Escrow Payout Account Setup
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Preferred Payout Rail
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayoutRail('crypto')}
                    className={`rounded-xl p-3 text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      payoutRail === 'crypto'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet size={16} /> USDC / USDT Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutRail('fiat')}
                    className={`rounded-xl p-3 text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      payoutRail === 'fiat'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                        : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard size={16} /> Stripe Connect Bank
                  </button>
                </div>
              </div>

              {payoutRail === 'crypto' ? (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-wallet">
                    EVM Wallet Address (Polygon / Ethereum)
                  </label>
                  <input
                    id="kyc-wallet"
                    type="text"
                    required
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs font-mono text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="kyc-bank">
                    Bank Account Details
                  </label>
                  <input
                    id="kyc-bank"
                    type="text"
                    required
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs font-semibold text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-4 px-6 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verifying & Submitting KYC...' : 'Submit Vendor KYC Application'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
