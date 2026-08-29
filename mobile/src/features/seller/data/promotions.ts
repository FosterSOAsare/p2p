import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';
import { listingKeys } from '@/features/listings/data/listingsApi';
import { walletKeys } from '@/features/wallet/data/walletApi';
import { dashboardKeys } from '@/features/dashboard/data/dashboardApi';

/**
 * Paid listing spotlights — the phone side of
 * `web/src/features/seller/data/promotions.ts`.
 *
 * Server-owned: a promotion is a purchase, so the price, the term and the
 * status all come from the API. The mirrors below (`promotionPrice`) exist only
 * to draw a live preview while the seller moves the slider — the same trick
 * checkout uses for the escrow fee — and the server re-prices every charge from
 * scratch, so a stale mirror can never become a wrong debit.
 */

export type PromotionPlanId = '7d' | '14d' | '30d';
export type PromotionStatus = 'active' | 'paused' | 'expired' | 'cancelled';

export interface PromotionPlan {
  id: PromotionPlanId;
  label: string;
  days: number;
  price: number;
  description: string;
}

export interface Promotion {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
  category: string;
  status: PromotionStatus;
  planId: PromotionPlanId;
  planLabel: string;
  /** What the run has cost in total so far, in GH₵. */
  amount: number;
  priority: number;
  currency: 'GHS';
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionsResponse {
  promotions: Promotion[];
  total: number;
  page: number;
  pages: number;
}

export interface PromotionMetrics {
  activePromotionCount: number;
  pausedPromotionCount: number;
  expiredPromotionCount: number;
  cancelledPromotionCount: number;
  averagePriority: number;
  totalSpend: number;
  plans: PromotionPlan[];
  maxPriority: number;
}

/**
 * What an amendment does to the term.
 * - `new` — no live run; buying a term outright.
 * - `priority` — same plan, different rank: pay the price difference, term untouched.
 * - `extend` — different plan: buy that term and stack it on the time already paid for.
 */
export type PromotionChangeMode = 'new' | 'priority' | 'extend';

export interface PromotionQuote {
  planId: PromotionPlanId;
  priority: number;
  mode: PromotionChangeMode;
  /** Full price of the chosen plan at this rank. */
  total: number;
  /** What the wallet will actually be debited. The balance to compare it against comes from /api/wallet. */
  charge: number;
  /** Days this adds to the run — 0 when only the rank changed. */
  addedDays: number;
  endsAt: string;
  isAmendment: boolean;
  /** The live run this would amend, or null for a fresh launch. */
  current: Promotion | null;
}

/** Fallback price list — used only until `metrics` lands, so the studio never renders empty. */
export const PROMOTION_PLANS: readonly PromotionPlan[] = [
  {
    id: '7d',
    label: '7 days spotlight',
    days: 7,
    price: 25,
    description: 'Short burst for fresh stock or a quick push.',
  },
  {
    id: '14d',
    label: '14 days spotlight',
    days: 14,
    price: 45,
    description: 'Best balance for steady traffic and visibility.',
  },
  {
    id: '30d',
    label: '30 days spotlight',
    days: 30,
    price: 79,
    description: 'Longer placement for flagship listings.',
  },
] as const;

export const MAX_PRIORITY = 100;
export const PRIORITY_STEP = 5;

export function getPromotionPlanDetails(
  planId: PromotionPlanId,
  plans: readonly PromotionPlan[] = PROMOTION_PLANS,
) {
  return plans.find((p) => p.id === planId) ?? plans[0];
}

/**
 * Mirror of the server's `priceP` (promotion-pricing.ts): priority is a
 * surcharge on the base, so rank 0 pays list price and rank 100 pays double.
 */
export function promotionPrice(
  planId: PromotionPlanId,
  priority: number,
  plans: readonly PromotionPlan[] = PROMOTION_PLANS,
) {
  const base = getPromotionPlanDetails(planId, plans).price;
  const clamped = Math.min(MAX_PRIORITY, Math.max(0, priority));
  return Math.round(base * (1 + clamped / MAX_PRIORITY) * 100) / 100;
}

export function getPromotionStatusLabel(status: PromotionStatus) {
  switch (status) {
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
  }
}

export const promotionKeys = {
  all: ['promotions'] as const,
  mine: (query: string) => ['promotions', 'mine', query] as const,
  metrics: ['promotions', 'metrics'] as const,
  quote: (listingId: string, planId: string, priority: number) =>
    ['promotions', 'quote', listingId, planId, priority] as const,
};

/**
 * Launching debits the wallet, so the balance and the seller's own header
 * numbers move too.
 *
 * The web also refreshes its `me` query here; there isn't one on the phone —
 * the signed-in user comes from AuthContext — so the dashboard stands in for
 * it, which is where the seller's totals are actually read from.
 */
function useInvalidatePromotions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    queryClient.invalidateQueries({ queryKey: walletKeys.all });
    queryClient.invalidateQueries({ queryKey: listingKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.data });
  };
}

