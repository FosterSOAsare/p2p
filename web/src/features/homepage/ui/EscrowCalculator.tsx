import { useState } from 'react'
import { Calculator, ShieldCheck, Info } from 'lucide-react'

export function EscrowCalculator() {
  const [amount, setAmount] = useState<number>(500)
  const [rail, setRail] = useState<'fiat' | 'crypto'>('fiat')
  const [currency, setCurrency] = useState<'USD' | 'USDC' | 'USDT'>('USD')

  // Simple fee calculation logic: 1.5% for fiat, 1.0% for crypto
  const feeRate = rail === 'fiat' ? 0.015 : 0.01
  const estimatedFee = amount * feeRate
  const sellerNet = Math.max(0, amount - estimatedFee)

  return (
    <section className="relative overflow-hidden">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 lg:p-10 shadow-sm transition-colors duration-300">
        <div className="grid grid-cols-1 gap-6 lg:gap-10 lg:grid-cols-12 lg:items-center">
          {/* Info Side */}
          <div className="lg:col-span-6 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              <Calculator size={14} />
              Transparent Pricing
            </div>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
              Estimate Your Escrow Protection Fees
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
              No hidden costs or surprise hold-ups. See exactly what it costs to protect your transactions with our low, competitive fee structure across both fiat and stablecoin rails.
            </p>
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1 font-medium">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
                <span>Fiat rail: 1.5% platform escrow fee (via Stripe Connect hold).</span>
              </div>
              <div className="flex items-center gap-2">
                <Info size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />
                <span>Crypto rail: 1.0% platform escrow fee (USDC/USDT stablecoins).</span>
              </div>
            </div>
          </div>

          {/* Widget Side */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-6 shadow-sm space-y-4">
              {/* Rail Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Select Payment Rail
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRail('fiat')
                      setCurrency('USD')
                    }}
                    className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                      rail === 'fiat'
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Fiat Rail (Bank / Card)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRail('crypto')
                      setCurrency('USDC')
                    }}
                    className={`rounded-xl py-2.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                      rail === 'crypto'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Crypto Rail (Stablecoin)
                  </button>
                </div>
              </div>

              {/* Amount Input & Currency */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="escrow-amount">
                  Transaction Amount ({currency})
                </label>
                <div className="flex rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden focus-within:ring-1 focus-within:ring-primary-500">
                  <span className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center font-medium">
                    {currency === 'USD' ? '$' : ''}
                  </span>
                  <input
                    id="escrow-amount"
                    type="number"
                    min="10"
                    max="100000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs sm:text-sm focus:outline-none font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-950"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 border-l border-slate-300 dark:border-slate-800 focus:outline-none cursor-pointer"
                  >
                    {rail === 'fiat' ? (
                      <option value="USD">USD</option>
                    ) : (
                      <>
                        <option value="USDC">USDC</option>
                        <option value="USDT">USDT</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Calculation Output Box */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Gross Deal Value:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currency === 'USD' ? '$' : ''}
                    {amount.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Escrow Protection Fee ({(feeRate * 100).toFixed(1)}%):</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">
                    {currency === 'USD' ? '$' : ''}
                    {estimatedFee.toFixed(2)} {currency}
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-slate-900 dark:text-white font-bold text-xs sm:text-sm">
                  <span>Seller Net Payout:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-display">
                    {currency === 'USD' ? '$' : ''}
                    {sellerNet.toFixed(2)} {currency}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 font-medium">
                <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Protected by manual buyer receipt confirmation protocol.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
