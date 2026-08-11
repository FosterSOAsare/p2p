import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react'
import { api, apiErrorMessage } from '../features/shared/libs/api'
import { formatMoney } from '../features/shared/libs/currency'
import { pendingAction } from '../features/escrow/data/paymentsApi'
import type { VerifyDepositResult } from '../features/escrow/data/paymentsApi'
import type { Deal, DealDetail } from '../features/escrow/data/ordersApi'
import { useQueryClient } from '@tanstack/react-query'
import { authKeys } from '../features/auth/data/authApi'

type Phase = 'confirming' | 'placing' | 'done' | 'failed'

/**
 * Landing page after the hosted payment. Confirms the payment, credits the
 * wallet, then finishes whatever the buyer was doing before the redirect —
 * placing an order, funding an existing deal, or simply topping up.
 */
export function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [phase, setPhase] = useState<Phase>('confirming')
  const [placingLabel, setPlacingLabel] = useState('Funding your escrow…')
  const [error, setError] = useState<string | null>(null)
  // Placing an order is NOT idempotent — make sure this only ever runs once
  // (React strict mode intentionally double-invokes effects in development).
  const startedRef = useRef(false)

  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? ''

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      const action = pendingAction.load()

      if (!reference) {
        setError('We could not identify this payment. If you were charged, your wallet will be credited automatically.')
        setPhase('failed')
        return
      }

      // 1. Confirm the payment and credit the wallet.
      try {
        const result = await api<VerifyDepositResult>(`/api/wallet/deposit/verify/${reference}`)
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        queryClient.invalidateQueries({ queryKey: authKeys.me })

        if (result.status !== 'success') {
          setError(
            result.status === 'failed' || result.status === 'abandoned'
              ? 'That payment did not go through. Nothing was charged — you can try again.'
              : 'This payment is still processing. Check your wallet in a moment.',
          )
          setPhase('failed')
          pendingAction.clear()
          return
        }
      } catch (err) {
        setError(apiErrorMessage(err))
        setPhase('failed')
        return
      }

      // 2. The money is in the wallet. Finish what it was meant for.
      if (!action || action.kind === 'topup') {
        setPhase('done')
        const to = action?.returnTo ?? '/wallet'
        pendingAction.clear()
        setTimeout(() => navigate(to, { replace: true }), 900)
        return
      }

      setPlacingLabel(action.kind === 'promotion' ? 'Activating your spotlight…' : 'Funding your escrow…')
      setPhase('placing')
      try {
        if (action.kind === 'fund') {
          // The deal already exists — this only moves the wallet balance into it.
          await api<{ deal: DealDetail }>(`/api/escrows/${action.escrowId}/fund`, { method: 'POST' })
          pendingAction.clear()
          queryClient.invalidateQueries({ queryKey: ['escrows'] })
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          setPhase('done')
          navigate(`/escrow/${action.escrowId}`, { replace: true })
          return
        }

        if (action.kind === 'promotion') {
          // The top-up landed in the wallet — now buy the spotlight with it.
          const { charged } = await api<{ charged: number }>('/api/promotions', {
            method: 'POST',
            body: { listingId: action.listingId, planId: action.planId, priority: action.priority },
          })
          pendingAction.clear()
          queryClient.invalidateQueries({ queryKey: ['promotions'] })
          queryClient.invalidateQueries({ queryKey: ['wallet'] })
          setPhase('done')
          // Same landing as a launch paid straight from the wallet: the hub, with
          // the receipt in tow.
          navigate('/promotions', {
            replace: true,
            state: { notice: `Spotlight live — ${formatMoney(charged)} debited from your wallet.` },
          })
          return
        }

        const { deal } = await api<{ deal: Deal }>('/api/escrows/from-listing', {
          method: 'POST',
          body: { listingId: action.listingId, quantity: action.quantity, paymentMethod: action.paymentMethod },
        })
        pendingAction.clear()
        queryClient.invalidateQueries({ queryKey: ['escrows'] })
        queryClient.invalidateQueries({ queryKey: ['wallet'] })
        setPhase('done')
        navigate(`/escrow/${deal.id}`, { replace: true })
      } catch (err) {
        // Payment succeeded but the follow-up didn't — the money is safe in the
        // wallet either way, so say so rather than implying it was lost.
        const retryHint =
          action.kind === 'fund'
            ? 'Your payment is safe in your wallet — open the deal and fund it again.'
            : action.kind === 'promotion'
              ? 'Your payment is safe in your wallet — open the promotion studio and launch it again.'
              : 'Your payment is safe in your wallet — you can complete the order from the listing.'
        pendingAction.clear()
        setError(`${apiErrorMessage(err)} ${retryHint}`)
        setPhase('failed')
      }
    }

    void run()
  }, [reference, navigate, queryClient])

  if (phase === 'failed') {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-4">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <AlertTriangle size={22} />
        </span>
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Payment not completed</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} /> Marketplace
          </Link>
          <Link
            to="/dashboard"
            className="rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700"
          >
            View wallet
          </Link>
        </div>
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
        {phase === 'confirming' && 'Confirming your payment…'}
        {phase === 'placing' && placingLabel}
        {phase === 'done' && 'All set'}
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">Just a moment — please don't close this page.</p>
    </div>
  )
}
