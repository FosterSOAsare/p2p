import { Smartphone, CreditCard, CheckCircle2 } from 'lucide-react'
import type { PayMethod } from '../data/paymentsApi'

/**
 * The provider channels Paystack can charge, and the picker for them.
 *
 * Shared rather than duplicated: PaymentModal uses it to cover the shortfall on
 * a deal, and the wallet top-up uses it to choose how to add funds. Those are
 * different flows, but it's one list of methods and it should read identically
 * in both.
 */
export const PAY_METHODS: { id: PayMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { id: 'momo', label: 'Mobile Money', hint: 'MTN · Telecel · AirtelTigo', icon: Smartphone },
  { id: 'card', label: 'Card', hint: 'Visa · Mastercard', icon: CreditCard },
]

export function payMethodLabel(method: PayMethod): string {
  return PAY_METHODS.find((m) => m.id === method)!.label
}

export function PayMethodPicker({
  value,
  onChange,
  disabled = false,
  heading,
}: {
  value: PayMethod
  onChange: (method: PayMethod) => void
  disabled?: boolean
  /** Small uppercase label above the options. Omit to render just the options. */
  heading?: string
}) {
  return (
    <div className="space-y-2">
      {heading && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {heading}
        </div>
      )}
      {PAY_METHODS.map(({ id, label, hint, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          disabled={disabled}
          className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer disabled:opacity-50 ${
            value === id
              ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/40 ring-1 ring-primary-500'
              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Icon size={19} className="shrink-0 text-primary-600 dark:text-primary-400" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-900 dark:text-white">{label}</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
          </span>
          {value === id && <CheckCircle2 size={16} className="shrink-0 text-primary-600 dark:text-primary-400" />}
        </button>
      ))}
    </div>
  )
}
