import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'
import { authKeys } from '../../auth/data/authApi'

export interface Wallet {
  currency: 'GHS'
  balance: number
  escrowLocked: number
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
    mutationFn: ({ amount, destination }: { amount: number; destination: string }) =>
      api<Wallet>('/api/wallet/withdraw', { method: 'POST', body: { amount, destination } }),
    onSuccess: invalidate,
  })
}
