import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
  Clock,
  Plus,
} from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import {
  useWallet,
  useWalletTransactions,
  useWithdraw,
  type WalletTransaction,
} from '../features/escrow/data/walletApi'
import { useInitDeposit, pendingAction, type PayMethod } from '../features/escrow/data/paymentsApi'
import { PayMethodPicker } from '../features/escrow/ui/PayMethodPicker'
import { formatMoney } from '../features/shared/libs/currency'
import { apiErrorMessage } from '../features/shared/libs/api'

/**
 * Everything the two renderings of a transaction need. Derived once so the
 * phone card and the desktop table can't drift on what "cleared" means.
 */
function txView(tx: WalletTransaction) {
  const createdAt = new Date(tx.createdAt)
  const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
  return {
    isCredit: tx.amount > 0,
    // A payout is spendable a day after release; until then it's on the clock.
    isRelease: tx.type === 'escrow_release',
    isPendingClearance: tx.type === 'escrow_release' && ageInHours < 24,
    hoursRemaining: Math.max(1, Math.ceil(24 - ageInHours)),
    label: tx.type.replace('_', ' ').toUpperCase(),
    // The note repeats the deal code, which gets its own column/line.
    note: tx.note ? tx.note.replace(/\s*\([A-Z0-9-]+\)/gi, '') : 'Wallet activity',
    when: createdAt.toLocaleString(),
  }
}

