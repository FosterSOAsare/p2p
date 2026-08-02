import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'
import type { Wallet } from './walletApi'

/**
 * Top-up payments. The buyer pays the shortfall on the provider's hosted page,
 * we credit the wallet, then the escrow is funded from the wallet — so wallet
 * balance and a fresh payment are the same rail underneath.
 */

export type PayMethod = 'momo' | 'card'

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

/** Pending order stashed before the redirect, resumed on the way back. */
export interface PendingOrder {
  listingId: string
  quantity: number
  paymentMethod: PayMethod
  reference: string
  /** Where to send the buyer if anything goes wrong. */
  returnTo: string
}

const PENDING_KEY = 'p2p_pending_order'

export const pendingOrder = {
  save(order: PendingOrder) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(order))
  },
  load(): PendingOrder | null {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as PendingOrder
    } catch {
      return null
    }
  },
  clear() {
    sessionStorage.removeItem(PENDING_KEY)
  },
}

/** Start a hosted payment for `amount`; returns the URL to send the buyer to. */
export function useInitDeposit() {
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method: PayMethod }) =>
      api<InitDepositResult>('/api/wallet/deposit/init', { method: 'POST', body: { amount, method } }),
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