export function usePromotionMetrics() {
  return useQuery({
    queryKey: promotionKeys.metrics,
    queryFn: () => api<PromotionMetrics>('/api/promotions/metrics'),
    staleTime: 60_000,
    retry: false,
  });
}

export function useMyPromotions(query = '') {
  return useQuery({
    queryKey: promotionKeys.mine(query),
    queryFn: () => api<PromotionsResponse>(`/api/promotions/mine${query ? `?${query}` : ''}`),
    placeholderData: keepPreviousData,
    retry: false,
    /*
      Bouncing hub → studio → hub is the normal way this feature is used, and a
      round trip here runs to seconds. Half a minute of freshness makes the trip
      back instant, and nothing goes stale behind it: launching invalidates this
      key, while pause, resume and cancel write their result straight into these
      lists.
    */
    staleTime: 30_000,
  });
}

/**
 * Live price for the current slider position. Enabled only once a plan and a
 * listing are known; the studio falls back to `promotionPrice` while it loads.
 *
 * The slider position is part of the key, so every move is a fresh key. Holding
 * the previous answer while the new one loads keeps `data` defined throughout —
 * otherwise the studio watches `current` blink to undefined and back on every
 * move, which is enough to make it re-adopt the saved rank and undo the edit.
 */
export function usePromotionQuote(
  listingId: string,
  planId: PromotionPlanId,
  priority: number,
  enabled = true,
) {
  return useQuery({
    queryKey: promotionKeys.quote(listingId, planId, priority),
    queryFn: () =>
      api<PromotionQuote>(
        `/api/promotions/quote?listingId=${encodeURIComponent(listingId)}&planId=${planId}&priority=${priority}`,
      ),
    enabled: enabled && Boolean(listingId),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 15_000,
  });
}

export function useLaunchPromotion() {
  const invalidate = useInvalidatePromotions();
  return useMutation({
    mutationFn: (input: { listingId: string; planId: PromotionPlanId; priority: number }) =>
      api<{ promotion: Promotion; charged: number }>('/api/promotions', {
        method: 'POST',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

/** What the run's status becomes once the server has taken the action. */
const RESULTING_STATUS: Record<'pause' | 'resume' | 'cancel', PromotionStatus> = {
  pause: 'paused',
  resume: 'active',
  cancel: 'cancelled',
};

/**
 * Rewrite one promotion wherever a `mine` list is holding it.
 *
 * Only the `['promotions','mine',…]` lists are touched: the `all` prefix also
 * covers metrics and the quote, which are different shapes entirely and would
 * be corrupted by a blind patch.
 */
function patchPromotionInLists(
  queryClient: QueryClient,
  promotionId: string,
  patch: (p: Promotion) => Promotion,
) {
  queryClient.setQueriesData<PromotionsResponse>(
    { queryKey: [...promotionKeys.all, 'mine'] },
    (old) =>
      old
        ? {
            ...old,
            promotions: old.promotions.map((p) => (p.id === promotionId ? patch(p) : p)),
          }
        : old,
  );
}

/**
 * Pause / resume / cancel a run.
 *
 * Applied optimistically: the seller taps a button and the badge moves at
 * once, because waiting for the POST *and* a list refetch before anything
 * changed made the controls feel broken. A refused action rolls the cache
 * back to exactly what it held before.
 *
 * These three move no money, so they deliberately don't run the full
 * `useInvalidatePromotions` set — no wallet, no dashboard. Listings still go,
 * since a run's status is what decides where the listing sorts in the feed.
 * Launching is the one that charges, and it keeps the full set.
 */
function usePromotionAction(action: 'pause' | 'resume' | 'cancel') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (promotionId: string) =>
      api<{ promotion: Promotion }>(`/api/promotions/${promotionId}/${action}`, {
        method: 'POST',
      }).then((r) => r.promotion),

    onMutate: async (promotionId) => {
      // Stop a refetch already in flight from landing on top of the patch.
      await queryClient.cancelQueries({ queryKey: promotionKeys.all });
      const previous = queryClient.getQueriesData<PromotionsResponse>({
        queryKey: [...promotionKeys.all, 'mine'],
      });
      patchPromotionInLists(queryClient, promotionId, (p) => ({
        ...p,
        status: RESULTING_STATUS[action],
      }));
      return { previous };
    },

    onError: (_error, _promotionId, context) => {
      // Put back precisely what each list held, rather than guessing an undo.
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },

    /* The response carries the updated run, so the server's own version
       replaces the guess without costing a second round trip. */
    onSuccess: (promotion) => {
      patchPromotionInLists(queryClient, promotion.id, () => promotion);
    },

    onSettled: () => {
      // Counts on the metrics tiles shift with the status, and the feed's
      // ordering with them; both can catch up in the background.
      queryClient.invalidateQueries({ queryKey: promotionKeys.metrics });
      queryClient.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

export const usePausePromotion = () => usePromotionAction('pause');
export const useResumePromotion = () => usePromotionAction('resume');
export const useCancelPromotion = () => usePromotionAction('cancel');
