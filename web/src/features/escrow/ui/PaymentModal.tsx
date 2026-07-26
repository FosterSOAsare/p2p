import { useEffect, useMemo, useState } from 'react'
import { X, Wallet, Smartphone, CreditCard, Loader2, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react'
import { formatMoney } from '../../shared/libs/currency'
import type { PayMethod } from '../data/paymentsApi'

interface PaymentModalProps {
  open: boolean
  /** Total the buyer must fund (item + their half of the escrow fee). */
  total: number
  /** Spendable wallet balance (already cleared). */
  balance: number
  isPending?: boolean
  errorMessage?: string | null
  onClose: () => void
  /** walletAmount covers the whole total — no provider step needed. */
  onPayFromWallet: (walletAmount: number) => void
  /** Pay `walletAmount` from balance and the rest on the hosted page. */
  onPayWithProvider: (walletAmount: number, method: PayMethod) => void
}

const METHODS: { id: PayMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { id: 'momo', label: 'Mobile Money', hint: 'MTN · Telecel · AirtelTigo', icon: Smartphone },
  { id: 'card', label: 'Card', hint: 'Visa · Mastercard', icon: CreditCard },
]

/** Round to pesewas so on-screen math always matches what the server charges. */
const round2 = (n: number) => Math.round(n * 100) / 100

export function PaymentModal({
  open,
  total,
  balance,
  isPending = false,
  errorMessage,
  onClose,
  onPayFromWallet,
  onPayWithProvider,
}: PaymentModalProps) {
  const hasBalance = balance > 0
  const maxFromWallet = round2(Math.min(balance, total))

  const [useWallet, setUseWallet] = useState(hasBalance)
  // Kept as a string so the field can be cleared/typed in freely.
  const [walletInput, setWalletInput] = useState(String(maxFromWallet))
  const [method, setMethod] = useState<PayMethod>('momo')

  // Reset each time the sheet opens so a retry never inherits stale numbers.
  useEffect(() => {
    if (open) {
      setUseWallet(hasBalance)
      setWalletInput(String(maxFromWallet))
      setMethod('momo')
    }
  }, [open, hasBalance, maxFromWallet])

  const walletAmount = useMemo(() => {
    if (!useWallet) return 0
    const parsed = Number.parseFloat(walletInput)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return round2(Math.min(parsed, maxFromWallet))
  }, [useWallet, walletInput, maxFromWallet])

  const remaining = round2(Math.max(0, total - walletAmount))
  const coveredByWallet = remaining === 0
  const overTyped = Number.parseFloat(walletInput) > maxFromWallet

  if (!open) return null

  const submit = () => {
    if (isPending) return
    if (coveredByWallet) onPayFromWallet(walletAmount)
    else onPayWithProvider(walletAmount, method)
  }

  const methodLabel = METHODS.find((m) => m.id === method)!.label

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 animate-fade-in"
      onClick={isPending ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Complete payment"
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Complete payment</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Held safely in escrow until you confirm delivery.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount due */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total due
            </div>
            <div className="font-display text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {formatMoney(total)}
            </div>
          </div>

          {/* Wallet balance */}
          {hasBalance && (
            <div
              className={`rounded-2xl border p-4 transition-all ${
                useWallet
                  ? 'border-primary-500 bg-primary-50/40 dark:bg-primary-950/30 ring-1 ring-primary-500'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400">
                  <Wallet size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Use wallet balance</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    {formatMoney(balance)} available
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => {
                    setUseWallet(e.target.checked)
                    if (e.target.checked) setWalletInput(String(maxFromWallet))
                  }}
                  disabled={isPending}
                  className="h-4 w-4 shrink-0 accent-primary-600 cursor-pointer"
                />
              </label>

              {useWallet && (
                <div className="mt-3 space-y-1.5">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      GH₵
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={maxFromWallet}
                      step="0.01"
                      value={walletInput}
                      onChange={(e) => setWalletInput(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-12 pr-20 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setWalletInput(String(maxFromWallet))}
                      disabled={isPending}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950 cursor-pointer disabled:opacity-50"
                    >
                      Use max
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    {overTyped
                      ? `Capped at ${formatMoney(maxFromWallet)} for this order.`
                      : `Up to ${formatMoney(maxFromWallet)} can go toward this order.`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Live split */}
          {walletAmount > 0 && (
            <div className="space-y-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>From wallet</span>
                <span className="font-semibold text-slate-900 dark:text-white">−{formatMoney(walletAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5">
                <span className="font-bold text-slate-900 dark:text-white">Left to pay</span>
                <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {formatMoney(remaining)}
                </span>
              </div>
            </div>
          )}

          {/* Method — only when there's a balance left to cover */}
          {!coveredByWallet && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pay {formatMoney(remaining)} with
              </div>
              {METHODS.map(({ id, label, hint, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer disabled:opacity-50 ${
                    method === id
                      ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/40 ring-1 ring-primary-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={19} className="shrink-0 text-primary-600 dark:text-primary-400" />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{label}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
                  </span>
                  {method === id && (
                    <CheckCircle2 size={16} className="shrink-0 text-primary-600 dark:text-primary-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          <button
            onClick={submit}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : coveredByWallet ? (
              <Wallet size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            {isPending
              ? 'Processing…'
              : coveredByWallet
                ? `Pay ${formatMoney(total)} from wallet`
                : `Continue to ${methodLabel}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500">
            <ShieldCheck size={12} className="shrink-0" />
            Secured payment · Funds released only when you confirm
          </p>
        </div>
      </div>
    </div>
  )
}
