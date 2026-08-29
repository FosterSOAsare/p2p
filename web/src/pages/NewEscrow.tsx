import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowLeft, ArrowRight, FileText, LockKeyhole, Loader2 } from 'lucide-react'
import { useCreateStandaloneEscrow } from '../features/escrow/data/ordersApi'
import { CounterpartyPicker } from '../features/escrow/ui/CounterpartyPicker'
import type { CounterpartyMatch } from '../features/user/data/usersApi'
import { quoteFee, type FeeSplit } from '../features/escrow/data/fees'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

export function NewEscrow() {
  const navigate = useNavigate()
  const createEscrow = useCreateStandaloneEscrow()

  const [title, setTitle] = useState('')
  /**
   * The counterparty, in two parts.
   *
   * `counterparty` is a *confirmed* account and the only thing ever sent to the
   * server. `counterpartyQuery` is the raw text in the box, kept so the three
   * states can be told apart: blank (fine — the deal goes out as an invite
   * link), confirmed, and typed-but-never-picked. Only the last is an error,
   * and it used to be one the server had to catch after the round trip.
   */
  const [counterparty, setCounterparty] = useState<CounterpartyMatch | null>(null)
  const [counterpartyQuery, setCounterpartyQuery] = useState('')
  const [amount, setAmount] = useState<number>(500)
  const [currency, setCurrency] = useState<'GHS' | 'TRX'>('GHS')
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer')
  const [feeSplit, setFeeSplit] = useState<FeeSplit>('split')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  /**
   * Text was typed into the counterparty box but no account was picked from the
   * list. Blocks submission — see the note on the state above.
   */
  const unresolvedCounterparty = !counterparty && counterpartyQuery.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim() || amount <= 0) return
    if (unresolvedCounterparty) {
      setError(
        `Pick @${counterpartyQuery.replace(/^@/, '').trim()} from the list, or clear the field to invite by link instead.`,
      )
      return
    }

    createEscrow.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        amount,
        currency,
        role,
        invitedUsername: counterparty?.username,
        feeSplit,
      },
      {
        onSuccess: (data) => {
          navigate(`/escrow/${data.deal.id}`)
        },
        onError: (err) => {
          setError(apiErrorMessage(err))
        },
      },
    )
  }

  // Mirrors the server's pesewa math (min/cap included), so the preview is the
  // charge — not a flat-percentage approximation.
  const { fee: estimatedFee, buyerTotal, sellerPayout } = quoteFee(amount, currency, feeSplit)

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-6 space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/deals"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to My Deals
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
          Lock funds securely for freelance services, direct sales, or off-market items. Funds release only upon manual buyer confirmation.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-xl space-y-5 sm:space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">My Role in this Contract</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`rounded-xl py-3 px-4 text-xs font-bold border transition-all cursor-pointer ${
                  role === 'buyer'
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                🛒 I am the Buyer
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`rounded-xl py-3 px-4 text-xs font-bold border transition-all cursor-pointer ${
                  role === 'seller'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                📦 I am the Seller
              </button>
            </div>
          </div>

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
                placeholder="e.g. Custom Web Development & Design Package"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Counterparty Username */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-counterparty">
              Counterparty Username <span className="text-slate-400 normal-case">(optional)</span>
            </label>
            <CounterpartyPicker
              value={counterparty}
              onChange={setCounterparty}
              query={counterpartyQuery}
              onQueryChange={setCounterpartyQuery}
              disabled={createEscrow.isPending}
            />
            {unresolvedCounterparty ? (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Pick an account from the list — or clear the field to invite by link.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Leave blank to generate a public invite link to share with anyone. Admins can&apos;t
                be invited.
              </p>
            )}
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-amount">
                Deal Amount
              </label>
              <input
                id="deal-amount"
                type="number"
                required
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Currency / Rail</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="GHS">GH₵ (Mobile Money / Cards)</option>
                <option value="TRX">TRX (Tron Blockchain Crypto)</option>
              </select>
            </div>
          </div>

          {/* Fee Split Option */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Escrow Fee Paid By</label>
            <select
              value={feeSplit}
              onChange={(e) => setFeeSplit(e.target.value as FeeSplit)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 py-2.5 px-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="split">Split evenly (half each)</option>
              <option value="buyer">Buyer pays the full fee</option>
              <option value="seller">Seller pays the full fee</option>
            </select>
          </div>

          {/* Contract Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400" htmlFor="deal-desc">
              Contract Terms & Deliverables
            </label>
            <textarea
              id="deal-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe expected deliverables, project scope, and release conditions..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          {/* Protocol Badge Info */}
          <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-xs text-emerald-900 dark:text-emerald-300">
            <span className="flex items-center gap-2 font-semibold">
              <LockKeyhole size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              Protection: Funds stay in escrow until buyer confirms receipt.
            </span>
          </div>

          {/* Fee preview card */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 p-3.5 sm:p-4 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Contract Base Amount:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(amount, currency)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Platform Fee (1.5%):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(estimatedFee, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs sm:text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Buyer Total Payment:</span>
              <span className="text-primary-600 dark:text-primary-400 font-display">{formatMoney(buyerTotal, currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs sm:text-sm">
              <span>Seller Net Payout:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-display">{formatMoney(sellerPayout, currency)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={createEscrow.isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {createEscrow.isPending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {createEscrow.isPending ? 'Initiating Contract...' : 'Create & Launch Escrow Deal'}
          </button>
        </form>
      </div>
    </div>
  )
}
