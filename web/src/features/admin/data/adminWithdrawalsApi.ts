import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../shared/libs/api'

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected'

export interface AdminWithdrawal {
  id: string
  reference: string
  amount: number
  currency: 'GHS' | 'TRX'
  destination: string
  status: WithdrawalStatus
  reviewNote: string | null
  reviewedAt: string | null
  createdAt: string
  user: { id: string; username: string; email: string; fullName: string }
  reviewedBy: string | null
}

export interface AdminWithdrawalsResponse {
  withdrawals: AdminWithdrawal[]
  total: number
  page: number
  pages: number
}

export const adminWithdrawalKeys = {
  all: ['admin', 'withdrawals'] as const,
  list: (query: string) => [...adminWithdrawalKeys.all, 'list', query] as const,
}

export function useAdminWithdrawals(query: string) {
  return useQuery({
    queryKey: adminWithdrawalKeys.list(query),
    queryFn: () => api<AdminWithdrawalsResponse>(`/api/admin/withdrawals${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  })
}

function useInvalidateWithdrawals() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: adminWithdrawalKeys.all })
}

/** Confirm the payout actually went out. No money moves — it left on request. */
export function useCompleteWithdrawal() {
  const invalidate = useInvalidateWithdrawals()
  return useMutation({
    mutationFn: (id: string) =>
      api<{ withdrawal: AdminWithdrawal }>(`/api/admin/withdrawals/${id}/complete`, { method: 'POST' }),
    onSuccess: invalidate,
  })
}

/** Refuse it and return the money. The reason is shown to the user. */
export function useRejectWithdrawal() {
  const invalidate = useInvalidateWithdrawals()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<{ withdrawal: AdminWithdrawal }>(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: invalidate,
  })
}