function TypeChip({ isCredit, label }: { isCredit: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        isCredit
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
      }`}
    >
      {isCredit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
      {label}
    </span>
  )
}

function ClearanceChip({ tx }: { tx: WalletTransaction }) {
  const v = txView(tx)
  if (!v.isRelease) return <span className="text-[10px] text-slate-400">Settled</span>
  return v.isPendingClearance ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
      <Clock size={10} /> Clears in ~{v.hoursRemaining}h
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
      <CheckCircle2 size={10} /> Cleared
    </span>
  )
}

/**
 * The phone rendering of a ledger row. Six columns behind a horizontal
 * scrollbar isn't a table anyone reads on a 390px screen, so the same fields
 * are stacked: what and how much on top, why in the middle, when and against
 * which deal underneath.
 */
function TransactionCard({ tx }: { tx: WalletTransaction }) {
  const v = txView(tx)
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <TypeChip isCredit={v.isCredit} label={v.label} />
        <span
          className={`shrink-0 font-display text-sm font-bold ${
            v.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
          }`}
        >
          {v.isCredit ? '+' : ''}
          {formatMoney(tx.amount)}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">{v.note}</p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ClearanceChip tx={tx} />
        {tx.escrow && (
          <Link
            to={`/escrow/${tx.escrow.id}`}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
          >
            {tx.escrow.code || tx.escrow.id.slice(0, 8)} <ExternalLink size={10} />
          </Link>
        )}
        <span className="ml-auto text-[10px] text-slate-400">{v.when}</span>
      </div>
    </div>
  )
}

export function SellerWallet() {
  const { data: me, isLoading: meLoading } = useMe()
  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useWallet()

  const [page, setPage] = useState(1)
  const txQuery = useWalletTransactions(`page=${page}&limit=10`)

  const withdrawMutation = useWithdraw()
  const initDeposit = useInitDeposit()

  const [topUpModalOpen, setTopUpModalOpen] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [topUpMethod, setTopUpMethod] = useState<PayMethod>('momo')
  const [topUpError, setTopUpError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawDestination, setWithdrawDestination] = useState(me?.phone || '')
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null)
  const [withdrawError, setWithdrawError] = useState<string | null>(null)

  if (meLoading || walletLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />

  const isSeller = me.role === 'admin' || me.kycStatus === 'verified'

  const balance = wallet?.balance ?? 0
  const pendingClearance = wallet?.pendingClearance ?? 0
  const escrowLocked = wallet?.escrowLocked ?? 0

  /**
   * Top up via the hosted provider page. Nothing is credited here — the wallet
   * moves only once the charge is confirmed, which the callback route does on
   * the way back (or the webhook does if the buyer never returns).
   */
  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault()
    setTopUpError(null)

    const amount = parseFloat(topUpAmount)
    if (isNaN(amount) || amount <= 0) {
      setTopUpError('Enter a valid amount to add.')
      return
    }

    setRedirecting(true)
    initDeposit.mutate(
      { amount, method: topUpMethod },
      {
        onSuccess: ({ authorizationUrl, reference }) => {
          pendingAction.save({ kind: 'topup', reference, returnTo: '/wallet' })
          window.location.href = authorizationUrl
        },
        onError: (err) => {
          setRedirecting(false)
          setTopUpError(apiErrorMessage(err))
        },
      },
    )
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    setWithdrawError(null)
    setWithdrawSuccess(null)

    const numAmount = parseFloat(withdrawAmount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setWithdrawError('Please enter a valid positive withdrawal amount.')
      return
    }
    if (numAmount > balance) {
      setWithdrawError(`Insufficient cleared balance. Maximum available: ${formatMoney(balance)}`)
      return
    }
    if (!withdrawDestination.trim()) {
      setWithdrawError('Please provide a Mobile Money phone number for payout.')
      return
    }

    withdrawMutation.mutate(
      { amount: numAmount, destination: withdrawDestination.trim() },
      {
        onSuccess: () => {
          setWithdrawSuccess(`Successfully paid out ${formatMoney(numAmount)} to ${withdrawDestination}!`)
          setWithdrawAmount('')
          setWithdrawDestination('')
          // Close the modal — the confirmation is shown on the page behind it,
          // so the payout result stays visible next to the updated balance.
          setWithdrawModalOpen(false)
          txQuery.refetch()
          refetchWallet()
        },
        onError: (err) => {
          setWithdrawError(apiErrorMessage(err))
        },
      }
    )
  }

  return (
    <div className="py-4 sm:py-6 space-y-5 sm:space-y-8">
      {/* Payout confirmation — shown here once the modal closes */}
      {withdrawSuccess && !withdrawModalOpen && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span className="flex-1">{withdrawSuccess}</span>
          <button
            onClick={() => setWithdrawSuccess(null)}
            aria-label="Dismiss"
            className="shrink-0 text-emerald-600/70 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-slate-900 p-2 sm:p-8 text-slate-900 dark:text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={14} /> P2P Escrow Settle Rail • GH₵
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isSeller ? 'Seller Payout Wallet' : 'My P2P Wallet'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Withdraw cleared sales earnings directly to your Mobile Money account or view pending deal clearances.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Adding funds is what makes escrow deals fundable — without it the
                only way money reaches a wallet is a marketplace checkout. */}
            <button
              onClick={() => {
                setTopUpError(null)
                setTopUpAmount('')
                setTopUpModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer"
            >
              <Plus size={18} /> Add Funds
            </button>
            <button
              onClick={() => {
                setWithdrawError(null)
                setWithdrawSuccess(null)
                setWithdrawModalOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-bold text-white dark:text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 dark:hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <ArrowUpRight size={18} /> Withdraw Payout
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium block">Available Balance</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-sky-600 dark:text-sky-400 block">
              {formatMoney(balance)}
            </span>
            <span className="text-[11px] text-slate-400">Cleared & ready for MoMo payout</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Pending Clearance (24h Hold)</span>
              <Clock size={14} className="text-amber-500" />
            </div>
            <span className="font-display text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 block">
              {formatMoney(pendingClearance)}
            </span>
            <span className="text-[11px] text-slate-400">Released by buyer — clears in 24h if no dispute</span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 font-medium block">Escrow-Locked Funds</span>
            <span className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 block">
              {formatMoney(escrowLocked)}
            </span>
            <span className="text-[11px] text-slate-400">Held in active buyer escrow deals</span>
          </div>
        </div>
      </div>

      {/* Security Holding Period Info Card */}
      <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2 sm:p-4 text-slate-800 dark:text-amber-200 text-xs flex items-start gap-3">
        <Clock size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 dark:text-white">24-Hour Safety Holding Period</h4>
          <p className="text-slate-600 dark:text-amber-300/80 leading-relaxed">
            To protect buyers and sellers against fraud, funds released by the buyer enter a 24-hour holding security clearance before transitioning to your liquid Available Payout Balance. Provided no dispute is filed during this window, funds settle automatically.
          </p>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Transaction History
            </h2>
          </div>

          <button
            onClick={() => txQuery.refetch()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw size={14} className={txQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {txQuery.isLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        ) : txQuery.isError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
            {apiErrorMessage(txQuery.error)}
          </div>
        ) : (txQuery.data?.transactions ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-8 text-center space-y-2">
            <WalletIcon size={32} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No transactions recorded yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Completed sales payouts and mobile money withdrawal records will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cards on a phone, the ledger table from `md` up. */}
            <div className="space-y-2 md:hidden">
              {txQuery.data?.transactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} />
              ))}
            </div>

            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Status / Clearance</th>
                      <th className="px-3 py-2 font-semibold">Description / Note</th>
                      <th className="px-3 py-2 font-semibold">Deal Reference</th>
                      <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      <th className="px-3 py-2 font-semibold text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {txQuery.data?.transactions.map((tx) => {
                      const v = txView(tx)

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 font-semibold">
                            <TypeChip isCredit={v.isCredit} label={v.label} />
                          </td>

                          <td className="px-3 py-2 font-semibold">
                            <ClearanceChip tx={tx} />
                          </td>

                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300 text-[11px] truncate max-w-xs">
                            {v.note}
                          </td>

                          <td className="px-3 py-2 text-[11px]">
                            {tx.escrow ? (
                              <Link
                                to={`/escrow/${tx.escrow.id}`}
                                className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                              >
                                {tx.escrow.code || tx.escrow.id.slice(0, 8)} <ExternalLink size={11} />
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td
                            className={`px-3 py-2 text-right font-display text-[11px] font-bold ${
                              v.isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {v.isCredit ? '+' : ''}
                            {formatMoney(tx.amount)}
                          </td>

                          <td className="px-3 py-2 text-right text-slate-400 text-[10px]">{v.when}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {txQuery.data && txQuery.data.pages > 1 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <span>
                  Page <strong>{txQuery.data.page}</strong> of <strong>{txQuery.data.pages}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(txQuery.data.pages, p + 1))}
                    disabled={page === txQuery.data.pages}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {topUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                  <Plus size={18} />
                </div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">Add Funds</h3>
              </div>
              <button
                onClick={() => setTopUpModalOpen(false)}
                disabled={redirecting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {topUpError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{topUpError}</span>
              </div>
            )}

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount to Add (GH₵)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">GH₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    disabled={redirecting}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-12 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Funds land in your wallet and can be used to fund any escrow deal.
                </p>
              </div>

              <PayMethodPicker
                value={topUpMethod}
                onChange={setTopUpMethod}
                disabled={redirecting}
                heading="Pay with"
              />

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalOpen(false)}
                  disabled={redirecting}
                  className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={redirecting || initDeposit.isPending}
                  className="w-1/2 rounded-xl bg-primary-600 py-2.5 text-xs font-bold text-white hover:bg-primary-700 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {redirecting || initDeposit.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ArrowDownLeft size={15} />
                  )}
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={18} />
                </div>
                <h3 className="font-display font-bold text-slate-900 dark:text-white text-base">
                  Withdraw to Mobile Money
                </h3>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {withdrawError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Withdrawal Amount (GH₵)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">GH₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-12 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Cleared available balance: {formatMoney(balance)}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Money Number
                </label>
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder="e.g. 0241234567"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-300 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  className="w-1/2 rounded-xl bg-emerald-600 dark:bg-emerald-500 py-2.5 text-xs font-bold text-white dark:text-slate-950 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {withdrawMutation.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
