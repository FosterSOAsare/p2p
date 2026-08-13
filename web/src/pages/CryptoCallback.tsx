import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft, Coins } from 'lucide-react'
import { apiErrorMessage } from '../features/shared/libs/api'
import { useCheckCryptoDeposit, payStatusLabel, type CryptoDeposit } from '../features/escrow/data/cryptoApi'

type Phase = 'checking' | 'pending' | 'done' | 'failed'

/** How long to keep asking before handing the buyer back to the deal page. */
const POLL_MS = 5000
const MAX_ATTEMPTS = 24 // ~2 minutes

/**
 * Landing page after the NOWPayments invoice.
 *
 * Unlike the Paystack callback this settles nothing itself — the deposit is
 * confirmed by the chain, not by the buyer arriving here. All it does is ask
 * the provider on our behalf, which is what makes the flow work on a server the
 * IPN cannot reach. `NP_id` on the query string is the payment id, and the only
 * way to identify the payment before an IPN has ever landed.
 */
export function CryptoCallback() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const check = useCheckCryptoDeposit()

  const [phase, setPhase] = useState<Phase>('checking')
  const [deposit, setDeposit] = useState<CryptoDeposit | null>(null)
  const [error, setError] = useState<string | null>(null)

  const paymentId = searchParams.get('NP_id') ?? undefined

  useEffect(() => {
    if (!id) return

    // Cancellation lives in the closure, NOT in a ref guard: React's dev-mode
    // double-invoke would trip the guard on the second run while the first run
    // had already been cancelled by its own cleanup, leaving no live poll at
    // all — a spinner that never resolves. Checking a deposit is idempotent, so
    // letting the second run start fresh costs one redundant request and is the
    // only version that actually terminates.
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const poll = async () => {
      attempts += 1
      try {
        const result = await check.mutateAsync({ escrowId: id, paymentId })
        if (cancelled) return
        setDeposit(result)

        if (result.funded) {
          setPhase('done')
          // Let the confirmation land before moving on.
          timer = setTimeout(() => navigate(`/escrow/${id}`, { replace: true }), 1200)
          return
        }
        if (result.dead) {
          setPhase('failed')
          setError('That invoice is no longer payable. Open the deal to start a new one.')
          return
        }
        if (attempts >= MAX_ATTEMPTS) {
          // Still in flight. Not a failure — TRX confirmations simply take
          // longer than a buyer should stare at a spinner for.
          setPhase('pending')
          return
        }
        setPhase('checking')
        timer = setTimeout(poll, POLL_MS)
      } catch (err) {
        if (cancelled) return
        setError(apiErrorMessage(err))
        setPhase('failed')
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // `check` is a stable mutation object; re-running on it would restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, paymentId, navigate])

  if (phase === 'failed') {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <AlertTriangle size={22} />
        </span>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Deposit not confirmed</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            to="/deals"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} /> All deals
          </Link>
          <Link
            to={`/escrow/${id}`}
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            Open deal
          </Link>
        </div>
      </div>
    )
  }

  if (phase === 'pending') {
    const { label } = payStatusLabel(deposit?.payStatus ?? null)
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
          <Coins size={22} />
        </span>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Still confirming</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {label}. Tron usually settles within a minute or two — the deal page tracks it live, so you
          don't need to wait here.
        </p>
        <Link
          to={`/escrow/${id}`}
          className="inline-block rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          Open deal
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-24 text-center space-y-4">
      {phase === 'done' ? (
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2 size={22} />
        </span>
      ) : (
        <Loader2 size={30} className="mx-auto animate-spin text-primary-600 dark:text-primary-400" />
      )}
      <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
        {phase === 'done' ? 'Escrow funded' : 'Confirming your deposit…'}
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {phase === 'done'
          ? 'The seller has been notified.'
          : "Checking the Tron network — this can take a minute. Please don't close this page."}
      </p>
    </div>
  )
}
