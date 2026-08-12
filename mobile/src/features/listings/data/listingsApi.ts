import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * The seller's own listings — `GET /api/listings/mine` and the write calls
 * behind My Listings. Mirrors `web/src/features/seller/data/listingsApi.ts`.
 *
 * Every endpoint here is behind `auth + requireSeller`, so nothing works
 * without a session whose KYC has been approved.
 */

/** Note `removed`: an admin takedown, which the mock data had no concept of. */
export type ListingStatus = 'draft' | 'active' | 'out_of_stock' | 'removed';

/** A row of `/api/listings/mine`. Flatter than the mock `Product`. */
export interface MyListing {
  id: string;
  title: string;
  short: string | null;
  description: string | null;
  price: number;
  currency: 'GHS' | 'TRX';
  category: string;
  condition: string | null;
  /** One cover URL, not the mock's array of bundled assets. */
  image: string | null;
  location: string | null;
  quantity: number;
  status: ListingStatus;
  views: number;
  rating: number | null;
  reviewCount: number;
  createdAt: string;
  sellerUsername: string;
  sellerVerified: boolean;
  /**
   * Takedown context on a removed listing you own — and note the shape.
   *
   * The **list** endpoint sends these three flat, already-composed fields. The
   * **detail** endpoint sends a nested `removal` object instead (see
   * `ListingDetail`). They are genuinely different serializers, so this type
   * must not borrow the other's shape: declaring `removal` here would be a field
   * the list never sends, and the appeal panel reads the detail one anyway.
   */
  removalReason?: string | null;
  disputeAllowed?: boolean;
  disputeStatus?: 'open' | 'approved' | 'rejected' | null;
}

/** Why a listing was taken down, and where any appeal stands. */
export interface ListingRemoval {
  /** Already human-readable — the server composes reason + note. */
  reasonText: string;
  /** Some removals are final; the admin decides at takedown time. */
  disputeAllowed: boolean;
  dispute: {
    id: string;
    status: 'open' | 'approved' | 'rejected';
    explanation: string;
    /** The admin's note on their ruling, once they've made one. */
    reviewNote: string | null;
    createdAt: string;
  } | null;
}

export interface MyListingsResponse {
  listings: MyListing[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Query keys are the cache address. Scoping by status means switching tabs
 * caches each tab separately instead of refetching the same rows.
 */
export const listingKeys = {
  all: ['listings'] as const,
  mine: () => [...listingKeys.all, 'mine'] as const,
  mineByStatus: (status: ListingStatus | 'all') => [...listingKeys.mine(), status] as const,
};

/**
 * The server pages at 10 by default and caps `limit` at 48. Asking for the cap
 * keeps every listing on screen for a normal-sized catalogue — a seller past 48
 * needs real pagination, which this does not yet do.
 */
const PAGE_LIMIT = 48;

/**
 * Fetched once, unfiltered — the screen's tabs filter in memory.
 *
 * The web sends one `?status=` per tab and lets the server filter, which scales
 * better. But each tab press then costs a full round trip, and against a
 * database this far away that makes the tabs feel unresponsive. One request for
 * the whole (capped) catalogue keeps switching instant.
 */
export function useMyListings() {
  return useQuery({
    queryKey: listingKeys.mine(),
    queryFn: () => api<MyListingsResponse>(`/api/listings/mine?limit=${PAGE_LIMIT}`),
    retry: false,
  });
}

/**
 * A row of the public marketplace.
 *
 * `status` is deliberately absent: `GET /api/listings` returns only what is
 * actually for sale, so it doesn't send one. Typing it as present invites a
 * `status === 'active'` filter that silently matches nothing and empties the
 * whole marketplace — which is exactly what happened.
 */
export type MarketplaceListing = Omit<MyListing, 'status'>;

export interface MarketplaceResponse {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  pages: number;
}

/**
 * The public marketplace — `GET /api/listings`.
 *
 * Unscoped and pre-filtered to live listings. Crucially it returns the SAME ids
 * as everywhere else, so tapping a row and opening `/marketplace/:id` resolves
 * the very listing that was tapped — which is what makes browse → detail work.
 */
/**
 * Why a listing is being reported.
 *
 * The same vocabulary the admin takedown uses, deliberately — a report is an
 * accusation of exactly what a removal is a finding of, so the reported reason
 * carries into the removal unchanged. Mirrors
 * `web/src/features/shared/libs/removalReasons.ts`; keep the wording in step.
 */
export type RemovalReason =
  | 'prohibited_item'
  | 'duplicate'
  | 'misleading'
  | 'spam'
  | 'guidelines'
  | 'fraud'
  | 'other';

export const REMOVAL_REASONS: { id: RemovalReason; label: string }[] = [
  { id: 'prohibited_item', label: 'Prohibited or restricted item' },
  { id: 'duplicate', label: 'Duplicate listing' },
  { id: 'misleading', label: 'Misleading or inaccurate information' },
  { id: 'spam', label: 'Spam or low-quality content' },
  { id: 'guidelines', label: 'Violates community guidelines' },
  { id: 'fraud', label: 'Fraudulent or suspicious activity' },
  { id: 'other', label: 'Other' },
];

/**
 * `POST /api/listings/:id/report` — flag a listing for admin review.
 *
 * `note` is optional except on `other`, where the server requires at least 3
 * characters: "Other" with no explanation tells a moderator nothing.
 *
 * Invalidates the listing's detail so its `reported` flag comes back true and
 * the button can show it has already been reported — which is the only reason
 * the server sends that field.
 */
export function useReportListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: RemovalReason; note?: string }) =>
      api<{ report: { id: string; status: string; createdAt: string } }>(
        `/api/listings/${id}/report`,
        { method: 'POST', body: { reason, ...(note ? { note } : {}) } },
      ).then((r) => r.report),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [...listingKeys.all, 'detail', id] });
    },
  });
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

