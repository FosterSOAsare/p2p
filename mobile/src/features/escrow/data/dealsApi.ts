import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import type { CheckoutMethod } from '@/features/wallet/data/paymentsApi';
import type { FeeSplit } from './fees';

/**
 * Escrow deals — `GET /api/escrows` and `GET /api/escrows/:id`.
 *
 * Mirrors `web/src/features/escrow/data/ordersApi.ts`. Both sides of a deal
 * read the same endpoint; `myRole` says which side you are, so screens don't
 * have to compare usernames themselves.
 */

export type DealStatus =
  | 'created'
  | 'funded'
  | 'delivered'
  | 'disbursed'
  | 'disputed'
  | 'cancelled';

/**
 * What the server permits right now, and note the case: it sends these
 * **uppercase**. Comparing against lowercase names silently matches nothing,
 * which shows up as an action panel that is simply always empty.
 */
export type EscrowAction = 'FUND' | 'DELIVER' | 'RELEASE' | 'CANCEL' | 'DISPUTE';

/** One entry of the audit timeline. Note `event`/`actorRole`, not type/actor. */
export interface DealEvent {
  id: string;
  event: string;
  actorRole: string;
  createdAt: string;
}

export interface DealParty {
  username: string;
  avatarUrl: string | null;
}

export interface Deal {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: DealStatus;
  currency: 'GHS' | 'TRX';
  rail: 'fiat' | 'crypto';
  amount: number;
  feeAmount: number;
  buyerFee: number;
  sellerFee: number;
  fundingTotal: number;
  sellerPayout: number;
  quantity: number;
  listing: { id: string; image: string | null } | null;
  /** The two sides, named — the mock's creator/counterparty pair is gone. */
  buyer: DealParty | null;
  seller: DealParty | null;
  /**
   * Which side the signed-in account is on, decided server-side.
   *
   * `creator` is the server's fallback for an account that fills neither slot —
   * it is never `null` and never `admin`, which is what this used to claim.
   * Screens treat anything that isn't `buyer` as the seller's view, as the web
   * does.
   */
  myRole: 'buyer' | 'seller' | 'creator';
  /**
   * What this account may do to this deal right now. The server owns the state
   * machine — who you are, what has been paid, whether a dispute is open — so
   * the UI reads its buttons off this instead of re-deriving them from `status`
   * and a username comparison, which is how the two get to disagree.
   */
  availableActions: EscrowAction[];
  carrier: string | null;
  trackingNumber: string | null;
  deliveryNote: string | null;
  /** The seller's optional explanation, captured at cancel time. */
  cancelReason: string | null;
  autoReleaseAt: string | null;
  createdAt: string;
  fundedAt: string | null;
  deliveredAt: string | null;
  disbursedAt: string | null;
  disputedAt: string | null;
  cancelledAt: string | null;
  creatorUsername: string;
  events: DealEvent[];
}

export interface DealsResponse {
  deals: Deal[];
  total: number;
  page: number;
  pages: number;
}

export const dealKeys = {
  all: ['deals'] as const,
  list: (status: string) => [...dealKeys.all, 'list', status] as const,
  detail: (id: string) => [...dealKeys.all, 'detail', id] as const,
};

/**
 * Every deal this account is a party to, either side. The list rows carry the
 * same fields as the detail response, so one `Deal` type serves both.
 *
 * Fetched **once, unfiltered**, with the tabs filtering in memory.
 *
 * The web sends one `?status=` per tab and lets the server filter. That is the
 * better shape in principle — it scales past a page — but each tab press then
 * costs a full round trip, which here is seconds, so the tabs feel unresponsive.
 * One request for the whole (capped) list makes switching instant. Revisit if a
 * seller ever exceeds the cap, at which point real pagination is needed anyway.
 */
export function useDeals() {
  return useQuery({
    queryKey: dealKeys.list('all'),
    queryFn: () => api<DealsResponse>('/api/escrows?limit=48'),
    retry: false,
  });
}

/** One deal in full, including its audit timeline. */
export function useDeal(id: string) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => api<{ deal: Deal }>(`/api/escrows/${id}`).then((r) => r.deal),
    enabled: Boolean(id),
    retry: false,

    /**
     * Paint immediately from the row you just tapped.
     *
     * The list and the detail run the same server-side `serialize()` — the
     * detail only adds the audit `events` on top. So the row already in cache
     * is the whole screen bar the timeline, and waiting 1–6 seconds to show a
     * spinner in its place is pure loss.
     *
     * `placeholderData`, not `initialData`: placeholder data is never written to
     * the cache and never counts as fresh, so the real fetch still runs and the
     * timeline fills in behind it. `initialData` would have recorded this
     * event-less copy as the cached truth.
     */
    placeholderData: () => {
      const lists = qc.getQueriesData<DealsResponse>({ queryKey: dealKeys.all });
      for (const [, data] of lists) {
        const hit = data?.deals?.find((d) => d.id === id);
        // The list omits `events`; an empty timeline renders as no rows rather
        // than as a crash, and is replaced a moment later.
        if (hit) return { ...hit, events: hit.events ?? [] };
      }
      return undefined;
    },
  });
}

/* ---------------------------------------------------------------- mutations */

