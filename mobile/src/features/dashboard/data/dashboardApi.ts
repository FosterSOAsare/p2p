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
  /**
   * Dispatch details, once the seller has entered them. The server has always
   * sent both (`users.service.ts`) — they were simply missing from this type,
   * so the courier line the web shows on each sale row had no data to read.
   */
  carrier?: string;
  trackingNumber?: string;
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

/**
 * A purchase from the buyer's side.
 *
 * The field names differ from `SellerSaleOrder` and that is the server's
 * shape, not a mistake here — the two halves of `/api/users/me/dashboard` were
 * written at different times. Verified against a live response before being
 * corrected: the buyer block sends `orderDate` / `vendorName` / `price`, where
 * the seller block sends `date` / `buyerUsername` / `amount`.
 *
 * Note also that `status` here is the **raw** escrow status. The seller block
 * remaps its own to UI words (`funded` → `awaiting_shipment`); the buyer block
 * does not, so screens have to map it themselves.
 */
export interface DashboardOrder {
  id: string;
  code: string;
  /** Raw escrow status: created | funded | delivered | disbursed | disputed | cancelled. */
  status: string;
  /** Pre-formatted by the server, e.g. "Aug 5, 2026". */
  orderDate: string;
  vendorName: string;
  title: string;
  price: number;
  /** What the seller receives, fees deducted — the figure the release dialog quotes. */
  sellerPayout: number;
  currency: 'GHS' | 'TRX';
  imageUrl: string | null;
  /** Absent for a standalone escrow with no marketplace listing behind it. */
  productId?: string;
  /** Both only once the seller has dispatched. */
  trackingCode?: string;
  shippingCarrier?: string;
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
