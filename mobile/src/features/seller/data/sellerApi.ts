import { useQuery } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * A seller's public storefront — `GET /api/users/:username`.
 *
 * Mirrors the web's `useSellerProfile` in
 * `web/src/features/user/data/usersApi.ts`. Public: no session needed, since
 * a buyer browsing the marketplace has to be able to see who they'd buy from.
 */

/** A listing as it appears on the storefront — lighter than the full record. */
export interface SellerProfileListing {
  id: string;
  title: string;
  short: string | null;
  price: number;
  category: string;
  condition: string | null;
  image: string | null;
}

export interface SellerProfile {
  username: string;
  avatarUrl: string | null;
  verified: boolean;
  storeName: string | null;
  country: string | null;
  joinedAt: string;
  stats: {
    activeListings: number;
    salesCompleted: number;
    /** Null until the seller has been reviewed at least once. */
    rating: number | null;
    reviewCount: number;
  };
  listings: SellerProfileListing[];
}

export const sellerKeys = {
  all: ['seller'] as const,
  profile: (username: string) => [...sellerKeys.all, 'profile', username] as const,
};

export function useSellerProfile(username: string) {
  return useQuery({
    queryKey: sellerKeys.profile(username),
    queryFn: () => api<SellerProfile>(`/api/users/${username}`),
    enabled: Boolean(username),
    retry: false,
  });
}
