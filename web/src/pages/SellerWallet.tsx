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
  Plus,
  Banknote,
  Coins,
  Info,
  Lock,
  Clock3,
  XCircle,
} from 'lucide-react'
import { useMe } from '../features/auth/data/authApi'
import {
  useWallet,
  useWalletTransactions,
  useWalletWithdrawals,
  useWithdraw,
  type WalletCurrency,
  type WalletTransaction,
  type Withdrawal,
} from '../features/escrow/data/walletApi'
import { useInitDeposit, pendingAction, type PayMethod } from '../features/escrow/data/paymentsApi'
import { PayMethodPicker } from '../features/escrow/ui/PayMethodPicker'
import { formatMoney } from '../features/shared/libs/currency'
import { ConfirmDialog } from '../features/shared/ui/ConfirmDialog'
import { apiErrorMessage } from '../features/shared/libs/api'

/**
 * Everything the two renderings of a transaction need. Derived once so the
 * phone card and the desktop table can't drift on how a row reads.
 */
function txView(tx: WalletTransaction) {
  const createdAt = new Date(tx.createdAt)
  return {
    isCredit: tx.amount > 0,
    label: tx.type.replace('_', ' ').toUpperCase(),
    // The note repeats the deal code, which gets its own column/line.
    note: tx.note ? tx.note.replace(/\s*\([A-Z0-9-]+\)/gi, '') : 'Wallet activity',
    when: createdAt.toLocaleString(),
  }
}

/** Per-rail copy and iconography, so the page reads as one wallet in two
 *  denominations rather than two bolted-together pages. */
const RAILS: Record<
  WalletCurrency,
  { label: string; short: string; icon: typeof Banknote; available: string; locked: string; payoutTo: string }
> = {
  GHS: {
    label: 'Cedi',
    short: 'GH₵',
    icon: Banknote,
    available: 'Cleared & ready for MoMo payout',
    locked: 'Held in active GH₵ escrow deals',
    payoutTo: 'Mobile Money',
  },
  TRX: {
    label: 'TRON',
    short: 'TRX',
    icon: Coins,
    available: 'Cleared & ready to send on-chain',
    locked: 'Held in active TRX escrow deals',
    payoutTo: 'TRX address',
  },
}

/**
 * Which balance the page is showing. The two are separate ledgers, never a
 * converted view of one another, so this switches the whole page — cards,
 * ledger and payout — rather than just reformatting the same numbers.
 */
function CurrencySwitch({
  value,
  options,
  onChange,
}: {
  value: WalletCurrency
  options: WalletCurrency[]
  onChange: (c: WalletCurrency) => void
}) {
  // Only rendered when there is a genuine choice. A TRX wallet exists only once
  // TRX has actually moved, so a fiat-only user sees no switch at all rather
  // than a second tab that would always read zero.
  if (options.length < 2) return null
  return (
    <div
      role="tablist"
      aria-label="Wallet currency"
      className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      {options.map((code) => {
        const rail = RAILS[code]
        const Icon = rail.icon
        const active = value === code
        return (
          <button
            key={code}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(code)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <Icon size={14} />
            {rail.short}
          </button>
        )
      })}
    </div>
  )
}

/**
 * A payout and where it has got to. Separate from the ledger below because a
 * `withdrawal` transaction only says the balance moved — it can't say whether
 * the money has actually left, or come back.
 */
