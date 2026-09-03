import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { api } from '@/features/shared/data/api';
import { walletKeys, type WalletBalances } from './walletApi';

/**
 * Top-up payments — the phone side of `web/src/features/escrow/data/paymentsApi.ts`.
 *
 * Same rail as the web: the buyer pays on the provider's hosted page, we credit
 * the wallet, and the escrow is then funded *from* the wallet. So an existing
 * balance and a fresh payment are the same thing underneath, and the server
 * only ever debits one place.
 *
 * The one real difference is how the buyer comes back. The web sends the
 * browser away and picks the thread back up on a callback route, which is why
 * it has to stash a `PendingAction` in sessionStorage first — the page it left
 * is gone. `openAuthSessionAsync` instead hands control straight back to the
 * caller when the redirect fires, so the whole flow stays inside one function
 * and there is nothing to stash, resume, or leave behind half-finished.
 */

/** Channels the provider can charge. A wallet isn't one — you can't top a
 *  wallet up *from* the wallet — so this stays two-valued. */
export type PayMethod = 'momo' | 'card';

/**
 * How an order was paid for, recorded on the escrow's `funded` event.
 * Superset of PayMethod: the debit always comes from the wallet, and this says
 * what filled it — an existing balance, or a fresh momo/card top-up.
 */
export type CheckoutMethod = PayMethod | 'wallet';

export interface InitDepositResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyDepositResult {
  status: string;
  credited: boolean;
  wallet: WalletBalances;
}

/** Outcome of sending the buyer to the hosted page and confirming the result. */
export type TopUpOutcome =
  | { ok: true; reference: string }
  /** They backed out of the payment page — not an error, just nothing to do. */
  | { ok: false; reason: 'cancelled' }
  /** The page closed but the provider hasn't marked it paid. */
  | { ok: false; reason: 'unconfirmed'; reference: string };

/** Start a hosted payment for `amount`; returns the URL to send the buyer to. */
export function useInitDeposit() {
  return useMutation({
    mutationFn: ({ amount, method }: { amount: number; method: PayMethod }) =>
      api<InitDepositResult>('/api/wallet/deposit/init', {
        method: 'POST',
        /*
          `client: 'mobile'` is what makes Paystack's return page hand control
          back to the app instead of stranding the buyer on the website.

          Paystack will only redirect to an http(s) address, so the callback
          stays the web URL; the server tags it (`buildCallbackUrl`) and that
          page bounces to `veritrust://` when it sees the tag. Without this the
          browser simply sits on the website after payment and the buyer has to
          work out that they should close it.
        */
        body: { amount, method, client: 'mobile' },
      }),
  });
}

/** Confirm a payment by reference and credit the wallet (idempotent server-side). */
export function useVerifyDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) =>
      api<VerifyDepositResult>(`/api/wallet/deposit/verify/${reference}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
      queryClient.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    },
  });
}

/**
 * The whole top-up in one call: open the hosted page, wait for the buyer to
 * finish, then confirm it with the server.
 *
 * Always verifies server-side rather than trusting the redirect. The hosted
 * page can hand back a `success`-looking URL for a payment that never settled,
 * and on a phone the buyer can also just swipe the sheet away mid-charge — so
 * the only answer worth acting on is the provider's, asked for by reference.
 */
export function useTopUp() {
  const initDeposit = useInitDeposit();
  const verifyDeposit = useVerifyDeposit();

  const run = async (amount: number, method: PayMethod): Promise<TopUpOutcome> => {
    const { authorizationUrl, reference } = await initDeposit.mutateAsync({ amount, method });

    // Whatever scheme the app is actually running under — a dev client, Expo
    // Go and a store build all differ, so this is resolved rather than hard-coded.
    const returnUrl = Linking.createURL('/wallet/deposit/callback');
    const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUrl);

    if (result.type !== 'success') {
      // `dismiss` / `cancel` both mean the buyer closed the sheet. It's still
      // worth asking the server: they may have completed the charge and then
      // dismissed the "payment successful" page instead of tapping through it.
      const late = await verifyDeposit.mutateAsync(reference).catch(() => null);
      if (late?.credited) return { ok: true, reference };
      return { ok: false, reason: 'cancelled' };
    }

    const verified = await verifyDeposit.mutateAsync(reference);
    return verified.credited
      ? { ok: true, reference }
      : { ok: false, reason: 'unconfirmed', reference };
  };

  return {
    run,
    isPending: initDeposit.isPending || verifyDeposit.isPending,
    error: initDeposit.error ?? verifyDeposit.error,
    reset: () => {
      initDeposit.reset();
      verifyDeposit.reset();
    },
  };
}
