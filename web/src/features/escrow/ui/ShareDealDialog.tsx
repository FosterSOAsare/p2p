import { useState } from 'react'
import { X, Loader2, Copy, Check } from 'lucide-react'
import { useShareQr } from '../data/ordersApi'
import { apiErrorMessage } from '../../shared/libs/api'

/** Share panel for a deal: scannable QR + the join link, for inviting the counterparty. */
export function ShareDealDialog({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const qrQuery = useShareQr(dealId, true)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!qrQuery.data) return
    try {
      await navigator.clipboard.writeText(qrQuery.data.joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the link is on screen to copy manually */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share deal"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">Invite the other party</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              They scan or open the link to join this deal.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {qrQuery.isLoading ? (
          <div className="py-12 text-center">
            <Loader2 size={24} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
          </div>
        ) : qrQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {apiErrorMessage(qrQuery.error)}
          </div>
        ) : qrQuery.data ? (
          <>
            <div className="flex justify-center">
              <img
                src={qrQuery.data.dataUrl}
                alt={`QR code for deal ${qrQuery.data.code}`}
                className="h-48 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-2"
              />
            </div>

            <div className="text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Deal code
              </span>
              <p className="font-display text-xl font-bold tracking-widest text-slate-900 dark:text-white">
                {qrQuery.data.code}
              </p>
            </div>

            <button
              onClick={copy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? 'Link copied' : 'Copy invite link'}
            </button>
            <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 break-all">
              {qrQuery.data.joinUrl}
            </p>
          </>
        ) : null}
      </div>
    </div>
  )
}
