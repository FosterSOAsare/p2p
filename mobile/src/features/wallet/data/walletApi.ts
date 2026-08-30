import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * The GHS payout wallet — `GET /api/wallet`, its ledger, and withdrawals.
 *
 * Mirrors `web/src/features/escrow/data/walletApi.ts`. The balance is a ledger
 * column, not a bank account: escrow "locking" funds moves a number between
 * columns, and a withdrawal is simulated. No real money moves anywhere.
 */

export interface WalletBalances {
  currency: 'GHS' | 'TRX';
  /** Withdrawable. A released payout is available at once — there is no hold. */
  balance: number;
  /** Held against deals that haven't settled. */
  escrowLocked: number;
}

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'escrow_fund'
  | 'escrow_release'
  | 'escrow_refund'
  | 'fee';

export interface WalletTransaction {
  id: string;
  type: TransactionType;
  /** Signed: credits are positive, debits negative. */
  amount: number;
  note: string | null;
  escrow: { id: string; title: string; code: string } | null;
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  pages: number;
}

export const walletKeys = {
  all: ['wallet'] as const,
  balances: () => [...walletKeys.all, 'balances'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
};

export function useWallet() {
  return useQuery({
    queryKey: walletKeys.balances(),
    queryFn: () => api<WalletBalances>('/api/wallet'),
    /**
     * Always refetch on mount, overriding the client's long `staleTime`.
     *
     * That long window is right for listings and deals, but two screens show
     * this balance — the wallet and the dashboard's "Available Payout" — and
     * they mount at different times. Cached for five minutes, they can display
     * different figures for the same money, which reads as a bug even though
     * both were true when fetched. Cached data still paints instantly; this
     * just refreshes it behind the scenes.
     */
    staleTime: 0,
    retry: false,
  });
}

/**
 * The ledger. Kept as its own query rather than folded into the balances call,
 * so a failure here still leaves the balances on screen — which matters,
 * because this endpoint currently fails for reasons outside the app: the
 * `transactions` table holds rows whose `type` the server's `TransactionType`
 * enum doesn't declare, and Prisma refuses to read the table at all. The screen
 * shows that error against an otherwise working wallet rather than pretending
 * the ledger is empty.
 */
export function useWalletTransactions() {
  return useQuery({
    queryKey: walletKeys.transactions(),
    queryFn: () => api<TransactionsResponse>('/api/wallet/transactions?limit=50'),
    retry: false,
  });
}

/**
 * `POST /api/wallet/withdraw`.
 *
 * Both cached views go stale on success — the balance drops and a new debit row
 * appears — so both are invalidated rather than adjusted by hand.
 */
export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      api<{ ok: true }>('/api/wallet/withdraw', { method: 'POST', body: { amount } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walletKeys.all });
      // The dashboard shows the same payout figure.
      qc.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}
