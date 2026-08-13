import { Coins, ExternalLink, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { payStatusLabel, type CryptoDeposit } from '../data/cryptoApi'

interface CryptoDepositPanelProps {
  deposit: CryptoDeposit
  /** Asking the provider for the authoritative status right now. */
  isChecking?: boolean
  /** Opening a replacement invoice for a dead one. */
  isReopening?: boolean
  errorMessage?: string | null
  onCheck: () => void
  onReopen: () => void
}

const TONE = {
  good: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40',
  bad: 'border-rose-200 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/40',
  pending: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/40',
} as const

const ICON_TONE = {
  good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  bad: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
} as const

/** TRX to 6dp, trailing zeros trimmed — the precision the chain actually uses. */
const trx = (n: number, unit: string) => `${Number(n.toFixed(6))} ${unit.toUpperCase()}`

/**
 * Live state of a TRX deposit, shown on the deal page once an invoice is open.
 *
 * The buyer pays on the provider's page, so this is a watcher, not a form: it
 * says what is owed, what has arrived, and where the transfer is. The one
 * button that matters is "check now" — the escape hatch for a server the
 * provider's callback cannot reach.
 */
export function CryptoDepositPanel({
  deposit,
  isChecking = false,
  isReopening = false,
  errorMessage,
  onCheck,
  onReopen,
}: CryptoDepositPanelProps) {
  const [copied, setCopied] = useState(false)
  const { label, tone } = deposit.funded
    ? ({ label: 'Deposit received — deal funded', tone: 'good' } as const)
    : payStatusLabel(deposit.payStatus)

  const copyAddress = () => {
    if (!deposit.depositAddress) return
    navigator.clipboard.writeText(deposit.depositAddress).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {
        /* clipboard blocked — the address is on screen to copy by hand */
      },
    )
  }

  const shortfall = Math.max(0, deposit.expected - deposit.received)

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${TONE[tone]}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>
          {tone === 'good' ? <CheckCircle2 size={17} /> : tone === 'bad' ? <AlertTriangle size={17} /> : <Coins size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{label}</h4>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            {deposit.funded
              ? `${trx(deposit.received, deposit.payCurrency)} received and held in escrow.`
              : deposit.dead
                ? 'This invoice is no longer payable. Open a new one to try again.'
                : deposit.payStatus === 'partially_paid'
                  ? `Short by ${trx(shortfall, deposit.payCurrency)}. Send the balance, or contact support to sort it out.`
                  : `Send ${trx(deposit.expected, deposit.payCurrency)} on the invoice page. This updates by itself once the network confirms it.`}
          </p>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/60">
          <div className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Due</div>
          <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {trx(deposit.expected, deposit.payCurrency)}
          </div>
        </div>
        <div className="rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-900/60">
          <div className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Received</div>
          <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {trx(deposit.received, deposit.payCurrency)}
          </div>
        </div>
      </div>

      {/* Deposit address — only exists once the buyer has picked a coin. */}
      {deposit.depositAddress && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Deposit address
          </div>
          <button
            onClick={copyAddress}
            className="flex w-full items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-left text-[11px] font-mono text-slate-700 hover:bg-white dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900 cursor-pointer transition-colors"
          >
            <span className="min-w-0 flex-1 truncate">{deposit.depositAddress}</span>
            {copied ? (
              <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy size={13} className="shrink-0 text-slate-400" />
            )}
          </button>
        </div>
      )}

      {deposit.explorerUrl && (
        <a
          href={deposit.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          <ExternalLink size={12} /> View transaction on Tronscan
        </a>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {!deposit.funded && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {deposit.dead ? (
            <button
              onClick={onReopen}
              disabled={isReopening}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50"
            >
              {isReopening ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />} New invoice
            </button>
          ) : (
            deposit.invoiceUrl && (
              <a
                href={deposit.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 py-2.5 text-xs font-bold text-white hover:bg-primary-700 transition-all"
              >
                <ExternalLink size={14} /> Open invoice
              </a>
            )
          )}
          <button
            onClick={onCheck}
            disabled={isChecking}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            {isChecking ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} I've paid
          </button>
        </div>
      )}
    </div>
  )
}
