import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * The payout review queue — the phone side of
 * `web/src/features/admin/data/adminWithdrawalsApi.ts`.
 *
 * Worth knowing before touching either action: the money is already gone from
 * the user's balance. `wallet.service.withdraw` debits at request time, so one
 * balance cannot back several pending payouts at once. That makes these two
 * verdicts asymmetric — completing is bookkeeping, rejecting is what actually
 * moves money, by returning it.
 */

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected';
export type WithdrawalFilter = WithdrawalStatus | 'all';

export interface AdminWithdrawal {
  id: string;
  reference: string;
  amount: number;
  currency: 'GHS' | 'TRX';
  /** Momo number for GHS, TRON address for TRX. */
  destination: string;
  status: WithdrawalStatus;
  /** The rejection reason, shown to the user. Null unless rejected. */
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; username: string; email: string; fullName: string };
  reviewedBy: string | null;
}

export interface AdminWithdrawalsResponse {
  withdrawals: AdminWithdrawal[];
  total: number;
  page: number;
  pages: number;
}

export const adminWithdrawalKeys = {
  all: ['admin', 'withdrawals'] as const,
  list: (query: string) => [...adminWithdrawalKeys.all, 'list', query] as const,
};

export function useAdminWithdrawals(query: string) {
  return useQuery({
    queryKey: adminWithdrawalKeys.list(query),
    queryFn: () =>
      api<AdminWithdrawalsResponse>(`/api/admin/withdrawals${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

function useInvalidateWithdrawals() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: adminWithdrawalKeys.all });
}

/** Confirm the payout actually went out. No money moves — it left on request. */
export function useCompleteWithdrawal() {
  const invalidate = useInvalidateWithdrawals();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ withdrawal: AdminWithdrawal }>(`/api/admin/withdrawals/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: invalidate,
  });
}

/** Refuse it and return the money. The reason is shown to the user. */
export function useRejectWithdrawal() {
  const invalidate = useInvalidateWithdrawals();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api<{ withdrawal: AdminWithdrawal }>(`/api/admin/withdrawals/${id}/reject`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: invalidate,
  });
}
