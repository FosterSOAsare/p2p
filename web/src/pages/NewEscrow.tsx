import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, ArrowRight, User, DollarSign, FileText, LockKeyhole } from 'lucide-react'

export function NewEscrow() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [counterparty, setCounterparty] = useState('')
  const [amount, setAmount] = useState<number>(1000)
  const [currency, setCurrency] = useState<'USD' | 'USDC' | 'USDT'>('USDC')
  const [rail, setRail] = useState<'crypto' | 'fiat'>('crypto')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !counterparty || !amount) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/escrow/deal-801')
    }, 700)
  }

  const feePercentage = rail === 'crypto' ? 0.01 : 0.015
  const calculatedFee = (amount * feePercentage).toFixed(2)
  const netPayout = (amount - amount * feePercentage).toFixed(2)

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/escrow"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Escrow Deals
        </Link>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          <ShieldCheck size={14} />
          Standalone Off-Platform Contract
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Start a Standalone Escrow Deal
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Lock funds securely for freelance work, domain transfers, or off-market sales. Escrow funds release only upon manual buyer confirmation.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-xl space-y-5 sm:space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Deal Title */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-title">
              Contract Title
            </label>
            <div className="relative">
              <FileText size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="deal-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Custom UI Design & Component Library"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Counterparty Username */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-counterparty">
              Counterparty Username
            </label>
            <div className="relative">
              <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="deal-counterparty"
                type="text"
                required
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="ama_design or recipient_username"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400">The recipient account who must accept contract terms.</p>
          </div>

          {/* Rail & Currency Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Payment Rail</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRail('crypto')
                    setCurrency('USDC')
                  }}
                  className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                    rail === 'crypto'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Crypto (Web3)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRail('fiat')
                    setCurrency('USD')
                  }}
                  className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                    rail === 'fiat'
                      ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                      : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  Fiat (Stripe)
                </button>
              </div>
            </div>

            {/* Currency Select & Amount */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-amount">
                Amount ({currency})
              </label>
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 flex items-center font-medium">
                  <DollarSign size={14} />
                </span>
                <input
                  id="deal-amount"
                  type="number"
                  required
                  min="10"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold border-l border-slate-200 dark:border-slate-800 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
                >
                  {rail === 'crypto' ? (
                    <>
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                    </>
                  ) : (
                    <option value="USD">USD</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Protocol Badge Info */}
          <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <LockKeyhole size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              Release Protocol: Manual Confirmation
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-white/80 dark:bg-slate-900 px-2 py-0.5 rounded-md font-medium border border-emerald-200 dark:border-emerald-800 shrink-0">
              Buyer Controlled
            </span>
          </div>

          {/* Contract Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-desc">
              Contract Deliverables & Terms
            </label>
            <textarea
              id="deal-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe expected deliverables, quality standards, and scope..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Fee preview card */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3.5 sm:p-4 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Platform Fee ({rail === 'crypto' ? '1.0%' : '1.5%'}):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">${calculatedFee} {currency}</span>
            </div>
            <div className="flex justify-between font-bold text-xs sm:text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Net Recipient Payout:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-display">${netPayout} {currency}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating Contract...' : 'Create & Initiate Escrow Deal'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