function WithdrawalRow({ w }: { w: Withdrawal }) {
  const chip = {
    pending: {
      label: 'Awaiting review',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
      icon: Clock3,
    },
    completed: {
      label: 'Sent',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected — refunded',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
      icon: XCircle,
    },
  }[w.status]
  const Icon = chip.icon

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
          {formatMoney(w.amount, w.currency)}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.className}`}
        >
          <Icon size={11} /> {chip.label}
        </span>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all">
        To <span className="font-mono">{w.destination}</span>
      </p>

      {w.reviewNote && (
        <p className="rounded-lg bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          {w.reviewNote}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
        <span className="font-mono">{w.reference}</span>
        <span className="ml-auto">{new Date(w.createdAt).toLocaleString()}</span>
      </div>
    </div>
  )
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

/**
 * The phone rendering of a ledger row. Six columns behind a horizontal
 * scrollbar isn't a table anyone reads on a 390px screen, so the same fields
 * are stacked: what and how much on top, why in the middle, when and against
 * which deal underneath.
 */
function TransactionCard({ tx, currency }: { tx: WalletTransaction; currency: WalletCurrency }) {
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
          {formatMoney(tx.amount, currency)}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 line-clamp-2">{v.note}</p>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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

  // Which ledger the page is showing. Everything below — cards, history,
  // payout — reads from this rather than rendering both rails at once.
  const [currency, setCurrency] = useState<WalletCurrency>('GHS')
  const [page, setPage] = useState(1)
  const txQuery = useWalletTransactions(`page=${page}&limit=10&currency=${currency}`)
  // Only what is still in flight. A settled payout already appears in the
  // ledger below as a `withdrawal` row, so listing it here too would state the
  // same fact twice — this section exists to answer "where has my money got to",
  // and once it's sent there is nothing left to answer.
  const withdrawalsQuery = useWalletWithdrawals(`page=1&limit=10&status=pending&currency=${currency}`)

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
  /** Payout awaiting its confirmation dialog, after the form validated. */
  const [confirmPayout, setConfirmPayout] = useState(false)

  const switchCurrency = (next: WalletCurrency) => {
    setCurrency(next)
    // Page 3 of the cedi ledger is meaningless in the TRX one, and a payout
    // receipt for one rail shouldn't hang over the other.
    setPage(1)
    setWithdrawSuccess(null)
    setWithdrawDestination('')
    setWithdrawAmount('')
  }

  if (meLoading || walletLoading) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={28} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      </div>
    )
  }

  if (!me) return <Navigate to="/login" replace />

  const isSeller = me.role === 'admin' || me.kycStatus === 'verified'

  // The wallets the user actually holds. GHS is always there; TRX appears only
  // once TRX has moved, so the switch has something to switch between only then.
  const held = wallet?.wallets ?? []
  const currencies = held.map((w) => w.currency)
  // Falls back to zeroes so a rail the user doesn't hold still reads as an
  // empty wallet rather than a spinner or a blank.
  const active = held.find((w) => w.currency === currency)
  const rail = RAILS[currency]
  const balance = active?.balance ?? 0
  const escrowLocked = active?.escrowLocked ?? 0
  // Top-ups are a fiat concept: TRX reaches a deal through its own invoice, so
  // there is no hosted "add TRX to wallet" page to send anyone to.
  const canTopUp = currency === 'GHS'

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
      setWithdrawError(`Insufficient cleared balance. Maximum available: ${formatMoney(balance, currency)}`)
      return
    }
    if (!withdrawDestination.trim()) {
      setWithdrawError(`Please provide a ${rail.payoutTo} for payout.`)
      return
    }

    /*
      Validated — now confirm. `runWithdraw` below is the only path to the
      mutation, so submitting the form can never move money by itself.
    */
    setConfirmPayout(true)
  }

  /** The payout itself. Reached only from the confirmation dialog. */
  const runWithdraw = () => {
    const numAmount = parseFloat(withdrawAmount)
    withdrawMutation.mutate(
      { amount: numAmount, destination: withdrawDestination.trim(), currency },
      {
        onSuccess: () => {
          // Not "paid out": the balance has moved but an admin still has to
          // send it, and a later rejection would make "paid out" a lie.
          setWithdrawSuccess(
            `${formatMoney(numAmount, currency)} to ${withdrawDestination} is awaiting review — you'll be notified once it's sent.`,
          )
          setWithdrawAmount('')
          setWithdrawDestination('')
          // Close the modal — the confirmation is shown on the page behind it,
          // so the payout result stays visible next to the updated balance.
          setWithdrawModalOpen(false)
          setConfirmPayout(false)
          txQuery.refetch()
          refetchWallet()
        },
        onError: (err) => {
          setWithdrawError(apiErrorMessage(err))
          setConfirmPayout(false)
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
              <ShieldCheck size={14} /> VeriTrust Escrow Settle Rail • {rail.short}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isSeller ? 'Seller Payout Wallet' : 'My Wallet'}
            </h1>
            {/* Deliberately not "earnings": this page is open to every
                non-admin account, and a buyer's balance is top-ups and escrow
                refunds, not sales. Anyone with a balance can withdraw it. */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              Withdraw your available balance to your {rail.payoutTo}, or review what's still held in escrow.
            </p>
          </div>

          <CurrencySwitch value={currency} options={currencies} onChange={switchCurrency} />
        </div>

        {/* One number carries this page, so it is sized like it. Escrow-locked
            is context for it, not a peer, and sits underneath as a strip —
            which is also what keeps the layout honest now that the clearance
            hold is gone and there are only two figures to show. */}
        <div
          key={currency}
          className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4 animate-fade-in"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-0.5">
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                Available balance
              </span>
              <span className="block font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatMoney(balance, currency)}
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{rail.available}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Adding funds is what makes escrow deals fundable — without it the
                  only way money reaches a wallet is a marketplace checkout. */}
              {canTopUp && (
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
              )}
              {/* Nothing to withdraw is a disabled button, not a modal that
                  opens only to reject you. */}
              <button
                onClick={() => {
                  setWithdrawError(null)
                  setWithdrawSuccess(null)
                  setWithdrawModalOpen(true)
                }}
                disabled={balance <= 0}
                title={balance <= 0 ? 'No cleared balance to withdraw yet' : undefined}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 dark:bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-bold text-white dark:text-slate-950 shadow-lg shadow-emerald-500/20 transition-all enabled:hover:bg-emerald-700 dark:enabled:hover:bg-emerald-400 enabled:cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
              >
                <ArrowUpRight size={18} /> Withdraw
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-slate-200 bg-white/70 px-3.5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
            <Lock size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium text-slate-500 dark:text-slate-400">Escrow-locked</span>
            <span className="font-display font-bold text-slate-900 dark:text-white">
              {formatMoney(escrowLocked, currency)}
            </span>
            <span className="text-[11px] text-slate-400">· {rail.locked}</span>
          </div>

          {/* Why there's no Add Funds on this rail. Without this the button simply
              vanishing on TRX reads as a bug. */}
          {!canTopUp && (
            <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white/70 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                TRX isn't topped up here — each crypto deal opens its own invoice, and the deposit lands in this
                balance when it confirms. Released and refunded TRX collects here too.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pending payouts only — a settled one drops off and lives in the ledger.
          Hidden when the list has genuinely loaded and is empty, but NOT when the
          request failed: a failure must not look the same as "nothing pending". */}
      {(withdrawalsQuery.isError || (withdrawalsQuery.data?.withdrawals.length ?? 0) > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock3 size={18} className="text-amber-500" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Pending payouts
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {rail.short}
            </span>
          </div>

          {withdrawalsQuery.isError ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300">
              Couldn't load your pending payouts — {apiErrorMessage(withdrawalsQuery.error)}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already deducted from your balance and waiting to be sent. Once sent, a payout moves to
                your transaction history below.
              </p>
              <div className="space-y-2">
                {withdrawalsQuery.data?.withdrawals.map((w) => (
                  <WithdrawalRow key={w.id} w={w} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Transaction History
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {rail.short}
            </span>
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
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No {rail.short} transactions yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {currency === 'GHS'
                ? 'Deposits, escrow funding, sales payouts and withdrawals will appear here.'
                : 'Confirmed TRX deposits, escrow funding and released payouts will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Cards on a phone, the ledger table from `md` up. */}
            <div className="space-y-2 md:hidden">
              {txQuery.data?.transactions.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} currency={currency} />
              ))}
            </div>

            <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
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
                            {formatMoney(tx.amount, currency)}
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
                  Withdraw to {rail.payoutTo}
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
                  Withdrawal Amount ({rail.short})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">{rail.short}</span>
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
                <p className="text-[11px] text-slate-400 mt-1">
                  Cleared available balance: {formatMoney(balance, currency)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {currency === 'GHS' ? 'Mobile Money Number' : 'TRON (TRX) Address'}
                </label>
                <input
                  type="text"
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder={currency === 'GHS' ? 'e.g. 0241234567' : 'e.g. TYGRPm5y9j9tKCxGkxawyaR3Cs698RaeTP'}
                  required
                  className={`w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    currency === 'TRX' ? 'font-mono' : ''
                  }`}
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

      {/*
        Payout confirmation. Rendered after the withdraw modal so it layers on
        top; cancelling leaves that modal open with the amount and destination
        still filled in, so backing out costs nothing but a click.
      */}
      <ConfirmDialog
        open={confirmPayout}
        tone="danger"
        title="Send this payout?"
        description={`${formatMoney(parseFloat(withdrawAmount) || 0, currency)} to ${withdrawDestination.trim()}.`}
        consequence={
          currency === 'TRX'
            ? 'On-chain transfers cannot be reversed. Check the address one more time.'
            : 'Payouts cannot be reversed once sent. Check the number one more time.'
        }
        confirmLabel="Send Payout"
        cancelLabel="Go back"
        isPending={withdrawMutation.isPending}
        onCancel={() => setConfirmPayout(false)}
        onConfirm={runWithdraw}
      />
    </div>
  )
}