/**
 * `GET /api/categories` — the real list, as the web's `useCategories` reads it.
 *
 * Both the listing form and the marketplace filter used a hardcoded
 * `mockCategories`, so the options a seller could pick from were whatever the
 * mock happened to contain. A category added or renamed server-side never
 * reached the phone, and picking one the server didn't know would be rejected
 * on publish.
 *
 * Cached for five minutes: this changes about never, and it gates the form.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'] as const,
    queryFn: () => api<{ categories: Category[] }>('/api/categories').then((r) => r.categories),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useMarketplaceListings(search?: string, category?: string) {
  return useQuery({
    queryKey: [...listingKeys.all, 'browse', search ?? '', category ?? ''] as const,
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (search) params.set('q', search);
      if (category) params.set('category', category);
      return api<MarketplaceResponse>(`/api/listings?${params}`);
    },
    retry: false,
  });
}

/**
 * One listing in full — `GET /api/listings/:id`.
 *
 * Note `images` is an array here, where the list endpoint sends a single
 * `image`. The detail view needs all of them; a row only needs a cover.
 */
export interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: 'GHS' | 'TRX';
  category: string;
  condition: string | null;
  quantity: number;
  images: string[];
  location: string | null;
  status: ListingStatus;
  views: number;
  reported: boolean;
  createdAt: string;
  rating: number | null;
  reviewCount: number;
  seller: {
    username: string;
    avatarUrl: string | null;
    storeName?: string | null;
    verified?: boolean;
    joinedAt?: string;
  } | null;
  /** Buyer reviews of this listing — empty until someone completes a deal. */
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    author?: { username: string; avatarUrl: string | null } | null;
  }[];
  /**
   * Present only on a removed listing — why, and whether it can be appealed.
   *
   * The shared `ListingRemoval`, not a local narrowing of it: this copy declared
   * `dispute` as only `{ id, status }`, dropping the explanation, the reviewer's
   * note and the timestamp that the appeal panel exists to show. The server
   * sends all five.
   */
  removal: ListingRemoval | null;
}