/**
 * Every transition below moves money, so the same four caches go stale together
 * and are invalidated as one unit rather than per-mutation.
 *
 * - `deals` — this deal's status, and its row in the list
 * - `wallet` — balances and the ledger; a release credits, a cancel refunds
 * - `users/dashboard` — the seller home repeats the payout figure and the
 *   "action required" count, and looks broken when it disagrees with the wallet
 * - `listings` — a cancel returns stock to the listing
 *
 * The web additionally invalidates its cached `/auth/me`; mobile keeps the user
 * in `AuthContext` rather than in React Query, so there is no such key here.
 */
function useInvalidateDeals() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: dealKeys.all });
    qc.invalidateQueries({ queryKey: ['wallet'] });
    qc.invalidateQueries({ queryKey: ['users', 'dashboard'] });
    qc.invalidateQueries({ queryKey: ['listings'] });
    if (id) qc.invalidateQueries({ queryKey: dealKeys.detail(id) });
  };
}

export interface CheckoutInput {
  listingId: string;
  quantity: number;
  /** Recorded on the `funded` event — the debit itself is always from the wallet. */
  paymentMethod: CheckoutMethod;
}

/**
 * Buy a listing: creates the escrow and funds it in one server call.
 *
 * Not idempotent — a second call buys a second time. Callers must make sure a
 * retry can't fire on its own (a double tap, an effect running twice), because
 * the server has no request key to collapse them on.
 */
export function useCheckout() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      api<{ deal: Deal }>('/api/escrows/from-listing', { method: 'POST', body: input }),
    onSuccess: () => invalidate(),
  });
}

/** Buyer pays — the server debits the wallet for the full `fundingTotal`. */
export function useFundDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ deal: Deal }>(`/api/escrows/${id}/fund`, { method: 'POST' }),
    onSuccess: (_r, id) => invalidate(id),
  });
}

/**
 * Seller dispatches. Every field is optional — a digital delivery has no
 * carrier and no tracking number, and the server accepts that.
 */
export function useDeliverDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      carrier?: string;
      trackingNumber?: string;
      note?: string;
    }) => api<{ deal: Deal }>(`/api/escrows/${id}/deliver`, { method: 'POST', body }),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

/** The money move: escrow clears to the seller's payout balance. */
export function useReleaseDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ deal: Deal }>(`/api/escrows/${id}/release`, { method: 'POST' }),
    onSuccess: (_r, id) => invalidate(id),
  });
}

/** Seller backs out — the buyer is refunded in full and stock is restored. */
export function useCancelDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api<{ deal: Deal }>(`/api/escrows/${id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

/** Freezes the funds until an admin rules. `description` must be ≥10 chars. */
export function useDisputeDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({ id, reason, description }: { id: string; reason: string; description: string }) =>
      api<{ deal: Deal }>(`/api/escrows/${id}/dispute`, {
        method: 'POST',
        body: { reason, description },
      }),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

/**
 * Create a standalone ("off-platform") escrow — the custom deal form.
 *
 * `POST /api/escrows`, the twin of the web's `useCreateStandaloneEscrow`.
 * Two details the server cares about:
 *
 * - `counterpartyUsername` is the field it reads; `invitedUsername` is sent
 *   alongside it because the web sends both and the schema accepts both.
 * - `rail` is deliberately not sent — the server derives it from `currency`
 *   (GHS → fiat, TRX → crypto), and sending one would be ignored anyway.
 *
 * An empty counterparty is dropped rather than sent as `""`, which is what
 * makes the deal a public invite link instead of a named one.
 */
export function useCreateStandaloneEscrow() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({
      invitedUsername,
      ...rest
    }: {
      title: string;
      description?: string;
      amount: number;
      currency: 'GHS' | 'TRX';
      role: 'buyer' | 'seller';
      invitedUsername?: string;
      feeSplit: FeeSplit;
    }) => {
      const counterparty = invitedUsername?.trim();
      return api<{ deal: Deal }>('/api/escrows', {
        method: 'POST',
        body: {
          ...rest,
          ...(counterparty
            ? { counterpartyUsername: counterparty, invitedUsername: counterparty }
            : {}),
        },
      }).then((r) => r.deal);
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Amend the terms, allowed only while the deal is still `created`.
 *
 * `counterpartyUsername` duplicates `invitedUsername` because the server reads
 * the former — the web sends both for the same reason.
 */
export function useUpdateEscrow() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      description?: string;
      amount?: number;
      currency?: 'GHS' | 'TRX';
      role?: 'buyer' | 'seller';
      invitedUsername?: string;
    }) =>
      api<{ deal: Deal }>(`/api/escrows/${id}`, {
        method: 'PATCH',
        body: { ...body, counterpartyUsername: body.invitedUsername },
      }),
    onSuccess: (_r, { id }) => invalidate(id),
  });
}

/** Rate the counterparty once the deal has settled. */
export function useReviewDeal() {
  const qc = useQueryClient();
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      api<{ deal: Deal }>(`/api/escrows/${id}/review`, {
        method: 'POST',
        body: { rating, comment },
      }),
    onSuccess: (_r, { id }) => {
      invalidate(id);
      // The counterparty's store rating is now stale.
      qc.invalidateQueries({ queryKey: ['seller'] });
    },
  });
}
