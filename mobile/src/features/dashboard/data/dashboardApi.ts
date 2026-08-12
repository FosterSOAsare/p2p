import { useQuery } from '@tanstack/react-query';
import { api } from '@/features/shared/data/api';

/**
 * `GET /api/users/me/dashboard` — one call backing the whole home screen.
 *
 * The server assembles the persona, the stat totals, recent orders and the
 * store's listings in a single response, so the dashboard doesn't fan out into
 * four separate requests. Mirrors `web/src/features/user/data/usersApi.ts`,
 * which is what the web dashboard reads.
 */

/** A sale from the seller's side. `date` arrives pre-formatted by the server. */
export interface SellerSaleOrder {
  id: string;
  code: string;
  status: string;
  rawStatus: string;
  buyerUsername: string;
  /** Already human-readable, e.g. "Aug 5, 2026" — do not re-parse it. */
  date: string;
  title: string;
  amount: number;
  currency: 'GHS' | 'TRX';
}

/** A row of the store inventory strip. Note `stock` and `imageUrl`. */
export interface SellerProductListing {
  id: string;
  title: string;
  price: number;
  currency: 'GHS' | 'TRX';
  category: string;
  stock: number;
  views: number;
  imageUrl: string | null;
  status: 'draft' | 'active' | 'out_of_stock' | 'removed';
}

export interface DashboardOrder {
  id: string;
  code: string;
  status: string;
  rawStatus: string;
  sellerUsername: string;
  date: string;
  title: string;
  amount: number;
  currency: 'GHS' | 'TRX';
  imageUrl: string | null;
  tracking?: string | null;
}

export interface DashboardResponse {
  persona: 'buyer' | 'seller';
  profile: {
    fullName: string;
    username: string;
    avatarUrl: string;
    joinedDate: string;
    isKycVerified: boolean;
    kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  };
  buyer: {
    stats: {
      activeOrdersCount: number;
      escrowLockedBalance: number;
      totalSpent: number;
      savedItemsCount: number;
    };
    recentOrders: DashboardOrder[];
  };
  seller: {
    stats: {
      storeName: string;
      storeHandle: string;
      rating: number;
      reviewCount: number;
      totalEarnings: number;
      escrowLockedBalance: number;
      availablePayoutBalance: number;
      actionRequiredCount: number;
    };
    salesOrders: SellerSaleOrder[];
    listings: SellerProductListing[];
  };
}

export const dashboardKeys = {
  data: ['users', 'dashboard'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.data,
    queryFn: () => api<DashboardResponse>('/api/users/me/dashboard'),
    /**
     * Refetched on mount, like the wallet. This response carries
     * `availablePayoutBalance`, the same money the wallet screen shows as
     * "Available balance" — so if one is cached for minutes and the other
     * isn't, the two screens disagree about your money. Cached data still
     * renders immediately; the refresh happens behind it.
     */
    staleTime: 0,
    retry: false,
  });
}