export function useListing(id: string) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: [...listingKeys.all, 'detail', id] as const,
    queryFn: () => api<ListingDetail>(`/api/listings/${id}`),
    enabled: Boolean(id),
    retry: false,

    /**
     * Paint immediately from the row you just tapped.
     *
     * Opening a listing from My Listings or the marketplace previously showed a
     * spinner for the full detail round trip — 1–6 seconds against this
     * database — even though the list response already carried the title,
     * price, category, condition, quantity, status and cover image. That is
     * most of the screen, and it is already in the cache.
     *
     * So: seed from it. The screen renders instantly with the real listing, and
     * the fields only the detail endpoint knows — the full description, all
     * images, reviews, the takedown block — fill in when the fetch lands.
     *
     * `placeholderData` rather than `initialData` deliberately: placeholder data
     * is never written to the cache and never counted as fresh, so the real
     * fetch always still runs. `initialData` would have marked this partial
     * record as the cached truth and could suppress the request entirely.
     */
    placeholderData: () => {
      const row = findCachedListing(qc, id);
      if (!row) return undefined;

      return {
        id: row.id,
        title: row.title,
        description: row.description ?? row.short ?? '',
        price: row.price,
        currency: row.currency,
        category: row.category,
        condition: row.condition,
        quantity: row.quantity,
        location: row.location,
        status: row.status,
        views: row.views,
        rating: row.rating,
        reviewCount: row.reviewCount,
        createdAt: row.createdAt,
        // The list sends one cover URL; the detail sends the full array.
        images: row.image ? [row.image] : [],
        seller: { username: row.sellerUsername, avatarUrl: null, verified: row.sellerVerified },
        reviews: [],
        // Whether *you* have reported it — unknowable from a list row, and the
        // detail answers in a moment. False just hides the "reported" state
        // until then, which is the harmless direction to be wrong in.
        reported: false,
        /**
         * Left null even when the row says it was removed. The list's flat
         * fields can't build a `ListingRemoval` — there's no dispute record on
         * them — and a half-built one would render the appeal panel with an
         * empty reason for a moment. Better to show it once, correctly, when
         * the detail arrives.
         */
        removal: null,
      } satisfies ListingDetail;
    },
  });
}

/**
 * The already-fetched row for this listing, from whichever cached list holds it
 * — My Listings or the marketplace. Returns undefined when it was opened
 * directly (a deep link, or a notification), in which case there is nothing to
 * seed from and the screen waits for the fetch as before.
 */
function findCachedListing(qc: QueryClient, id: string): MyListing | undefined {
  const lists = qc.getQueriesData<{ listings: MyListing[] }>({ queryKey: listingKeys.all });
  for (const [, data] of lists) {
    const hit = data?.listings?.find((l) => l.id === id);
    if (hit) return hit;
  }
  return undefined;
}

/** Body accepted by `POST /api/listings` — status is create-time draft/active only. */
export interface CreateListingInput {
  title: string;
  description?: string | null;
  price: number;
  category: string;
  condition?: string | null;
  quantity?: number;
  /** Must be http(s) URLs the server can resolve — not on-device file paths. */
  images?: string[];
  location?: string | null;
  status?: 'draft' | 'active';
}

/** `PATCH` takes any subset, and additionally allows `out_of_stock`. */
export type UpdateListingInput = Partial<Omit<CreateListingInput, 'status'>> & {
  status?: 'draft' | 'active' | 'out_of_stock';
};

/**
 * After any write the cached lists are stale, so they're invalidated — that is
 * what makes the screen refresh itself without the component tracking anything.
 * `listingKeys.all` is deliberately broad: it also covers the public
 * marketplace query, since a seller's edit changes what buyers see.
 */
function useInvalidateListings() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: listingKeys.all });
}

export function useCreateListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (input: CreateListingInput) =>
      api<{ listing: MyListing }>('/api/listings', { method: 'POST', body: input }).then(
        (r) => r.listing,
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateListingInput & { id: string }) =>
      api<{ listing: MyListing }>(`/api/listings/${id}`, { method: 'PATCH', body }).then(
        (r) => r.listing,
      ),
    onSuccess: invalidate,
  });
}

/**
 * Appeal a takedown — `POST /api/listings/:id/dispute`.
 *
 * An argument, not a resubmission: a removed listing is frozen, so the admin
 * rules on exactly what they took down. The server requires at least 10
 * characters and refuses outright when `disputeAllowed` is false.
 */
export function useSubmitListingDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, explanation }: { id: string; explanation: string }) =>
      api<{ dispute: { id: string; status: string } }>(`/api/listings/${id}/dispute`, {
        method: 'POST',
        body: { explanation },
      }).then((r) => r.dispute),
    onSuccess: () => {
      // The listing now carries a dispute, so its detail and the list both change.
      qc.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/listings/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
