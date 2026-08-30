import { useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'

export type WalletCurrency = 'GHS' | 'TRX'

export interface CurrencyWallet {
  currency: WalletCurrency
  balance: number
  escrowLocked: number
}

/**
 * `GET /api/wallet` returns the GHS wallet spread onto the top level (what this
 * client and the mobile one have always read) plus `wallets`, one entry per
 * currency the user can hold. Read `wallets` for anything that should show both.
 */
export interface Wallet extends CurrencyWallet {
  currency: 'GHS'
  wallets: CurrencyWallet[]
}

export interface WalletTransaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'escrow_fund' | 'escrow_release' | 'escrow_refund' | 'fee'
  amount: number
  note: string | null
  escrow: { id: string; title: string; code: string } | null
  createdAt: string
}

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected'

/**
 * A payout request. Distinct from the `withdrawal` Transaction row it produces:
 * the transaction records that the balance moved, this records whether the
 * money has actually left the platform yet.
 */
export interface Withdrawal {
  id: string
  reference: string
  amount: number
  currency: WalletCurrency
  destination: string
  status: WithdrawalStatus
  /** Why it was rejected — set by an admin, shown to the user. */
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface WithdrawalsResponse {
  withdrawals: Withdrawal[]
  total: number
  page: number
  pages: number
}

export interface TransactionsResponse {
  transactions: WalletTransaction[]
  total: number
  page: number
  pages: number
}

export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => api<Wallet>('/api/wallet'),
    retry: false,
  })
}

export function useWalletTransactions(query: string) {
  return useQuery({
    queryKey: ['wallet', 'transactions', query],
    queryFn: () => api<TransactionsResponse>(`/api/wallet/transactions${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
  })
}

/** The user's own payout history for one currency, newest first. */
export function useWalletWithdrawals(query: string) {
  return useQuery({
    queryKey: ['wallet', 'withdrawals', query],
    queryFn: () => api<WithdrawalsResponse>(`/api/wallet/withdrawals${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateWallet() {
  const queryClient = useQueryClient()
  return () => {
    // Covers the balance, the ledger and the payout list — all three change on
    // a deposit or a withdrawal, and all three are keyed under 'wallet'.
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: authKeys.me })
  }
}

export function useDeposit() {
  const invalidate = useInvalidateWallet()
  return useMutation({
    mutationFn: (amount: number) => api<Wallet>('/api/wallet/deposit', { method: 'POST', body: { amount } }),
    onSuccess: invalidate,
  })
}

/** Idempotency key for a payout. Matches the server's `[A-Za-z0-9_-]{8,64}`. */
const newPayoutKey = () => `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`

export function useWithdraw() {
  const invalidate = useInvalidateWallet()

  /*
    One idempotency key per payout, held until that payout succeeds.

    The point is the double tap: without a key the second press is a second
    payout, and the balance guard only stops it once the money runs out. Reusing
    the key means the server answers the second press with the first payout
    instead of debiting again.

    Keyed on the payload, not just held: a seller whose request failed and who
    then edits the amount is asking for a *different* payout, and replaying the
    old key would hand them back the original — quietly ignoring the change.
  */
  const pending = useRef<{ signature: string; key: string } | null>(null)

  return useMutation({
    // `currency` picks which balance is cashed out, and with it what the server
    // expects `destination` to be — a momo number for GHS, a TRON address for TRX.
    mutationFn: ({
      amount,
      destination,
      currency = 'GHS',
    }: {
      amount: number
      destination: string
      currency?: WalletCurrency
    }) => {
      const signature = `${amount}|${destination}|${currency}`
      if (pending.current?.signature !== signature) {
        pending.current = { signature, key: newPayoutKey() }
      }
      return api<Wallet>('/api/wallet/withdraw', {
        method: 'POST',
        body: { amount, destination, currency, reference: pending.current.key },
      })
    },
    onSuccess: () => {
      // Spent — the next payout is a new one and gets its own key.
      pending.current = null
      invalidate()
    },
  })
}
