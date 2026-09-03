import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import type { Currency } from '@/features/shared/libs/currency';

export type { Currency };

/** Idempotency key for a payout. Matches the server's `[A-Za-z0-9_-]{8,64}`. */
const newPayoutKey = () => `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;

/**
 * The GHS payout wallet — `GET /api/wallet`, its ledger, and withdrawals.
 *
 * Mirrors `web/src/features/escrow/data/walletApi.ts`. The balance is a ledger
 * column, not a bank account: escrow "locking" funds moves a number between
 * columns, and a withdrawal is simulated. No real money moves anywhere.
 */

export interface CurrencyWallet {
  currency: Currency;
  /** Withdrawable. A released payout is available at once — there is no hold. */
  balance: number;
  /** Held against deals that haven't settled. */
  escrowLocked: number;
}

/**
 * `GET /api/wallet` returns the GHS wallet spread onto the top level *and* a
 * `wallets` array holding one entry per currency — see `wallet.controller.ts`,
 * where the duplication is called out as deliberate back-compat.
 *
 * This client only ever read the flat fields, which is why the app showed a
 * cedi wallet and nothing else however much TRX a seller held. Read `wallets`
 * for anything that should show both rails; the flat fields remain for callers
 * that only care about cedis.
 */
export interface WalletBalances extends CurrencyWallet {
  currency: 'GHS';
  wallets: CurrencyWallet[];
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

export type WithdrawalStatus = 'pending' | 'completed' | 'rejected';

/**
 * A payout request. Distinct from the `withdrawal` transaction it produces: the
 * transaction records that the balance moved, this records whether the money
 * has actually left the platform yet — or come back.
 */
export interface Withdrawal {
  id: string;
  reference: string;
  amount: number;
  currency: Currency;
  destination: string;
  status: WithdrawalStatus;
  /** Why it was rejected — set by an admin, shown to the user. */
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface WithdrawalsResponse {
  withdrawals: Withdrawal[];
  total: number;
  page: number;
  pages: number;
}

export const walletKeys = {
  all: ['wallet'] as const,
  balances: () => [...walletKeys.all, 'balances'] as const,
  transactions: (currency: Currency) => [...walletKeys.all, 'transactions', currency] as const,
  withdrawals: (query: string) => [...walletKeys.all, 'withdrawals', query] as const,
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
export function useWalletTransactions(currency: Currency = 'GHS') {
  return useQuery({
    // Keyed by currency: the rails are separate ledgers, not two views of one,
    // so switching must fetch rather than re-render the cedi rows as TRX.
    queryKey: walletKeys.transactions(currency),
    queryFn: () =>
      api<TransactionsResponse>(`/api/wallet/transactions?limit=50&currency=${currency}`),
    retry: false,
  });
}

/**
 * The user's own payout requests for one currency, newest first.
 *
 * Worth having separately from the ledger because a `withdrawal` transaction
 * only says the balance moved. It cannot say whether the money has actually
 * been sent, or was refused and returned — which is the question a seller
 * staring at a smaller balance is actually asking.
 */
export function useWalletWithdrawals(query: string) {
  return useQuery({
    queryKey: walletKeys.withdrawals(query),
    queryFn: () =>
      api<WithdrawalsResponse>(`/api/wallet/withdrawals${query ? `?${query}` : ''}`),
    retry: false,
  });
}

/**
 * `POST /api/wallet/withdraw`.
 *
 * Both cached views go stale on success — the balance drops and a new debit row
 * appears — so both are invalidated rather than adjusted by hand. The payout
 * list is keyed under `wallet` too, so the same invalidation covers it.
 */
export function useWithdraw() {
  const qc = useQueryClient();

  /*
    One idempotency key per payout, held until that payout succeeds.

    The point is the double tap, which a phone invites more than a mouse does:
    without a key the second press is a second payout, and the balance guard
    only stops it once the money runs out. Reusing the key means the server
    answers the second press with the first payout instead of debiting again.

    Keyed on the payload, not just held: a seller whose request failed and who
    then edits the amount is asking for a *different* payout, and replaying the
    old key would hand them back the original — quietly ignoring the change.
  */
  const pending = useRef<{ signature: string; key: string } | null>(null);

  return useMutation({
    /**
     * `destination` is the Mobile Money number the payout goes to. The server
     * requires it (`wallet.validation.ts`) and rejects the request without it,
     * so sending only the amount meant every withdrawal failed validation.
     */
    mutationFn: ({
      amount,
      destination,
      currency = 'GHS',
    }: {
      amount: number;
      destination: string;
      currency?: Currency;
    }) => {
      // Currency is part of the signature: the same amount to the same
      // destination on the other rail is a different payout, and reusing the
      // key would replay the first one instead of making it.
      const signature = `${amount}|${destination}|${currency}`;
      if (pending.current?.signature !== signature) {
        pending.current = { signature, key: newPayoutKey() };
      }
      return api<{ ok: true }>('/api/wallet/withdraw', {
        method: 'POST',
        body: { amount, destination, currency, reference: pending.current.key },
      });
    },
    onSuccess: () => {
      // Spent — the next payout is a new one and gets its own key.
      pending.current = null;
      qc.invalidateQueries({ queryKey: walletKeys.all });
      // The dashboard shows the same payout figure.
      qc.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}
