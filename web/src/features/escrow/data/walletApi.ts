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

function useInvalidateWallet() {
  const queryClient = useQueryClient()
  return () => {
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

export function useWithdraw() {
  const invalidate = useInvalidateWallet()
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
    }) => api<Wallet>('/api/wallet/withdraw', { method: 'POST', body: { amount, destination, currency } }),
    onSuccess: invalidate,
  })
}
