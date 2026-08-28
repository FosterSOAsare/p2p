import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import { dealKeys } from './dealsApi';

/**
 * The TRX rail's deposit half (NOWPayments) — the phone side of
 * `web/src/features/escrow/data/cryptoApi.ts`.
 *
 * Deliberately not shaped like paymentsApi: a fiat deal is funded by us on the
 * buyer's instruction, so the client drives it. A crypto deal is funded by the
 * buyer paying the provider, so the client only opens the invoice and then
 * watches — the FUND event is the server's to fire when the deposit confirms.
 *
 * One difference from the web worth naming. The web is handed the provider's
 * `NP_id` on its success redirect and passes it to `/crypto/check`, which is how
 * it identifies a payment before any IPN has landed. That redirect goes to
 * `WEB_ORIGIN` (see `crypto.service.startDeposit`), so a phone never sees it —
 * the invoice opens in a browser tab that returns nothing to us. So mobile polls
 * instead and lets the IPN supply the payment id, which is what happens on a
 * reachable server anyway. The consequence is limited and dev-only: against a
 * localhost server no IPN can reach, a mobile deposit will sit on "waiting"
 * where the web's redirect would have resolved it.
 */

/** Raw provider status, passed through verbatim by the server. */
export type PayStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'failed'
  | 'expired'
  | 'refunded';

export interface CryptoDeposit {
  dealStatus: 'created' | 'funded' | 'delivered' | 'disbursed' | 'disputed' | 'cancelled';
  currency: 'GHS' | 'TRX';
  payCurrency: string;
  /** What the invoice asks for, in `payCurrency`. */
  expected: number;
  /** What has actually landed. 0 until the buyer sends. */
  received: number;
  payStatus: PayStatus | null;
  invoiceUrl: string | null;
  depositAddress: string | null;
  depositTxid: string | null;
  /** Tronscan link for the deposit, once there is a txid to link. */
  explorerUrl: string | null;
  settledAt: string | null;
  /** The deal has left `created` — stop polling. */
  funded: boolean;
  /** The provider gave up on this invoice; a new one is needed. */
  dead: boolean;
}

export const cryptoKeys = {
  deposit: (escrowId: string) => ['escrows', 'crypto', escrowId] as const,
};

/** How often to re-ask while a deposit is in flight. */
const POLL_MS = 6000;

/**
 * Watch the deposit. Polls only while there is something to wait for — an
 * invoice that is open and neither settled nor abandoned — so a funded or
 * unopened deal costs one request, not one every six seconds.
 */
export function useCryptoDeposit(escrowId: string, enabled: boolean) {
  return useQuery({
    queryKey: cryptoKeys.deposit(escrowId),
    queryFn: () =>
      api<{ deposit: CryptoDeposit }>(`/api/escrows/${escrowId}/crypto`).then((r) => r.deposit),
    enabled: enabled && Boolean(escrowId),
    retry: false,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || d.funded || d.dead || !d.invoiceUrl) return false;
      return POLL_MS;
    },
  });
}

/**
 * Open (or re-open) the hosted invoice. Re-entrant server-side: a buyer who
 * closes the browser and comes back gets the same live invoice, so calling this
 * twice does not create two competing charges.
 */
export function useStartCryptoDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (escrowId: string) =>
      api<{ deposit: CryptoDeposit }>(`/api/escrows/${escrowId}/crypto/start`, {
        method: 'POST',
      }).then((r) => r.deposit),
    onSuccess: (deposit, escrowId) => {
      queryClient.setQueryData(cryptoKeys.deposit(escrowId), deposit);
    },
  });
}

/**
 * Ask the provider directly rather than waiting for its callback — what the
 * "I've paid" button does.
 *
 * `paymentId` is accepted for parity with the server's contract, but mobile has
 * no redirect to read one from (see the note at the top of this file), so in
 * practice this omits it and the server uses the id already on file.
 */
export function useCheckCryptoDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ escrowId, paymentId }: { escrowId: string; paymentId?: string }) =>
      api<{ deposit: CryptoDeposit }>(`/api/escrows/${escrowId}/crypto/check`, {
        method: 'POST',
        body: paymentId ? { paymentId } : {},
      }).then((r) => r.deposit),
    onSuccess: (deposit, { escrowId }) => {
      queryClient.setQueryData(cryptoKeys.deposit(escrowId), deposit);
      // A confirmed deposit moves the deal itself to `funded`, so the detail
      // view and the lists are stale the moment this returns.
      if (deposit.funded) {
        queryClient.invalidateQueries({ queryKey: dealKeys.detail(escrowId) });
        queryClient.invalidateQueries({ queryKey: dealKeys.all });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      }
    },
  });
}

/** Plain-English label + tone for a provider status. */
export function payStatusLabel(status: PayStatus | null): {
  label: string;
  tone: 'pending' | 'good' | 'bad';
} {
  switch (status) {
    case 'finished':
    case 'confirmed':
      return { label: 'Payment confirmed', tone: 'good' };
    case 'sending':
      return { label: 'Settling on-chain', tone: 'pending' };
    case 'confirming':
      return { label: 'Confirming on the network', tone: 'pending' };
    case 'partially_paid':
      return { label: 'Underpaid — short of the amount due', tone: 'bad' };
    case 'failed':
      return { label: 'Payment failed', tone: 'bad' };
    case 'expired':
      return { label: 'Invoice expired', tone: 'bad' };
    case 'refunded':
      return { label: 'Payment refunded', tone: 'bad' };
    default:
      return { label: 'Waiting for your transfer', tone: 'pending' };
  }
}
