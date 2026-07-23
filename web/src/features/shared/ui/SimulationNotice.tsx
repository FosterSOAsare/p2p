import { FlaskConical } from 'lucide-react'

export function SimulationNotice({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 ${className}`}
    >
      <FlaskConical size={13} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" />
      <span>
        Academic prototype — all fiat/mobile-money payments are simulated. Only TRON testnet TRX moves on-chain.
      </span>
    </div>
  )
}
