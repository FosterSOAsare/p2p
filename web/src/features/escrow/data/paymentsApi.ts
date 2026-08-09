import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'
import type { Wallet } from './walletApi'

/**
 * Top-up payments. The buyer pays the shortfall on the provider's hosted page,
 * we credit the wallet, then the escrow is funded from the wallet — so wallet
 * balance and a fresh payment are the same rail underneath.
 */

/** Channels the provider can charge. A wallet isn't one — you can't top a
 *  wallet up *from* the wallet — so this stays two-valued. */
export type PayMethod = 'momo' | 'card'

/**
 * How an order was paid for, recorded on the escrow's `funded` event.
 * Superset of PayMethod: the debit always comes from the wallet, and this says
 * what filled it — an existing balance, or a fresh momo/card top-up.
 */
export type CheckoutMethod = PayMethod | 'wallet'

export interface InitDepositResult {
  authorizationUrl: string
  accessCode: string
  reference: string
}

export interface VerifyDepositResult {
  status: string
  credited: boolean
  wallet: Wallet
}

/**
 * What the buyer was doing before we sent them to the hosted payment page,
 * stashed so the callback can finish it.
 *
 * One slot, not one per kind: a buyer is only ever on one hosted page at a
 * time, and a single key means a stale order can't be resumed by a later
 * deposit that was meant for something else.
 */
export type PendingAction =
  | {
      kind: 'order'
      listingId: string
      quantity: number
      paymentMethod: PayMethod
      reference: string
      /** Where to send the buyer if anything goes wrong. */
      returnTo: string
    }
  | { kind: 'fund'; escrowId: string; reference: string; returnTo: string }
  /** A seller topping up mid-purchase of a listing spotlight. */
  | {
      kind: 'promotion'
      listingId: string
      planId: '7d' | '14d' | '30d'
      priority: number
      reference: string
      returnTo: string
    }
  | { kind: 'topup'; reference: string; returnTo: string }

const PENDING_KEY = 'p2p_pending_action'

export const pendingAction = {
  save(action: PendingAction) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(action))
  },
  load(): PendingAction | null {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PendingAction
    } catch {
      return null
    }
  },
  clear() {
    sessionStorage.removeItem(PENDING_KEY)
  },
}

/**
 * Start a hosted payment for `amount`; returns the URL to send the buyer to.
 * `method` only preselects a channel on the hosted page — omit it where we
 * didn't ask (the promotion flow), and Paystack offers the full set itself.
 */
export function useInitDeposit() {
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method?: PayMethod }) =>
      api<InitDepositResult>('/api/wallet/deposit/init', {
        method: 'POST',
        body: method ? { amount, method } : { amount },
      }),
  })
}

/** Confirm a payment by reference and credit the wallet (idempotent server-side). */
export function useVerifyDeposit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reference: string) => api<VerifyDepositResult>(`/api/wallet/deposit/verify/${reference}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}
